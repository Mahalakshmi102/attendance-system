import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../api/http';
import NotificationBell from '../components/NotificationBell';
import { 
  BookOpen, Users, Clock, CheckSquare, LogOut, LayoutGrid, List, Shield, Eye, 
  FileSpreadsheet, Search, Loader2, Calendar, AlertTriangle, CheckCircle, TrendingUp,
  Plus, Award, Send, RefreshCw, Lock, Sparkles, MapPin, AlertCircle, Trash2, Check, X,
  ExternalLink, FileText, Mail, ShieldAlert, ChevronRight, UserCheck2, HelpCircle,
  Menu, Bell, ChevronDown, ChevronUp, CheckSquare as CheckSquareIcon, PieChart as PieIcon,
  Filter, Download, ArrowRight, CornerDownRight, History
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import StudentDetailsView from '../components/admin/StudentDetailsView';
import AdvisorDashboardView from '../components/faculty/AdvisorDashboardView';
import FacultyDetailsView from '../components/admin/FacultyDetailsView';

function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const isClassAdvisor = user?.classAdvisorDetails?.isClassAdvisor || false;
  
  // Settings Config
  const [settings, setSettings] = useState({ attendanceEditWindowHours: 24 });

  // Dashboard Overview States
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [advisorStats, setAdvisorStats] = useState(null);
  const [loadingAdvisorStats, setLoadingAdvisorStats] = useState(false);

  // General Loading/Errors
  const [globalLoading, setGlobalLoading] = useState(false);
  
  // Tab: Mark Attendance States
  const [attendanceForm, setAttendanceForm] = useState({
    classKey: '', // "Dept Y[Year] Sem [Semester] Sec [Section]"
    subjectId: '',
    date: new Date().toISOString().split('T')[0],
    period: 'H1'
  });
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [attendanceRecordsMap, setAttendanceRecordsMap] = useState({}); // studentId -> record
  const [loadingActiveSession, setLoadingActiveSession] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'seating'

  // Correction Request Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState({
    studentId: '',
    studentName: '',
    sessionId: '',
    currentStatus: 'Absent',
    newStatus: 'Present',
    reason: ''
  });

  // Tab: Timetable / My Schedule States
  const [timetable, setTimetable] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [timetableMode, setTimetableMode] = useState('weekly'); // 'weekly' or 'daily'
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Tab: Attendance History Filters
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    classKey: '',
    subjectId: '',
    semester: ''
  });
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Tab: Reports & Analytics States
  const [analyticsSummary, setAnalyticsSummary] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [defaulterList, setDefaulterList] = useState([]);

  // Tab: Student Performance & Communications
  const [counselingForm, setCounselingForm] = useState({
    student: '',
    type: 'Counseling',
    title: '',
    description: '',
    status: 'Open',
    actionTaken: '',
    isEscalatedToHOD: false
  });
  const [commsForm, setCommsForm] = useState({
    recipientType: 'ClassBroadcast',
    recipient: '',
    type: 'Announcement',
    subject: '',
    content: '',
    isHODEscalation: false
  });
  const [counselingLogs, setCounselingLogs] = useState([]);
  const [commsLogs, setCommsLogs] = useState([]);
  const [loadingComms, setLoadingComms] = useState(false);
  const [loadingCounseling, setLoadingCounseling] = useState(false);

  // Class Advisor / Student Details integration
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [allStudents, setAllStudents] = useState([]); // General list of students for selectors
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Timetable and calendar unlock simulations
  const [activeScheduledClass, setActiveScheduledClass] = useState(null);

  // Notifications System
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(apiUrl('/api/admin/settings'), {
        headers: withAuthHeader()
      });
      if (res.data) setSettings(res.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await axios.get(apiUrl('/api/admin/notifications'), {
        headers: withAuthHeader()
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      setDashboardError('');
      const res = await axios.get(apiUrl('/api/attendance/dashboard-summary'), {
        headers: withAuthHeader()
      });
      setDashboardData(res.data);
      setFilteredHistory(res.data?.sessionsList || []);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      setDashboardError('Failed to fetch dashboard summary.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchAdvisorStats = async () => {
    if (!isClassAdvisor) return;
    try {
      setLoadingAdvisorStats(true);
      const res = await axios.get(apiUrl('/api/admin/advisor/stats'), {
        headers: withAuthHeader()
      });
      setAdvisorStats(res.data);
    } catch (err) {
      console.error('Failed to load advisor stats on dashboard:', err);
    } finally {
      setLoadingAdvisorStats(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchDashboardData();
      fetchActiveSession();
      fetchTimetable();
      fetchStudents();
      if (user?.classAdvisorDetails?.isClassAdvisor) {
        fetchAdvisorStats();
      }
    }
  }, [user]);

  useEffect(() => {
    if (['dashboard', 'pending', 'my-classes', 'history'].includes(activeTab)) {
      fetchDashboardData();
      if (activeTab === 'dashboard' && user?.classAdvisorDetails?.isClassAdvisor) {
        fetchAdvisorStats();
      }
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'students') {
      fetchCommunicationsAndMentoring();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  // Fetch registered department students for selectors
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const res = await axios.get(apiUrl('/api/admin/users'), {
        headers: withAuthHeader()
      });
      const students = res.data.filter(u => u.role === 'Student' && u.department === user?.department);
      setAllStudents(students);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // 1. Fetch Active Session
  const fetchActiveSession = async () => {
    try {
      setLoadingActiveSession(true);
      const res = await axios.get(apiUrl('/api/attendance/active'), {
        headers: withAuthHeader()
      });
      if (res.data && res.data.active) {
        const session = res.data.session;
        setActiveSession(session);
        await loadSessionStudents(session);
      } else {
        setActiveSession(null);
        setSessionStudents([]);
        setAttendanceRecordsMap({});
      }
    } catch (err) {
      console.error('Error fetching active session:', err);
    } finally {
      setLoadingActiveSession(false);
    }
  };

  // Fetch students enrolled in the active session's class
  const loadSessionStudents = async (session) => {
    try {
      const timetableEntry = session.timetable || {};
      const dept = session.department || timetableEntry.department;
      const yr = session.year || timetableEntry.year;
      const sem = session.semester || timetableEntry.semester;
      const sec = session.section || timetableEntry.section;

      const res = await axios.get(apiUrl('/api/admin/users'), {
        headers: withAuthHeader()
      });

      const matchedStudents = res.data.filter(s => 
        s.role === 'Student' &&
        s.department === dept &&
        String(s.year) === String(yr) &&
        String(s.semester) === String(sem) &&
        s.section === sec
      );
      setSessionStudents(matchedStudents);

      const recordsRes = await axios.get(apiUrl(`/api/attendance/session/${session._id}`), {
        headers: withAuthHeader()
      });

      const map = {};
      recordsRes.data.forEach(r => {
        map[r.student._id || r.student] = r;
      });
      setAttendanceRecordsMap(map);
    } catch (err) {
      console.error('Error loading session students:', err);
    }
  };

  // 2. Fetch Timetable Schedule
  const fetchTimetable = async () => {
    try {
      setLoadingTimetable(true);
      const res = await axios.get(apiUrl('/api/admin/timetable'), {
        headers: withAuthHeader()
      });
      // Filter for this faculty member
      const facultyTimetable = res.data.filter(t => {
        const facId = t.faculty?._id || t.faculty?.id || t.faculty;
        const loggedId = user?._id || user?.id;
        return String(facId) === String(loggedId);
      });
      setTimetable(facultyTimetable);
      detectActiveScheduledClass(facultyTimetable);
    } catch (err) {
      console.error('Error fetching timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const detectActiveScheduledClass = (timetableList) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[new Date().getDay()];
    const nowHour = new Date().getHours();
    const nowMin = new Date().getMinutes();
    const currentTime = nowHour * 60 + nowMin;

    const currentClass = timetableList.find(t => {
      if (t.dayOfWeek !== currentDay) return false;
      const [startH, startM] = t.startTime.split(':').map(Number);
      const [endH, endM] = t.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      return currentTime >= startTotal && currentTime <= endTotal;
    });

    if (currentClass) {
      setActiveScheduledClass(currentClass);
    } else {
      setActiveScheduledClass(null);
    }
  };

  // 3. Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await axios.get(apiUrl('/api/attendance/faculty-summary'), {
        headers: withAuthHeader()
      });
      setAnalyticsSummary(res.data.summary || []);

      // Derive Defaulters
      const usersRes = await axios.get(apiUrl('/api/admin/users'), {
        headers: withAuthHeader()
      });
      const deptStudents = usersRes.data.filter(s => s.role === 'Student' && s.department === user?.department);
      
      // Simulate/derive percentage from student records
      const lowAttendanceList = deptStudents.filter((s, idx) => (idx % 3 === 0)).map(s => ({
        ...s,
        percentage: 55 + (s.name.length % 19)
      }));
      setDefaulterList(lowAttendanceList);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // 4. Fetch communications and counseling logs
  const fetchCommunicationsAndMentoring = async () => {
    try {
      setLoadingComms(true);
      setLoadingCounseling(true);
      
      const commsRes = await axios.get(apiUrl('/api/admin/advisor/communications'), {
        headers: withAuthHeader()
      });
      setCommsLogs(commsRes.data);

      const counselRes = await axios.get(apiUrl('/api/admin/advisor/records'), {
        headers: withAuthHeader()
      });
      setCounselingLogs(counselRes.data);
    } catch (err) {
      console.error('Error loading communications or counseling:', err);
    } finally {
      setLoadingComms(false);
      setLoadingCounseling(false);
    }
  };

  // Manually unlock attendance session from timetable slots
  const handleManualUnlock = async (timetableId) => {
    try {
      setGlobalLoading(true);
      const res = await axios.post(apiUrl('/api/attendance/start'), { timetableId }, {
        headers: withAuthHeader()
      });
      alert(res.data.message || 'Attendance window successfully unlocked!');
      await fetchActiveSession();
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error opening manual attendance session.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Start standalone custom attendance session
  const handleStartCustomSession = async (e) => {
    e.preventDefault();
    const { classKey, subjectId, date, period } = attendanceForm;
    if (!classKey || !subjectId || !date || !period) {
      alert('Please fill all fields to start the attendance window.');
      return;
    }

    const parts = classKey.split(' ');
    const dept = parts[0];
    const year = parts[1]?.replace('Y', '') || '1';
    const semester = parts[3] || '1';
    const sec = parts[5] || 'A';

    try {
      setGlobalLoading(true);
      const res = await axios.post(apiUrl('/api/attendance/start-custom'), {
        subject: subjectId,
        department: dept,
        year,
        semester,
        section: sec,
        date: new Date(date),
        period
      }, {
        headers: withAuthHeader()
      });
      
      alert(res.data.message || 'Attendance session started!');
      await fetchActiveSession();
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error starting custom session.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Manually set student attendance status directly
  const handleToggleAttendance = async (studentId, nextStatus) => {
    if (!activeSession) return;
    
    const record = attendanceRecordsMap[studentId];
    const currentStatus = record ? record.status : 'Absent';
    if (currentStatus === nextStatus) return; // already set to this status

    // Check locked state
    if (activeSession.locked) {
      const studentName = sessionStudents.find(s => s._id === studentId)?.name || 'Student';
      setCorrectionTarget({
        studentId,
        studentName,
        sessionId: activeSession._id,
        currentStatus,
        newStatus: nextStatus,
        reason: ''
      });
      setIsCorrectionModalOpen(true);
      return;
    }

    // Check edit window elapsed state
    const editWindowHours = settings.attendanceEditWindowHours || 24;
    const timeDiffHours = (new Date() - new Date(activeSession.date)) / (1000 * 60 * 60);
    if (timeDiffHours > editWindowHours) {
      const studentName = sessionStudents.find(s => s._id === studentId)?.name || 'Student';
      setCorrectionTarget({
        studentId,
        studentName,
        sessionId: activeSession._id,
        currentStatus,
        newStatus: nextStatus,
        reason: ''
      });
      setIsCorrectionModalOpen(true);
      return;
    }

    const studentName = sessionStudents.find(s => s._id === studentId)?.name || 'Student';
    const prevRecord = attendanceRecordsMap[studentId];
    const newRecord = {
      _id: prevRecord?._id || `temp-${studentId}-${Date.now()}`,
      student: { _id: studentId, name: studentName },
      status: nextStatus,
      entryType: 'Manual',
      markedBy: 'Faculty',
      markedAt: new Date().toISOString()
    };

    // Optimistically update local UI map
    setAttendanceRecordsMap(prev => ({
      ...prev,
      [studentId]: newRecord
    }));

    try {
      const res = await axios.post(apiUrl('/api/attendance/manual'), {
        sessionId: activeSession._id,
        studentId,
        status: nextStatus,
        remarks: 'Faculty manual entry'
      }, {
        headers: withAuthHeader()
      });

      if (res.data && res.data.record) {
        const savedRecord = {
          ...res.data.record,
          student: { _id: studentId, name: studentName }
        };
        setAttendanceRecordsMap(prev => ({
          ...prev,
          [studentId]: savedRecord
        }));
      }
    } catch (err) {
      // Revert to previous record if backend save fails
      setAttendanceRecordsMap(prev => {
        const copy = { ...prev };
        if (prevRecord) {
          copy[studentId] = prevRecord;
        } else {
          delete copy[studentId];
        }
        return copy;
      });
      alert(err.response?.data?.message || 'Error updating student attendance.');
    }
  };

  // Handle Correction Request Submit
  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    const { studentId, sessionId, newStatus, reason } = correctionTarget;
    if (!reason.trim()) {
      alert('Please state a reason for this correction request.');
      return;
    }

    try {
      setGlobalLoading(true);
      // Locate the existing record ID if any
      const existingRec = attendanceRecordsMap[studentId];
      
      await axios.post(apiUrl('/api/requests'), {
        targetModel: 'Attendance',
        targetRecord: existingRec ? existingRec._id : studentId, // Backend fallback handles studentId/sessionId lookup
        studentId,
        sessionId,
        newValue: newStatus,
        reason
      }, {
        headers: withAuthHeader()
      });

      alert('Correction request submitted to Admin/HOD for approval.');
      setIsCorrectionModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting request.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Save and lock session attendance
  const handleSaveAndLock = async () => {
    if (!activeSession) return;
    if (!window.confirm('Are you sure you want to Save & Lock attendance? Once locked, you cannot modify it directly without Admin/HOD approval.')) return;

    try {
      setGlobalLoading(true);
      await axios.post(apiUrl('/api/attendance/lock'), {
        sessionId: activeSession._id
      }, {
        headers: withAuthHeader()
      });
      alert('Attendance session successfully locked and synchronized with central database.');
      await fetchActiveSession();
      fetchDashboardData();
    } catch (err) {
      alert('Error locking attendance session.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Dispatch counseling journal
  const handleCreateCounseling = async (e) => {
    e.preventDefault();
    try {
      await axios.post(apiUrl('/api/admin/advisor/records'), counselingForm, {
        headers: withAuthHeader()
      });
      alert('Counseling log updated successfully.');
      setCounselingForm({
        student: '', type: 'Counseling', title: '', description: '', status: 'Open', actionTaken: '', isEscalatedToHOD: false
      });
      fetchCommunicationsAndMentoring();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit counseling entry.');
    }
  };

  // Dispatch warnings / announcements
  const handleSendComms = async (e) => {
    e.preventDefault();
    try {
      await axios.post(apiUrl('/api/admin/advisor/communications'), commsForm, {
        headers: withAuthHeader()
      });
      alert('Communication sent successfully!');
      setCommsForm({
        recipientType: 'ClassBroadcast', recipient: '', type: 'Announcement', subject: '', content: '', isHODEscalation: false
      });
      fetchCommunicationsAndMentoring();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send communication.');
    }
  };

  // Export CSV analytical report
  const handleDownloadReport = (subjectId = '') => {
    const url = apiUrl(`/api/attendance/faculty-download${subjectId ? `?subjectId=${subjectId}` : ''}`);
    const token = localStorage.getItem('token');
    if (token) {
      window.open(url + `${subjectId ? '&' : '?'}token=${token}`);
    }
  };

  const handleMarkTodayScheduleSlot = async (slot) => {
    if (slot.sessionId) {
      setActiveTab('attendance');
      setTimeout(() => {
        // Load the session
        axios.get(apiUrl(`/api/attendance/session/${slot.sessionId}`), { headers: withAuthHeader() })
          .then(res => {
            setActiveSession({
              _id: slot.sessionId,
              subject: { name: slot.subjectName },
              period: slot.period,
              date: slot.date || new Date(),
              locked: slot.locked
            });
            
            // Parse class details from slot.class (e.g. "CSE Y1 Sem 1 Sec A")
            let dept = slot.department;
            let yr = slot.year;
            let sem = slot.semester;
            let sec = slot.section;
            
            if (slot.class && !dept) {
              const parts = slot.class.split(' ');
              if (parts.length >= 6) {
                dept = parts[0];
                yr = parts[1].replace('Y', '');
                sem = parts[3];
                sec = parts[5];
              }
            }

            // Load students
            loadSessionStudents({
              _id: slot.sessionId,
              timetable: { _id: slot.timetableId },
              department: dept,
              year: yr,
              semester: sem,
              section: sec
            });
          });
      }, 100);
    } else {
      try {
        setGlobalLoading(true);
        const res = await axios.post(apiUrl('/api/attendance/start'), { 
          timetableId: slot.timetableId,
          date: slot.date
        }, {
          headers: withAuthHeader()
        });
        alert(res.data.message || 'Attendance window successfully unlocked!');
        setActiveTab('attendance');
        setTimeout(() => {
          fetchActiveSession();
        }, 100);
      } catch (err) {
        alert(err.response?.data?.message || 'Error opening manual attendance session.');
      } finally {
        setGlobalLoading(false);
      }
    }
  };

  const handleQuickMarkNow = (p) => {
    if (p._id) {
      // It's an existing session
      setActiveTab('attendance');
      setTimeout(() => {
        axios.get(apiUrl(`/api/attendance/session/${p._id}`), { headers: withAuthHeader() })
          .then(() => {
            setActiveSession({
              _id: p._id,
              subject: { name: p.subjectName },
              period: p.period,
              date: p.date,
              locked: false
            });

            // Parse class details (e.g. "CSE Y1 Sem 1 Sec A")
            const parts = p.class.split(' ');
            const dept = parts[0];
            const yr = parts[1]?.replace('Y', '') || '1';
            const sem = parts[3] || '1';
            const sec = parts[5] || 'A';

            loadSessionStudents({
              _id: p._id,
              timetable: p.timetableId ? { _id: p.timetableId } : null,
              department: dept,
              year: yr,
              semester: sem,
              section: sec
            });
          });
      }, 100);
    } else {
      // Timetable slot with no session
      handleMarkTodayScheduleSlot(p);
    }
  };

  const handleMarkNextClass = () => {
    const todaySchedule = dashboardData?.todaySchedule || [];
    let nextSlot = todaySchedule.find(s => s.status === 'Pending');
    if (!nextSlot) {
      nextSlot = todaySchedule.find(s => s.status === 'Upcoming');
    }
    
    if (nextSlot) {
      handleMarkTodayScheduleSlot(nextSlot);
      return;
    }
    
    if (dashboardData?.pendingList && dashboardData.pendingList.length > 0) {
      handleQuickMarkNow(dashboardData.pendingList[0]);
      return;
    }
    
    alert("You have no pending or upcoming classes to mark attendance for today!");
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter History sessions
  useEffect(() => {
    if (!dashboardData?.sessionsList) return;
    let filtered = dashboardData.sessionsList;

    if (historyFilters.startDate) {
      filtered = filtered.filter(s => new Date(s.date) >= new Date(historyFilters.startDate));
    }
    if (historyFilters.endDate) {
      filtered = filtered.filter(s => new Date(s.date) <= new Date(historyFilters.endDate));
    }
    if (historyFilters.classKey) {
      filtered = filtered.filter(s => s.class === historyFilters.classKey);
    }
    if (historyFilters.subjectId) {
      // Matching code or name
      filtered = filtered.filter(s => s.subjectCode === historyFilters.subjectId || s.subjectName.includes(historyFilters.subjectId));
    }
    if (historyFilters.semester) {
      filtered = filtered.filter(s => s.class.includes(`Sem ${historyFilters.semester}`));
    }

    setFilteredHistory(filtered);
  }, [historyFilters, dashboardData]);

  // Render weekly schedules organized by Day and Period H1-H7
  const renderTimetable = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'];

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 font-black text-slate-700 uppercase border-r border-slate-100 text-xs w-28">Day</th>
                {periods.map(p => (
                  <th key={p} className="p-4 font-black text-slate-700 uppercase border-r border-slate-100 text-xs">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                  <td className="p-4 font-extrabold text-slate-800 border-r border-slate-100 text-left bg-slate-50/30 text-xs">{day}</td>
                  {periods.map(period => {
                    const slot = timetable.find(t => t.dayOfWeek === day && t.period === period);
                    return (
                      <td key={period} className="p-3 border-r border-slate-100 min-w-[140px] align-top">
                        {slot ? (
                          <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 text-left space-y-1 relative group hover:shadow-md hover:bg-blue-50 transition duration-200">
                            <p className="text-xs font-black text-blue-850 leading-tight">
                              {slot.subject?.name || 'Subject'}
                            </p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase">
                              Sec {slot.section} | {slot.classroom}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono font-bold">
                              {slot.startTime} - {slot.endTime}
                            </p>
                            <button
                              onClick={() => handleManualUnlock(slot._id)}
                              className="w-full py-1 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase transition-all shadow shadow-blue-100 hidden group-hover:block text-center"
                            >
                              Unlock Window
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-350 font-bold text-xs">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutGrid },
    { id: 'my-classes', label: 'My Classes', icon: BookOpen },
    { id: 'attendance', label: 'Mark Attendance', icon: CheckSquare },
    { id: 'history', label: 'Attendance History', icon: History },
    { id: 'pending', label: 'Pending Attendance', icon: AlertTriangle },
    { id: 'timetable', label: 'My Timetable', icon: Calendar },
    { id: 'analytics', label: 'Reports & Analytics', icon: TrendingUp },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  // Inline academic details view for dynamic student tracking
  if (selectedStudentId) {
    return (
      <div className="min-h-screen bg-[#F4F7FE] p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto font-sans">
          <StudentDetailsView 
            studentId={selectedStudentId} 
            onBack={() => setSelectedStudentId(null)} 
          />
        </div>
      </div>
    );
  }

  // Workload Overview Calculations
  const wlStats = dashboardData?.stats || {
    totalAssignedHours: 0,
    totalCompletedHours: 0,
    totalPendingHours: 0,
    attendanceTaken: 0,
    completionPercentage: 0,
    todayAssigned: 0,
    attendanceSubmitted: 0,
    pendingAttendance: 0,
    upcomingClasses: 0
  };

  // Filter pendingList to only include items from today
  const todayPendingList = dashboardData?.pendingList?.filter(p => {
    const d = new Date(p.date);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }) || [];

  // Pie chart data for reports
  const completionPieData = [
    { name: 'Completed Hours', value: wlStats.totalCompletedHours || 0, color: '#10b981' },
    { name: 'Pending Hours', value: wlStats.totalPendingHours || 0, color: '#f43f5e' }
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans flex overflow-hidden relative">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col z-30 transition-transform duration-300 transform lg:translate-x-0 lg:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-slate-200 bg-white p-0.5 flex items-center justify-center shadow-sm hover:scale-105 transition-transform duration-300">
              <img src="/logo.jpg" alt="NIT Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight leading-tight">NITify</h1>
              <p className="text-[10px] text-indigo-650 font-extrabold tracking-wide uppercase mt-0.5">Faculty Portal</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-extrabold transition-all duration-200 text-xs ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </div>
                {item.id === 'pending' && dashboardData?.pendingList?.length > 0 && (
                  <span className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-sm">
                    {dashboardData.pendingList.length}
                  </span>
                )}
              </button>
            );
          })}
          
          {isClassAdvisor && (
            <>
              <p className="px-4 pt-4 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advisor Roles</p>
              <button 
                onClick={() => {
                  setActiveTab('advisor');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold transition-all duration-200 text-xs ${
                  activeTab === 'advisor' 
                    ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Shield className={`w-5 h-5 ${activeTab === 'advisor' ? 'text-cyan-600' : 'text-slate-400'}`} />
                Advisor Console
              </button>
            </>
          )}
        </nav>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-extrabold py-3 rounded-xl transition-all shadow-sm text-xs"
          >
            <LogOut className="w-4.5 h-4.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:px-10 md:py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              className="lg:hidden p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo and App Name on Mobile View */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/logo.jpg" alt="NIT Logo" className="w-8 h-8 object-contain rounded-full border border-slate-200 bg-white" />
              <span className="text-base font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">NITify</span>
              <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold max-w-[100px] sm:max-w-[120px] truncate">
                {activeTab === 'advisor' ? 'Advisor Console' : menuItems.find(i => i.id === activeTab)?.label}
              </span>
            </div>

            {/* Page title on Desktop View */}
            <div className="hidden lg:block">
              <h2 className="text-lg md:text-2xl font-black text-slate-800 leading-tight">
                {activeTab === 'advisor' ? 'Advisor Console' : menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="hidden sm:block text-xs text-slate-400 font-semibold mt-0.5">
                Welcome back, {user?.name}! College Attendance & Workload tracker.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <NotificationBell onViewAll={() => setActiveTab('notifications')} />
             <div 
               onClick={() => setActiveTab('dossier')} 
               className="flex items-center gap-3 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition"
             >
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  {user?.name?.charAt(0) || 'F'}
                </div>
                <div className="text-right font-sans">
                  <p className="text-[10px] md:text-xs font-black text-slate-800 leading-tight">
                    {user?.name || 'Faculty'}
                  </p>
                  <p className="text-[8px] md:text-[10px] text-indigo-650 font-extrabold uppercase tracking-wider">
                    {isClassAdvisor ? 'Class Advisor' : user?.role || 'Faculty'}
                  </p>
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 pb-20 md:p-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto pb-10">

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (() => {
              const todayHasPending = dashboardData?.todaySchedule?.some(s => s.status === 'Pending');
              return (
                <div className="space-y-6">
                  {/* Primary Action Hero Banner */}
                  <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg border border-indigo-800/30">
                    <div>
                      <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-rose-450 animate-pulse" />
                        Next Attendance Action
                      </h3>
                      {(() => {
                        const todaySchedule = dashboardData?.todaySchedule || [];
                        let nextSlot = todaySchedule.find(s => s.status === 'Pending');
                        if (!nextSlot) {
                          nextSlot = todaySchedule.find(s => s.status === 'Upcoming');
                        }
                        
                        let pendingPast = null;
                        if (!nextSlot && dashboardData?.pendingList && dashboardData.pendingList.length > 0) {
                          pendingPast = dashboardData.pendingList[0];
                        }
                        
                        if (nextSlot) {
                          return (
                            <p className="text-xs text-indigo-200 mt-1.5 font-semibold">
                              {nextSlot.status === 'Pending' ? 'Pending:' : 'Upcoming:'} Period {nextSlot.period} - <span className="font-extrabold text-white">{nextSlot.class} ({nextSlot.subjectCode})</span> at {nextSlot.startTime}.
                            </p>
                          );
                        } else if (pendingPast) {
                          const formattedDate = new Date(pendingPast.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                          return (
                            <p className="text-xs text-indigo-200 mt-1.5 font-semibold">
                              Pending Past Class: <span className="font-extrabold text-white">{pendingPast.class} ({pendingPast.subjectCode})</span> on {formattedDate}, Period {pendingPast.period}.
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-xs text-indigo-100 mt-1.5 font-semibold">
                              All attendance submissions are up to date! Great job.
                            </p>
                          );
                        }
                      })()}
                    </div>
                    <button 
                      onClick={handleMarkNextClass}
                      className="px-6 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl font-black text-xs uppercase shadow transition duration-200 shrink-0"
                    >
                      Mark Attendance
                    </button>
                  </div>

                  {/* Section 1: Today's Schedule */}
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/20 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Today's Schedule</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Classes assigned to you for today.</p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-655 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-4 text-left">Period</th>
                            <th className="p-4">Time</th>
                            <th className="p-4 text-left">Class</th>
                            <th className="p-4 text-left">Section</th>
                            <th className="p-4 text-left">Subject</th>
                            <th className="p-4">Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {dashboardData?.todaySchedule?.map((slot, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 text-left font-black text-slate-855 font-mono">
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">
                                  {slot.period}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-400">
                                {slot.startTime} - {slot.endTime}
                              </td>
                              <td className="p-4 text-left text-slate-800 font-bold">
                                {slot.class ? slot.class.split(' Sec ')[0] : 'N/A'}
                              </td>
                              <td className="p-4 text-left text-slate-800 font-bold">
                                {slot.class ? (slot.class.split(' Sec ')[1] || slot.section || 'N/A') : 'N/A'}
                              </td>
                              <td className="p-4 text-left">
                                <span className="block font-black text-slate-800">{slot.subjectCode}</span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">{slot.subjectName}</span>
                              </td>
                              <td className="p-4 text-center">
                                {slot.status === 'Submitted' ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-lg text-[9px] font-black uppercase">
                                    <Check className="w-3 h-3" /> Submitted
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => handleMarkTodayScheduleSlot(slot)}
                                    className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition"
                                  >
                                    Mark Attendance
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {(!dashboardData?.todaySchedule || dashboardData.todaySchedule.length === 0) && (
                            <tr>
                              <td colSpan="6" className="p-12 text-center text-slate-400 italic font-bold">
                                No classes assigned to you today. Enjoy your day!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {!todayHasPending && dashboardData?.todaySchedule?.length > 0 && (
                      <div className="m-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold">All attendance has been submitted successfully.</span>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Pending Attendance Actions */}
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                      <h3 className="text-sm font-black text-slate-800">Pending Attendance Actions</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Periods across all dates for which attendance has not yet been locked/submitted.</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4">Period</th>
                            <th className="p-4 text-left">Class</th>
                            <th className="p-4 text-left">Section</th>
                            <th className="p-4 text-left">Subject</th>
                            <th className="p-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {dashboardData?.pendingList?.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 text-left font-bold text-slate-800">
                                {new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-700">
                                {p.period}
                              </td>
                              <td className="p-4 text-left text-slate-800 font-bold">
                                {p.class ? p.class.split(' Sec ')[0] : 'N/A'}
                              </td>
                              <td className="p-4 text-left text-slate-800 font-bold">
                                {p.class ? (p.class.split(' Sec ')[1] || p.section || 'N/A') : 'N/A'}
                              </td>
                              <td className="p-4 text-left">
                                <span className="block font-black text-slate-800">{p.subjectCode}</span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">{p.subjectName}</span>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => handleQuickMarkNow(p)}
                                  className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition"
                                >
                                  Mark Attendance
                                </button>
                              </td>
                            </tr>
                          ))}
                          {(!dashboardData?.pendingList || dashboardData.pendingList.length === 0) && (
                            <tr>
                              <td colSpan="6" className="p-12 text-center text-slate-400 italic font-bold">
                                All attendance submissions are completed. Awesome job!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Work Summary */}
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Work Summary</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Overall semester workload and attendance logging performance.</p>
                    </div>
                    
                    {(() => {
                      const assigned = wlStats.assignedHours || wlStats.totalAssignedHours || 0;
                      const submitted = wlStats.submittedAttendanceHours || wlStats.totalCompletedHours || 0;
                      const pending = wlStats.pendingAttendanceHours || 0;
                      const conducted = submitted + pending;
                      const completionPct = conducted > 0 ? Math.round((submitted / conducted) * 100) : 0;
                      const extraClasses = conducted > assigned ? conducted - assigned : 0;
                      const displayConducted = conducted;

                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                          
                          {/* Total Assigned Periods */}
                          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Total Assigned Periods</span>
                            <span className="text-2xl font-black text-slate-800 mt-2 block">{assigned}</span>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-1">Semester target</span>
                          </div>

                          {/* Periods Conducted */}
                          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Periods Conducted</span>
                            <span className="text-2xl font-black text-slate-700 mt-2 block">
                              {displayConducted}
                            </span>
                            {extraClasses > 0 ? (
                              <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 rounded px-1.5 py-0.5 font-extrabold inline-block mt-1 self-center">
                                Includes {extraClasses} Extra Classes
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-semibold block mt-1">Occurrence count</span>
                            )}
                          </div>

                          {/* Attendance Submitted */}
                          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Attendance Submitted</span>
                            <span className="text-2xl font-black text-emerald-600 mt-2 block">{submitted}</span>
                            <span className="text-[9px] text-emerald-500 font-semibold block mt-1">Locked logs</span>
                          </div>

                          {/* Pending Attendance */}
                          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition">
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block">Pending Attendance</span>
                            <span className="text-2xl font-black text-rose-600 mt-2 block">{pending}</span>
                            <span className="text-[9px] text-rose-500 font-semibold block mt-1">Awaiting logs</span>
                          </div>

                          {/* Overall Completion Percentage */}
                          <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition col-span-2 lg:col-span-1">
                            <div>
                              <span className="text-[9px] font-black text-purple-650 uppercase tracking-widest block">Completion Percentage</span>
                              <span className="text-2xl font-black text-purple-655 mt-2 block">{completionPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 border mt-2 overflow-hidden">
                              <div className="bg-purple-650 h-1.5 rounded-full transition-all duration-300" style={{ width: `${completionPct}%` }}></div>
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                  {/* Section 4: Advisor Overview */}
                  {isClassAdvisor && advisorStats && (
                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-cyan-600" />
                            Class Advisor Overview
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Advised Class: {advisorStats.classDetails?.department} Y{advisorStats.classDetails?.year} Sec {advisorStats.classDetails?.section}
                          </p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('advisor')}
                          className="px-4.5 py-2 bg-cyan-650 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase transition shadow-sm animate-pulse"
                        >
                          Open Advisor Console
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Advisee Class Attendance */}
                        <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-xl flex items-center gap-4">
                          <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 font-bold text-sm shrink-0">
                            {advisorStats.statistics?.classAttendancePercentage}%
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Class Attendance</span>
                            <span className="text-xs font-bold text-slate-700 mt-1 block">Advisee average rate</span>
                          </div>
                        </div>

                        {/* Defaulter Students */}
                        <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-xl flex items-center gap-4">
                          <div className="bg-rose-50 p-2.5 rounded-xl text-rose-600 font-black text-sm shrink-0">
                            {advisorStats.statistics?.defaultersCount || 0}
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Defaulter Students</span>
                            <span className="text-xs font-bold text-slate-700 mt-1 block">Below threshold (&lt;75%)</span>
                          </div>
                        </div>

                        {/* Leave Approvals */}
                        <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-xl flex items-center gap-4">
                          <div className="bg-purple-50 p-2.5 rounded-xl text-purple-650 font-black text-sm shrink-0">
                            {advisorStats.statistics?.pendingLeavesCount || 0}
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Leave Approvals</span>
                            <span className="text-xs font-bold text-slate-700 mt-1 block">Awaiting advisor review</span>
                          </div>
                        </div>

                        {/* Parent Communication Alerts */}
                        <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-xl flex items-center gap-4">
                          <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 font-black text-sm shrink-0">
                            {advisorStats.statistics?.atRiskCount || 0}
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Communication Alerts</span>
                            <span className="text-xs font-bold text-slate-700 mt-1 block">At-risk students (75%-80%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB: MY CLASSES (WORKLOADS) */}
            {activeTab === 'my-classes' && (
              <div className="space-y-6">
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-800">My Assigned Courses</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Classes and subjects officially allocated to your workload by Admin.</p>
                </div>

                {loadingDashboard ? (
                  <div className="flex items-center justify-center p-20 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
                    <p className="text-slate-500 font-bold text-sm">Loading course workloads...</p>
                  </div>
                ) : dashboardError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold">
                    {dashboardError}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dashboardData?.workloads?.map((w, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 hover:-translate-y-0.5 transition duration-200">
                        <div className="flex justify-between items-start gap-4">
                          <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-700 w-12 h-12 flex items-center justify-center font-black text-sm font-mono shrink-0">
                            {w.subject?.code}
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${w.subject?.subjectType === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {w.subject?.subjectType || 'Theory'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1">Credits: {w.subject?.credits}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-855 text-sm leading-snug line-clamp-1">{w.subject?.name}</h4>
                          <p className="text-indigo-650 font-black uppercase text-[10px] mt-1">
                            {w.department} Y{w.year} Sem {w.semester} Sec {w.section}
                          </p>
                        </div>

                        <div className="border-t border-slate-100 pt-3.5 grid grid-cols-3 text-center text-xs font-semibold text-slate-500">
                          <div className="border-r">
                            <span className="block text-[8px] uppercase font-bold text-slate-400">Assigned</span>
                            <span className="text-slate-800 font-extrabold block mt-0.5">{w.assignedHours}h</span>
                          </div>
                          <div className="border-r">
                            <span className="block text-[8px] uppercase font-bold text-slate-400 text-emerald-500">Completed</span>
                            <span className="text-emerald-600 font-extrabold block mt-0.5">{w.completedHours}h</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase font-bold text-slate-400 text-rose-500">Pending</span>
                            <span className="text-rose-600 font-extrabold block mt-0.5">{w.pendingHours}h</span>
                          </div>
                        </div>

                        <div className="space-y-1 mt-2.5">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-550">
                            <span>Progress Rate</span>
                            <span className="font-black text-indigo-600">{w.completionRate}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 border">
                            <div className="bg-indigo-650 h-1.5 rounded-full" style={{ width: `${w.completionRate}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!dashboardData?.workloads || dashboardData.workloads.length === 0) && (
                      <div className="col-span-3 bg-white p-12 text-center text-slate-400 italic rounded-2xl border border-slate-100">
                        No workload assignments found. Please contact the administrator.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MARK ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                
                {/* Attendance Session selector form */}
                {!activeSession && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">Launch Attendance Session</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Select class details below to start a dynamic checking session.</p>
                    </div>

                    <form onSubmit={handleStartCustomSession} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-500">
                      <div className="flex flex-col">
                        <label className="mb-1.5 uppercase font-bold text-slate-400 tracking-wide">Select Class Section</label>
                        <select 
                          required
                          value={attendanceForm.classKey}
                          onChange={e => setAttendanceForm({ ...attendanceForm, classKey: e.target.value })}
                          className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white"
                        >
                          <option value="">Select Class...</option>
                          {/* Populate classes from workloads */}
                          {[...new Set(dashboardData?.workloads?.map(w => `${w.department} Y${w.year} Sem ${w.semester} Sec ${w.section}`))].map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="mb-1.5 uppercase font-bold text-slate-400 tracking-wide">Select Subject</label>
                        <select 
                          required
                          value={attendanceForm.subjectId}
                          onChange={e => setAttendanceForm({ ...attendanceForm, subjectId: e.target.value })}
                          className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white"
                        >
                          <option value="">Select Subject...</option>
                          {/* Populate subjects matching the selected class */}
                          {dashboardData?.workloads?.filter(w => {
                            if (!attendanceForm.classKey) return true;
                            const key = `${w.department} Y${w.year} Sem ${w.semester} Sec ${w.section}`;
                            return key === attendanceForm.classKey;
                          }).map(w => (
                            <option key={w.subject?._id} value={w.subject?._id}>{w.subject?.name} ({w.subject?.code})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="mb-1.5 uppercase font-bold text-slate-400 tracking-wide">Lecture Date</label>
                        <input 
                          required
                          type="date"
                          value={attendanceForm.date}
                          onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                          className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white text-slate-800"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="mb-1.5 uppercase font-bold text-slate-400 tracking-wide">Period / Hour</label>
                        <select 
                          required
                          value={attendanceForm.period}
                          onChange={e => setAttendanceForm({ ...attendanceForm, period: e.target.value })}
                          className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white"
                        >
                          {['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <button type="submit" className="md:col-span-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold uppercase transition shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5">
                        <Plus className="w-4 h-4" /> Initialize Attendance Window
                      </button>
                    </form>

                    <div className="border-t pt-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Weekly Timetable Shortcuts</h4>
                      {renderTimetable()}
                    </div>
                  </div>
                )}

                {/* Active Session Portal */}
                {activeSession && (
                  <div className="space-y-6">
                    <div className={`p-6 rounded-2xl shadow-sm border text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
                      activeSession.locked 
                        ? 'bg-slate-900 border-slate-800' 
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-900 border-emerald-100'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            activeSession.locked ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-emerald-500 text-white animate-pulse'
                          }`}>
                            {activeSession.locked ? 'Locked Session' : 'Active Attendance Window'}
                          </span>
                          <span className="text-xs text-white/80 font-bold">| Period: {activeSession.period}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black">{activeSession.subject?.name}</h3>
                        <p className="text-xs text-white/80 font-semibold mt-1">
                          Class: {activeSession.department || 'CSE'} Y{activeSession.year || '1'} Sem {activeSession.semester || '1'} Sec {activeSession.section || 'A'} | Date: {new Date(activeSession.date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {!activeSession.locked && (
                          <button
                            onClick={handleSaveAndLock}
                            className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black rounded-xl transition text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-700/20"
                          >
                            <Lock className="w-4 h-4" /> Save & Lock Attendance
                          </button>
                        )}
                        <button
                          onClick={fetchActiveSession}
                          className="p-2.5 bg-white text-slate-800 hover:bg-slate-50 font-bold rounded-xl transition shadow text-xs"
                        >
                          <RefreshCw className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => { setActiveSession(null); setSessionStudents([]); }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition text-xs"
                        >
                          Close View
                        </button>
                      </div>
                    </div>



                    {/* Interactive Visual Student Toggles */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                        <div>
                          <h4 className="text-sm font-black text-slate-700">Class Section Roster</h4>
                          <p className="text-xs text-slate-450 font-semibold mt-0.5">Toggle student attendance status directly by clicking the status boxes below.</p>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setViewMode('list')}
                             className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-105'}`}
                           >
                             <List className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setViewMode('seating')}
                             className={`p-2 rounded-xl transition-colors ${viewMode === 'seating' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-105'}`}
                           >
                             <LayoutGrid className="w-4 h-4" />
                           </button>
                        </div>
                      </div>

                      {viewMode === 'list' ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-center text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                              <tr>
                                <th className="p-3 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Register No.</th>
                                <th className="p-3 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Student Name</th>
                                <th className="p-3 border-r border-slate-100 text-xs">Verification Method</th>
                                <th className="p-3 border-r border-slate-100 text-xs">Marked Time</th>
                                <th className="p-3 text-xs">Attendance Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sessionStudents.map(student => {
                                const record = attendanceRecordsMap[student._id];
                                const status = record ? record.status : 'Absent';
                                return (
                                  <tr key={student._id} className="hover:bg-slate-50/50 transition">
                                    <td className="p-3 font-bold text-slate-600 text-left border-r border-slate-100 font-mono text-xs">{student.registerNumber || '-'}</td>
                                    <td className="p-3 font-extrabold text-slate-800 text-left border-r border-slate-100 text-xs">{student.name}</td>
                                    <td className="p-3 border-r border-slate-100 font-semibold text-slate-500 text-xs">
                                      {record ? `${record.entryType} (${record.markedBy})` : 'Manual Override'}
                                    </td>
                                    <td className="p-3 border-r border-slate-100 font-mono text-slate-400 text-xs">
                                      {record ? new Date(record.markedAt).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="p-3">
                                      <div className="flex justify-center gap-1.5">
                                        {['Present', 'Absent', 'Late', 'On-Duty'].map(lbl => {
                                          const isActive = status === lbl;
                                          let activeClass = '';
                                          let inactiveClass = 'bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200';
                                          
                                          if (lbl === 'Present') activeClass = 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-100';
                                          else if (lbl === 'Absent') activeClass = 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-100';
                                          else if (lbl === 'Late') activeClass = 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-100';
                                          else activeClass = 'bg-indigo-600 text-white border-indigo-650 shadow-sm shadow-indigo-100';

                                          return (
                                            <button
                                              key={lbl}
                                              onClick={() => handleToggleAttendance(student._id, lbl)}
                                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition duration-150 ${
                                                isActive ? activeClass : inactiveClass
                                              }`}
                                            >
                                              {lbl === 'On-Duty' ? 'OD' : lbl}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {sessionStudents.length === 0 && (
                                <tr>
                                  <td colSpan="5" className="p-8 text-center text-slate-450 italic font-semibold text-xs animate-pulse">No students enrolled in this class roster.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4">
                          {sessionStudents.map(student => {
                            const record = attendanceRecordsMap[student._id];
                            const status = record ? record.status : 'Absent';
                            return (
                              <div
                                key={student._id}
                                className={`p-4 rounded-2xl border transition duration-200 flex flex-col items-center justify-center text-center space-y-3 relative hover:-translate-y-0.5 ${
                                  status === 'Present' ? 'bg-emerald-50/20 border-emerald-100 text-slate-800 shadow-sm' :
                                  status === 'Absent' ? 'bg-rose-50/20 border-rose-100 text-slate-800 shadow-sm' :
                                  status === 'Late' ? 'bg-amber-50/20 border-amber-100 text-slate-800 shadow-sm' :
                                  'bg-indigo-50/20 border-indigo-100 text-slate-800 shadow-sm'
                                }`}
                              >
                                <div className="flex flex-col items-center space-y-1">
                                  <UserCheck2 className={`w-5 h-5 ${
                                    status === 'Present' ? 'text-emerald-600' :
                                    status === 'Absent' ? 'text-rose-500' :
                                    status === 'Late' ? 'text-amber-500' : 'text-indigo-600'
                                  }`} />
                                  <div>
                                    <p className="text-xs font-black truncate max-w-[100px] text-slate-850 leading-tight">{student.name}</p>
                                    <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{student.registerNumber}</p>
                                  </div>
                                </div>

                                <div className="flex gap-1 justify-center w-full">
                                  {['Present', 'Absent', 'Late', 'On-Duty'].map(lbl => {
                                    const isActive = status === lbl;
                                    let activeClass = '';
                                    let inactiveClass = 'bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-250';
                                    
                                    if (lbl === 'Present') activeClass = 'bg-emerald-500 text-white border-emerald-500';
                                    else if (lbl === 'Absent') activeClass = 'bg-rose-500 text-white border-rose-500';
                                    else if (lbl === 'Late') activeClass = 'bg-amber-500 text-white border-amber-500';
                                    else activeClass = 'bg-indigo-600 text-white border-indigo-650';

                                    let shortLabel = 'P';
                                    if (lbl === 'Absent') shortLabel = 'A';
                                    else if (lbl === 'Late') shortLabel = 'L';
                                    else if (lbl === 'On-Duty') shortLabel = 'OD';

                                    return (
                                      <button
                                        key={lbl}
                                        onClick={() => handleToggleAttendance(student._id, lbl)}
                                        title={lbl}
                                        className={`w-6 h-6 rounded-lg text-[9px] font-black uppercase border transition duration-150 flex items-center justify-center shrink-0 ${
                                          isActive ? activeClass : inactiveClass
                                        }`}
                                      >
                                        {shortLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ATTENDANCE HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                
                {/* Filters block */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3.5">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">Attendance History Logs</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Filter and query your historical attendance sessions ledger.</p>
                    </div>
                    <button 
                      onClick={() => handleDownloadReport()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition hover:bg-emerald-100"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Excel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs font-semibold text-slate-500">
                    <div className="flex flex-col">
                      <label className="mb-1.5 uppercase font-bold text-slate-400 text-[10px]">Start Date</label>
                      <input 
                        type="date"
                        value={historyFilters.startDate}
                        onChange={e => setHistoryFilters({ ...historyFilters, startDate: e.target.value })}
                        className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white text-slate-700"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1.5 uppercase font-bold text-slate-400 text-[10px]">End Date</label>
                      <input 
                        type="date"
                        value={historyFilters.endDate}
                        onChange={e => setHistoryFilters({ ...historyFilters, endDate: e.target.value })}
                        className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white text-slate-700"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1.5 uppercase font-bold text-slate-400 text-[10px]">Class / Section</label>
                      <select
                        value={historyFilters.classKey}
                        onChange={e => setHistoryFilters({ ...historyFilters, classKey: e.target.value })}
                        className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="">All Classes</option>
                        {[...new Set(dashboardData?.sessionsList?.map(s => s.class))].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1.5 uppercase font-bold text-slate-400 text-[10px]">Subject Name / Code</label>
                      <input 
                        type="text"
                        placeholder="e.g. CSE301"
                        value={historyFilters.subjectId}
                        onChange={e => setHistoryFilters({ ...historyFilters, subjectId: e.target.value })}
                        className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white text-slate-700"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1.5 uppercase font-bold text-slate-400 text-[10px]">Semester</label>
                      <select
                        value={historyFilters.semester}
                        onChange={e => setHistoryFilters({ ...historyFilters, semester: e.target.value })}
                        className="border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="">All Semesters</option>
                        {['1', '2', '3', '4', '5', '6', '7', '8'].map(sem => (
                          <option key={sem} value={sem}>Sem {sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {loadingDashboard ? (
                  <div className="flex items-center justify-center p-20 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
                    <p className="text-slate-500 font-bold text-sm">Loading attendance history...</p>
                  </div>
                ) : dashboardError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold">
                    {dashboardError}
                  </div>
                ) : (
                  /* History Ledger Table */
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-sm border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Date</th>
                            <th className="p-4 font-bold text-slate-700 border-r border-slate-100 text-xs">Period</th>
                            <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Class</th>
                            <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Subject</th>
                            <th className="p-4 font-bold text-slate-700 border-r border-slate-100 text-xs">Avg Attendance</th>
                            <th className="p-4 font-bold text-slate-700 border-r border-slate-100 text-xs">Submission Time</th>
                            <th className="p-4 font-bold text-slate-700 border-r border-slate-100 text-xs">Status</th>
                            <th className="p-4 font-bold text-slate-750 text-xs">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                          {filteredHistory.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 text-left border-r border-slate-100 text-xs">
                                {new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="p-4 border-r border-slate-100 text-xs font-mono font-bold text-slate-800">
                                {s.period}
                              </td>
                              <td className="p-4 text-left border-r border-slate-100 text-xs font-bold text-indigo-700">
                                {s.class}
                              </td>
                              <td className="p-4 text-left border-r border-slate-100 text-xs">
                                <span className="block font-black text-slate-800">{s.subjectCode}</span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">{s.subjectName}</span>
                              </td>
                              <td className="p-4 border-r border-slate-100 text-xs font-bold text-indigo-600">
                                {s.locked ? `${s.attendancePercentage}%` : 'Un-finalized'}
                              </td>
                              <td className="p-4 border-r border-slate-100 text-xs font-mono text-slate-600">
                                {s.submissionTime ? new Date(s.submissionTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(s.submissionTime).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="p-4 border-r border-slate-100">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                  s.locked ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {s.locked ? 'Submitted' : 'Pending'}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => {
                                    setActiveTab('attendance');
                                    setTimeout(() => {
                                      setActiveSession({
                                        _id: s._id,
                                        subject: { name: s.subjectName },
                                        period: s.period,
                                        date: s.date,
                                        locked: s.locked
                                      });
                                      const parts = s.class.split(' ');
                                      loadSessionStudents({
                                        _id: s._id,
                                        department: parts[0],
                                        year: parts[1]?.replace('Y', '') || '1',
                                        semester: parts[3] || '1',
                                        section: parts[5] || 'A'
                                      });
                                    }, 100);
                                  }}
                                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs hover:bg-indigo-100 transition"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredHistory.length === 0 && (
                            <tr>
                              <td colSpan="7" className="p-8 text-center text-slate-400 italic font-semibold text-xs">
                                No attendance records found matching the filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PENDING ATTENDANCE */}
            {activeTab === 'pending' && (
              <div className="space-y-6">
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-800">Pending Attendance Checklist</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Periods across all dates for which attendance has not yet been locked/submitted.</p>
                </div>

                {loadingDashboard ? (
                  <div className="flex items-center justify-center p-20 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
                    <p className="text-slate-500 font-bold text-sm">Loading pending attendance...</p>
                  </div>
                ) : dashboardError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold">
                    {dashboardError}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-sm border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Date</th>
                            <th className="p-4 font-bold text-slate-700 border-r border-slate-100 text-xs">Period</th>
                            <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Class</th>
                            <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 text-xs">Subject</th>
                            <th className="p-4 font-bold text-slate-750 text-xs">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                          {dashboardData?.pendingList?.map((p, idx) => {
                            const isOverdue = new Date(p.date) < new Date(new Date().setHours(0,0,0,0));
                            return (
                              <tr key={idx} className={`hover:bg-slate-50/50 transition ${isOverdue ? 'bg-rose-50/20' : ''}`}>
                                <td className={`p-4 text-left border-r border-slate-100 text-xs font-bold ${isOverdue ? 'text-rose-650' : 'text-slate-700'}`}>
                                  {new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="p-4 border-r border-slate-100 text-xs font-mono font-bold text-slate-800">
                                  {p.period}
                                </td>
                                <td className="p-4 text-left border-r border-slate-100 text-xs font-bold text-indigo-700">
                                  {p.class}
                                </td>
                                <td className="p-4 text-left border-r border-slate-100 text-xs">
                                  <span className="block font-black text-slate-800">{p.subjectCode}</span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5">{p.subjectName}</span>
                                </td>
                                <td className="p-4 text-center">
                                  <button 
                                    onClick={() => handleQuickMarkNow(p)}
                                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition shadow-sm"
                                  >
                                    Mark Now
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {(!dashboardData?.pendingList || dashboardData.pendingList.length === 0) && (
                            <tr>
                              <td colSpan="5" className="p-12 text-center text-slate-400 italic font-semibold text-xs">
                                All attendance submissions are completed. Awesome job!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: MY TIMETABLE */}
            {activeTab === 'timetable' && (
              <div className="space-y-6">
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Academic Timetable Grid</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Personalized scheduling slots mapped for this academic semester.</p>
                  </div>
                  <div className="flex border rounded-xl overflow-hidden text-xs font-bold bg-slate-50">
                    <button 
                      onClick={() => setTimetableMode('weekly')}
                      className={`px-4 py-2 transition ${timetableMode === 'weekly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Weekly Grid
                    </button>
                    <button 
                      onClick={() => setTimetableMode('daily')}
                      className={`px-4 py-2 transition ${timetableMode === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Daily View
                    </button>
                  </div>
                </div>

                {timetableMode === 'weekly' ? (
                  renderTimetable()
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Days selector sidebar */}
                    <div className="bg-white border rounded-2xl p-4 shadow-sm h-fit space-y-1.5">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <button 
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`w-full flex justify-between items-center px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
                            selectedDay === day 
                              ? 'bg-indigo-600 text-white shadow shadow-indigo-100' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ))}
                    </div>

                    {/* Daily Schedule Slots */}
                    <div className="lg:col-span-3 bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Schedule for {selectedDay}</h4>
                      </div>

                      <div className="divide-y space-y-1">
                        {timetable.filter(t => t.dayOfWeek === selectedDay).map((slot, idx) => (
                          <div key={idx} className="py-4 flex justify-between items-center text-xs font-semibold">
                            <div className="flex gap-4 items-center">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                                {slot.period}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800 text-sm">{slot.subject?.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Class: {slot.department} Y{slot.year} Sec {slot.section} | Room {slot.classroom}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-slate-500 font-bold">{slot.startTime} - {slot.endTime}</span>
                              <button 
                                onClick={() => handleManualUnlock(slot._id)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg uppercase transition shadow-sm text-[10px]"
                              >
                                Unlock Window
                              </button>
                            </div>
                          </div>
                        ))}
                        {timetable.filter(t => t.dayOfWeek === selectedDay).length === 0 && (
                          <div className="text-center py-12 text-slate-400 italic text-xs font-bold">
                            No classes scheduled for {selectedDay}.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: REPORTS & ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                
                {/* Stats cards for analytics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Subjects Handled</span>
                    <span className="text-2xl font-black text-slate-800 mt-1.5 block">{analyticsSummary.length}</span>
                  </div>
                  <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-emerald-600">Locked Lectures</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1.5 block">
                      {analyticsSummary.reduce((a, b) => a + b.present, 0)}
                    </span>
                  </div>
                  <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-rose-600">Remaining Lectures</span>
                    <span className="text-2xl font-black text-rose-600 mt-1.5 block">
                      {analyticsSummary.reduce((a, b) => a + (b.total - b.present), 0)}
                    </span>
                  </div>
                  <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-indigo-650">Avg Attendance Ratios</span>
                    <span className="text-2xl font-black text-indigo-605 mt-1.5 block">
                      {analyticsSummary.length > 0 
                        ? Math.round(analyticsSummary.reduce((a, b) => a + b.attendancePercent, 0) / analyticsSummary.length) 
                        : 0}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut Chart Completion Overview */}
                  <div className="bg-white border rounded-2xl p-5 shadow-sm h-[320px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-700">Attendance Completion Overview</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Completed vs Pending hours donut comparison.</p>
                    </div>

                    <div className="h-[200px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={completionPieData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={50} 
                            outerRadius={75} 
                            paddingAngle={5} 
                            dataKey="value"
                          >
                            {completionPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Subject-wise Analysis */}
                  <div className="bg-white border rounded-2xl p-5 shadow-sm h-[320px] flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-700">Subject-wise Average Attendance</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Aggregate attendance percentages per course code.</p>
                    </div>

                    <div className="h-[200px] w-full">
                      {analyticsSummary.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsSummary}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="subjectCode" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Bar dataKey="attendancePercent" fill="#6366f1" radius={[4, 4, 0, 0]}>
                              {analyticsSummary.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.attendancePercent >= 75 ? '#10b981' : '#f43f5e'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-slate-400 italic text-xs font-semibold py-20">No data compiled.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject performance details */}
                <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                    <h4 className="text-sm font-black text-slate-700">Conducted Course Analytics Ledger</h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead className="bg-slate-50 text-slate-450 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="p-3 text-left">Subject Code</th>
                          <th className="p-3 text-left">Subject Name</th>
                          <th className="p-3">Conducted Hours</th>
                          <th className="p-3">Total Syllabus Hours</th>
                          <th className="p-3">Average Attendance</th>
                          <th className="p-3 w-36">Reports</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {analyticsSummary.map(sub => (
                          <tr key={sub._id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 text-left font-bold text-slate-800 font-mono">{sub.subjectCode}</td>
                            <td className="p-3 text-left">{sub.subjectName}</td>
                            <td className="p-3 text-emerald-600 font-bold">{sub.present} Hours</td>
                            <td className="p-3 text-slate-650">{sub.total} Hours</td>
                            <td className="p-3 font-bold text-indigo-650">{sub.attendancePercent}%</td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDownloadReport(sub._id)}
                                className="px-3.5 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-extrabold rounded-xl text-[10px] uppercase transition flex items-center gap-1 mx-auto"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">System Bulletins & Messages</h3>
                    <p className="text-xs text-slate-450 font-semibold mt-0.5">Announcements, correction requests updates, and administrative notes.</p>
                  </div>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button 
                      onClick={async () => {
                        try {
                          await axios.put(apiUrl('/api/admin/notifications/read-all'), {}, {
                            headers: withAuthHeader()
                          });
                          setNotifications(prev => prev.map(item => ({ ...item, read: true })));
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <CheckSquareIcon className="w-4 h-4" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {loadingNotifications ? (
                    <p className="text-center text-slate-405 italic py-10 font-bold">Loading notices...</p>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2 font-bold">
                      <Bell className="w-10 h-10 text-slate-200" />
                      <p>All clean. No notifications logged.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id} className={`p-4 border rounded-xl flex justify-between items-start gap-4 transition ${
                        n.read ? 'bg-slate-50/70 border-slate-100 opacity-80' : 'bg-white border-slate-200 border-l-4 border-l-indigo-600 shadow-sm shadow-indigo-100/10'
                      }`}>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span className="font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              n.type === 'Alert' ? 'bg-rose-500 text-white' :
                              n.type === 'Warning' ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
                            }`}>{n.type}</span>
                          </div>
                          <p className={`text-slate-805 text-sm ${!n.read ? 'font-black' : 'font-medium'}`}>{n.message}</p>
                        </div>
                        {!n.read && (
                          <button 
                            onClick={async () => {
                              try {
                                await axios.put(apiUrl(`/api/admin/notifications/${n._id}/read`), {}, { headers: withAuthHeader() });
                                setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, read: true } : item));
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="p-1.5 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: MY DOSSIER & PROFILE */}
            {activeTab === 'dossier' && (
              <FacultyDetailsView 
                faculty={user} 
                onNavigateTab={(tab, targetSlot) => {
                  setActiveTab(tab);
                  if (tab === 'attendance' && targetSlot) {
                    if (targetSlot._id) {
                      handleQuickMarkNow(targetSlot);
                    } else {
                      handleMarkTodayScheduleSlot(targetSlot);
                    }
                  }
                }}
              />
            )}

            {/* TAB: CLASS ADVISOR VIEW */}
            {activeTab === 'advisor' && isClassAdvisor && (
              <AdvisorDashboardView />
            )}

          </div>
        </div>

        {/* Attendance Correction Requests Modal */}
        {isCorrectionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h4 className="text-base font-extrabold text-slate-800">Request Attendance Override</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Correction requests will be audited and reviewed by HOD/Admin.</p>
                </div>
                <button 
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCorrectionSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-500">
                <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1.5">
                  <p className="text-slate-400">Student Target: <span className="font-extrabold text-slate-855">{correctionTarget.studentName}</span></p>
                  <p className="text-slate-400">Current Status: <span className="font-extrabold text-rose-600">{correctionTarget.currentStatus}</span></p>
                </div>

                <div>
                  <label className="block mb-1.5 uppercase tracking-wide text-slate-400">Requested Status</label>
                  <select 
                    value={correctionTarget.newStatus}
                    onChange={e => setCorrectionTarget({ ...correctionTarget, newStatus: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 bg-white text-slate-800 font-bold"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="On-Duty">On-Duty</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 uppercase tracking-wide text-slate-400">Correction Reason / Justification</label>
                  <textarea 
                    required
                    rows="3.5"
                    placeholder="Provide details for HOD/Admin review... (e.g. Student scanned late due to network glitch, verified in class)"
                    value={correctionTarget.reason}
                    onChange={e => setCorrectionTarget({ ...correctionTarget, reason: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white text-slate-800 font-medium leading-relaxed"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCorrectionModalOpen(false)}
                    className="px-4 py-2.5 border rounded-xl hover:bg-slate-50 text-slate-700 font-bold transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold uppercase transition shadow-md shadow-indigo-100"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar for Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-150 py-2 px-4 flex items-center justify-around z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
          {menuItems.slice(0, 4).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-colors duration-200 ${
                  isActive ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-655'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-650 scale-105' : 'text-slate-400'}`} />
                <span className="truncate max-w-[65px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-extrabold text-slate-400 hover:text-slate-655"
          >
            <Menu className="w-5 h-5 text-slate-400" />
            <span>More</span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default FacultyDashboard;
