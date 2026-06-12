import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { 
  Users, UserCog, CheckCircle, GraduationCap, 
  FileCheck2, Building2, AlertTriangle, PlayCircle, CalendarClock, UserMinus,
  Search, Download, Bell, Send, ArrowRight, Play, RefreshCw, BarChart3,
  Mail, UserCircle, MapPin, Sparkles, Clock, Calendar, CheckSquare, ShieldAlert,
  FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { downloadReport, getStudentAttendanceDetails, createNotification } from '../../api/adminApi';

export default function AnalyticsDashboard({ departmentOnly, setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Student Quick Search & Profiler
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  
  // Notification Action Status
  const [notifyingId, setNotifyingId] = useState(null);

  // Live period monitoring search filter
  const [periodFilter, setPeriodFilter] = useState('');

  // Editing individual attendance record
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState('');
  const [updatingRecord, setUpdatingRecord] = useState(false);
  const [defaulterTab, setDefaulterTab] = useState('critical'); // 'critical' or 'warning'

  const handleEditIndividualAttendance = async (recordId, newStatus) => {
    try {
      setUpdatingRecord(true);
      await axios.put(apiUrl(`/api/admin/attendance/${recordId}`), {
        status: newStatus
      }, { headers: withAuthHeader() });
      
      // Re-fetch student details to update modal
      if (selectedStudentDetail?.student?._id) {
        const res = await getStudentAttendanceDetails(selectedStudentDetail.student._id);
        setSelectedStudentDetail(res.data);
      }
      
      // Refresh analytics overview counters
      fetchAnalytics();
      setEditingRecordId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to edit attendance record.');
    } finally {
      setUpdatingRecord(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchStudentList();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl('/api/admin/analytics/overview'), {
        headers: withAuthHeader()
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentList = async () => {
    try {
      const response = await axios.get(apiUrl('/api/admin/students/academic'), {
        headers: withAuthHeader()
      });
      setAllStudents(response.data);
      setFilteredStudents(response.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch student list for search', err);
    }
  };

  const handleStudentSearch = (e) => {
    const val = e.target.value;
    setStudentSearch(val);
    if (!val) {
      setFilteredStudents(allStudents.slice(0, 5));
    } else {
      const query = val.toLowerCase().trim();
      const filtered = allStudents.filter(s => {
        const nameMatch = s.name && s.name.toLowerCase().includes(query);
        const regMatch = s.registerNumber && s.registerNumber.toLowerCase().includes(query);
        const rollMatch = s.rollNumber && s.rollNumber.toLowerCase().includes(query);
        const deptMatch = s.department && s.department.toLowerCase().includes(query);
        
        // Exact semester match or suffix (e.g. "4" or "semester 4" / "sem 4")
        const semMatch = s.semester && (
          String(s.semester).toLowerCase() === query || 
          `sem ${s.semester}`.includes(query) || 
          `semester ${s.semester}`.includes(query)
        );
        
        // Section match
        const secMatch = s.section && (
          s.section.toLowerCase() === query ||
          `sec ${s.section}`.toLowerCase().includes(query) ||
          `section ${s.section}`.toLowerCase().includes(query)
        );

        // Attendance Percentage match (checks if query matches the number exactly or if we filter e.g. "87%")
        const cleanQuery = query.replace('%', '');
        let pctMatch = false;
        if (!isNaN(cleanQuery) && cleanQuery !== '') {
          const pctVal = parseInt(cleanQuery, 10);
          const attPct = s.attendance?.percentage || 0;
          pctMatch = (attPct === pctVal);
        }

        return nameMatch || regMatch || rollMatch || deptMatch || semMatch || secMatch || pctMatch;
      });
      setFilteredStudents(filtered.slice(0, 5));
    }
  };

  const loadStudentProfile = async (studentId) => {
    try {
      setLoadingStudentDetail(true);
      setStudentModalOpen(true);
      const res = await getStudentAttendanceDetails(studentId);
      setSelectedStudentDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch student details', err);
      alert('Could not retrieve student attendance details.');
      setStudentModalOpen(false);
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const triggerDefaulterNotification = async (student) => {
    try {
      setNotifyingId(student.id || student._id);
      await createNotification({
        message: `Warning Alert: Attendance for student ${student.name} (${student.rollNo || student.registerNumber}) is at ${student.attendance || student.attendance?.percentage || 0}%, which is below the 75% threshold.`
      });
      alert(`Notification alert dispatched successfully to ${student.name} and their HOD.`);
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch compliance alert.');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleReportDownload = async (type) => {
    try {
      const res = await downloadReport(type);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download report failed', err);
      alert('Error downloading Excel report. Make sure sheets contain data.');
    }
  };

  if (loading || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      <p className="text-slate-500 font-bold text-sm">Synchronizing Academic Control Center...</p>
    </div>
  );

  const { 
    overview, livePeriod, calendarMonitor, 
    sessionEngine, defaulterMonitor, departmentPerformance, 
    facultyCompliance, classHeatmap, notifications 
  } = data;

  const quickActions = [
    { title: 'Add Student', action: () => setActiveTab?.('students'), color: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200' },
    { title: 'Add Faculty', action: () => setActiveTab?.('faculty'), color: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200' },
    { title: 'Create Timetable', action: () => setActiveTab?.('timetable'), color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200' },
    { title: 'Upload Academic Calendar', action: () => setActiveTab?.('calendar'), color: 'bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-200' },
    { title: 'Generate Report', action: () => setActiveTab?.('reports'), color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200' },
    { title: 'Notifications', action: () => setActiveTab?.('notifications'), color: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200' },
  ];

  const filteredPeriodClasses = livePeriod?.classes?.filter(c => 
    c.faculty.toLowerCase().includes(periodFilter.toLowerCase()) ||
    c.subject.toLowerCase().includes(periodFilter.toLowerCase()) ||
    c.class.toLowerCase().includes(periodFilter.toLowerCase()) ||
    c.department.toLowerCase().includes(periodFilter.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 font-sans">
      
      {/* Central Navigation Actions & Title */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
        <div>
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border border-indigo-100">Live Campus Engine</span>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-2">Central Academic Control Center</h1>
          <p className="text-xs text-slate-500 font-bold mt-1">Real-time timetable synchronization and attendance lock analytics.</p>
        </div>
        
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2.5 w-full lg:w-auto">
          {quickActions.map((qa, index) => (
            <button 
              key={index}
              onClick={qa.action}
              className={`px-4 py-2.5 rounded-xl border text-xs font-extrabold tracking-tight transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${qa.color}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {qa.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Live College Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-100">Active Students</span>
              <div className="p-2 bg-white/10 rounded-xl"><Users className="w-5 h-5" /></div>
            </div>
            <div>
              <h4 className="text-3xl font-extrabold">{overview.students}</h4>
              <p className="text-[10px] font-semibold text-blue-100 mt-1">Total Enrolled Profiles</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold uppercase tracking-widest text-purple-100">Faculty Members</span>
              <div className="p-2 bg-white/10 rounded-xl"><UserCog className="w-5 h-5" /></div>
            </div>
            <div>
              <h4 className="text-3xl font-extrabold">{overview.faculty}</h4>
              <p className="text-[10px] font-semibold text-purple-100 mt-1">Teaching & HOD Accounts</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold uppercase tracking-widest text-orange-100">Departments</span>
              <div className="p-2 bg-white/10 rounded-xl"><Building2 className="w-5 h-5" /></div>
            </div>
            <div>
              <h4 className="text-3xl font-extrabold">{overview.departments}</h4>
              <p className="text-[10px] font-semibold text-orange-100 mt-1">Affiliated Branches</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-100">Running Classes Now</span>
              <div className="p-2 bg-white/10 rounded-xl animate-pulse"><PlayCircle className="w-5 h-5" /></div>
            </div>
            <div>
              <h4 className="text-3xl font-extrabold">{overview.liveClassesRunningNow}</h4>
              <p className="text-[10px] font-semibold text-emerald-100 mt-1">Active Periods in Timetable</p>
            </div>
          </div>
        </div>

        {/* Today's Attendance Diagnostics Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Today's Attendance Diagnostics
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">Summary of sessions generated and marked today</p>
          </div>
          
          <div className="my-4 flex items-center justify-between">
            <div>
              <span className="text-4xl font-black text-slate-800">{overview.todayAttendancePercent}%</span>
              <p className="text-[10px] text-slate-500 font-bold mt-1">Today's Avg Attendance</p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-extrabold text-slate-700">{overview.facultySubmittedToday} Submitted</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs font-extrabold text-slate-700">{overview.facultyPendingToday} Pending</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${overview.facultySubmittedToday + overview.facultyPendingToday > 0 ? (overview.facultySubmittedToday / (overview.facultySubmittedToday + overview.facultyPendingToday)) * 100 : 0}%` }}></div>
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${overview.facultySubmittedToday + overview.facultyPendingToday > 0 ? (overview.facultyPendingToday / (overview.facultySubmittedToday + overview.facultyPendingToday)) * 100 : 0}%` }}></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>{Math.round(overview.facultySubmittedToday + overview.facultyPendingToday > 0 ? (overview.facultySubmittedToday / (overview.facultySubmittedToday + overview.facultyPendingToday)) * 100 : 0)}% Submitted</span>
              <span>{Math.round(overview.facultySubmittedToday + overview.facultyPendingToday > 0 ? (overview.facultyPendingToday / (overview.facultySubmittedToday + overview.facultyPendingToday)) * 100 : 0)}% Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 & Section 3: Live Period Monitoring & Academic Calendar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Section 2: Live Period Monitoring */}
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Live Period Monitoring
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Real-time status of current timetable slots</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Time: {livePeriod?.currentTime || 'N/A'}
                </span>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-extrabold border border-indigo-100">
                  Hour: {livePeriod?.currentPeriod || 'N/A'}
                </span>
              </div>
            </div>

            {/* Filter */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Filter by class, subject, or faculty..."
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="p-3">Department</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Faculty</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPeriodClasses.map((cls, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-bold text-slate-600">{cls.department}</td>
                      <td className="p-3 font-semibold text-slate-700">{cls.class}</td>
                      <td className="p-3 font-semibold text-slate-800">{cls.subject}</td>
                      <td className="p-3 text-slate-600">{cls.faculty}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border flex items-center justify-center gap-1 mx-auto max-w-[100px] ${
                          cls.status === 'Submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          cls.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          cls.status === 'Missing' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          cls.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                          'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            cls.status === 'Submitted' ? 'bg-emerald-500' :
                            cls.status === 'Pending' ? 'bg-amber-500' :
                            cls.status === 'Missing' ? 'bg-rose-500' :
                            'bg-indigo-500'
                          }`}></span>
                          {cls.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredPeriodClasses.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic">No classes active in current period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 3: Academic Calendar Monitor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                Academic Calendar Monitor
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Control state of campus operations</p>
            </div>

            {/* Today status */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              calendarMonitor?.todayIsWorking 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Today's Operation</p>
                <p className="text-lg font-black mt-0.5">{calendarMonitor?.todayStatusText || 'Working Day'}</p>
              </div>
              {!calendarMonitor?.todayIsWorking && (
                <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-md animate-pulse">
                  Sessions Disabled
                </span>
              )}
            </div>

            {/* Upcoming events list */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Upcoming Events</p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                {calendarMonitor?.upcomingEvents?.map((event, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 hover:bg-slate-50 rounded-xl transition text-xs border border-transparent hover:border-slate-100">
                    <span className="font-extrabold text-indigo-600 bg-indigo-50/80 px-2 py-1 rounded-lg">
                      {new Date(event.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-semibold text-slate-700 flex-1 ml-3 truncate">{event.description}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.type}</span>
                  </div>
                ))}
                {(!calendarMonitor?.upcomingEvents || calendarMonitor.upcomingEvents.length === 0) && (
                  <p className="text-center text-xs text-slate-400 italic py-4">No upcoming events listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 & Section 5: Attendance Session Engine & Defaulter Monitoring */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Section 4: Attendance Session Engine */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-emerald-500" />
                  Attendance Session Engine
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Active tokens generated from timetable</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-extrabold border border-emerald-100">
                Created: {sessionEngine?.todaySessionsCount || 0}
              </span>
            </div>

            <div className="overflow-y-auto max-h-[250px] custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="p-3">Session ID</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Hour</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessionEngine?.sessions?.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-extrabold text-indigo-600 tracking-wider">#{s.sessionId}</td>
                      <td className="p-3 font-semibold text-slate-700">{s.class}</td>
                      <td className="p-3 font-semibold text-slate-800">{s.subject}</td>
                      <td className="p-3 text-slate-600">{s.hour}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          s.isLocked ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {s.isLocked ? 'Locked' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!sessionEngine?.sessions || sessionEngine.sessions.length === 0) && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic">No attendance sessions created today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 5: Defaulter Monitoring */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-slate-50 gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Performance & Risk Monitoring
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Students below the required 75% attendance threshold</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button 
                  onClick={() => setDefaulterTab('critical')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    defaulterTab === 'critical' 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Critical List ({defaulterMonitor?.defaulters?.filter(d => d.attendance < 50).length || 0})
                </button>
                <button 
                  onClick={() => setDefaulterTab('warning')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    defaulterTab === 'warning' 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Warning List ({defaulterMonitor?.defaulters?.filter(d => d.attendance >= 50).length || 0})
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[250px] custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3 text-center">Attendance</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((defaulterTab === 'critical' 
                    ? defaulterMonitor?.defaulters?.filter(d => d.attendance < 50) 
                    : defaulterMonitor?.defaulters?.filter(d => d.attendance >= 50)
                  ) || []).map((stu, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-semibold text-slate-600">{stu.rollNo}</td>
                      <td className="p-3 font-bold text-slate-700">{stu.name}</td>
                      <td className={`p-3 text-center font-black ${
                        stu.attendance < 50 ? 'text-rose-600' : 'text-amber-600'
                      }`}>{stu.attendance}%</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                          stu.attendance < 50 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {stu.attendance < 50 ? 'CRITICAL' : 'WARNING'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          disabled={notifyingId === stu.id}
                          onClick={() => triggerDefaulterNotification(stu)}
                          className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {notifyingId === stu.id ? 'Sending...' : 'Alert Parent'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {((defaulterTab === 'critical' 
                    ? defaulterMonitor?.defaulters?.filter(d => d.attendance < 50) 
                    : defaulterMonitor?.defaulters?.filter(d => d.attendance >= 50)
                  ) || []).length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic">
                        No students in {defaulterTab} list.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6 & Section 7: Department Performance & Faculty Compliance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Section 6: Department Performance Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Department Attendance Comparison
            </h3>
            <div className="h-[220px] w-full min-w-0 relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={departmentPerformance || []} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]} barSize={20}>
                    {(departmentPerformance || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.percentage < 75 ? '#f43f5e' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Section 7: Faculty Compliance Monitor */}
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              Faculty Submission Compliance Monitor
            </h3>

            <div className="overflow-y-auto max-h-[220px] custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="p-3">Faculty Name</th>
                    <th className="p-3 text-center">Assigned Classes Today</th>
                    <th className="p-3 text-center">Submitted Sessions</th>
                    <th className="p-3 text-center">Missing Submissions</th>
                    <th className="p-3 text-right">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facultyCompliance?.map((fac, i) => {
                    const total = fac.assigned;
                    const sub = fac.submitted;
                    const missing = fac.missing;
                    const complianceRate = total > 0 ? Math.round((sub / total) * 100) : 100;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-bold text-slate-700">{fac.facultyName}</td>
                        <td className="p-3 text-center font-semibold text-slate-600">{total}</td>
                        <td className="p-3 text-center font-semibold text-emerald-600">{sub}</td>
                        <td className="p-3 text-center font-semibold text-rose-600">{missing}</td>
                        <td className={`p-3 text-right font-black ${
                          complianceRate < 75 ? 'text-rose-500' : 'text-emerald-500'
                        }`}>{complianceRate}%</td>
                      </tr>
                    );
                  })}
                  {(!facultyCompliance || facultyCompliance.length === 0) && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic">No faculty timetable data available today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Section 8 & Section 10: Timetable Management Today & Attendance Heat Map */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Section 8: Today's Timeline Schedule */}
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
              <Clock className="w-4 h-4 text-indigo-500" />
              Today's Campus Timetable Schedule
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {livePeriod?.classes?.map((slot, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition ${
                  slot.status === 'In Progress' ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10' :
                  slot.status === 'Submitted' ? 'bg-emerald-50/30 border-emerald-100' :
                  slot.status === 'Missing' ? 'bg-rose-50/30 border-rose-100' :
                  'bg-slate-50/30 border-slate-200/60'
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{slot.period}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      slot.status === 'Submitted' ? 'bg-emerald-500' :
                      slot.status === 'In Progress' ? 'bg-blue-500 animate-ping' :
                      slot.status === 'Missing' ? 'bg-rose-500' :
                      'bg-slate-400'
                    }`}></span>
                  </div>
                  <div className="my-2">
                    <p className="text-xs font-black text-slate-800 truncate">{slot.subject}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">{slot.class} | {slot.faculty}</p>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100/50">
                    <span>{slot.startTime} - {slot.endTime}</span>
                    <span className="uppercase text-slate-600">{slot.status}</span>
                  </div>
                </div>
              ))}
              {(!livePeriod?.classes || livePeriod.classes.length === 0) && (
                <div className="col-span-full py-8 text-center text-slate-400 italic">No classes scheduled for today.</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 10: Attendance Heat Map */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              Class Attendance Heat Map
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mb-4">Color representation of class performance overall</p>
            
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {classHeatmap?.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{item.className}</span>
                    <span className={item.percentage < 75 ? 'text-rose-600 font-black' : 'text-slate-600'}>{item.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      item.percentage < 75 ? 'bg-rose-500' : 'bg-indigo-500'
                    }`} style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              ))}
              {(!classHeatmap || classHeatmap.length === 0) && (
                <p className="text-center text-xs text-slate-400 italic">No class performance records compiled.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 9: Student Management Quick Search & Profiler */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-indigo-500" />
            Student Management & Attendance Profiler
          </h3>
          <p className="text-[11px] text-slate-400 font-bold mb-4">Instant search and deep profile inspection for any student record</p>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
              <input 
                type="text"
                placeholder="Search by student name, register number, or roll number..."
                value={studentSearch}
                onChange={handleStudentSearch}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            {studentSearch && (
              <button 
                onClick={() => setStudentSearch('')}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Result Dropdown List */}
          {studentSearch && (
            <div className="mt-4 border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden shadow-sm">
              {filteredStudents.map((stu) => (
                <div 
                  key={stu._id} 
                  onClick={() => loadStudentProfile(stu._id)}
                  className="p-3 bg-white hover:bg-slate-50/50 cursor-pointer transition flex items-center justify-between text-xs font-bold"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-black">{stu.name}</p>
                      <p className="text-[10px] text-slate-400">Reg: {stu.registerNumber} | Dept: {stu.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      stu.attendance?.percentage < 75 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {stu.attendance?.percentage || 0}% Attended
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <p className="p-4 text-center text-xs text-slate-400 italic">No matching students found in the college database.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 11 & Section 12: Notifications Center & Reports Center */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Section 11: Notifications Center Log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-4 border-b border-slate-50">
              <Bell className="w-4 h-4 text-amber-500 animate-swing" />
              Notifications Center & Compliance Alerts
            </h3>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
              {notifications?.map((notif, idx) => (
                <div key={idx} className={`p-3 rounded-xl border flex gap-3 items-start text-xs font-semibold ${
                  notif.type === 'Alert' ? 'bg-rose-50/50 border-rose-100 text-rose-800' :
                  notif.type === 'Warning' ? 'bg-orange-50/50 border-orange-100 text-orange-800' :
                  'bg-slate-50/80 border-slate-200/50 text-slate-700'
                }`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    notif.type === 'Alert' ? 'text-rose-500' :
                    notif.type === 'Warning' ? 'text-orange-500' :
                    'text-slate-400'
                  }`} />
                  <div className="flex-1">
                    <p className="font-bold leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {(!notifications || notifications.length === 0) && (
                <p className="text-center text-xs text-slate-400 italic py-6">All systems nominal. No alerts active.</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 12: Reports Center Generation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Academic Reports Center
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Generate and download official compliance logs</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => handleReportDownload('daily')}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs p-4 rounded-2xl hover:bg-indigo-50/40 hover:border-indigo-200 hover:text-indigo-600 transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Clock className="w-6 h-6" />
                Daily Attendance Report
              </button>
              <button 
                onClick={() => handleReportDownload('weekly')}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs p-4 rounded-2xl hover:bg-indigo-50/40 hover:border-indigo-200 hover:text-indigo-600 transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Calendar className="w-6 h-6" />
                Weekly Performance Log
              </button>
              <button 
                onClick={() => handleReportDownload('monthly')}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs p-4 rounded-2xl hover:bg-indigo-50/40 hover:border-indigo-200 hover:text-indigo-600 transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <CheckSquare className="w-6 h-6" />
                Monthly Export Sheet
              </button>
              <button 
                onClick={() => handleReportDownload('semester')}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs p-4 rounded-2xl hover:bg-indigo-50/40 hover:border-indigo-200 hover:text-indigo-600 transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <GraduationCap className="w-6 h-6" />
                Semester Summary Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT PROFILE DETAILED VISUALIZER MODAL */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none"></div>
              <div>
                <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wide uppercase border border-indigo-400/20">Academic Profile Log</span>
                <h3 className="text-xl font-extrabold text-white mt-2 flex items-center gap-2">
                  <UserCircle className="w-5.5 h-5.5 text-indigo-400" />
                  Student Control Center Record
                </h3>
              </div>
              <button 
                onClick={() => setStudentModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition border border-white/10"
              >
                Close Record
              </button>
            </div>

            {loadingStudentDetail || !selectedStudentDetail ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-transparent"></div>
                <p className="text-slate-500 font-bold text-xs">Accessing Student Attendance Ledger...</p>
              </div>
            ) : (
              <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar space-y-6">
                
                {/* 1. Student Personal & Academic details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal details Card */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3.5">
                    <div className="flex gap-4 items-center border-b border-slate-200 pb-3">
                      <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-extrabold shadow-sm">
                        {selectedStudentDetail.student?.name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800">{selectedStudentDetail.student?.name}</h4>
                        <p className="text-[11px] text-indigo-500 font-bold tracking-tight">Student Profile Information</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Register Number</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.registerNumber || '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Roll Number</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.rollNumber || '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Department</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.department}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Gender</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.gender || '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Email Address</span> <span className="text-slate-800 font-extrabold mt-0.5 truncate">{selectedStudentDetail.student?.email || '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Mobile Number</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.mobile || '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Date of Birth</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.dob ? new Date(selectedStudentDetail.student.dob).toLocaleDateString([], { dateStyle: 'medium' }) : '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Address</span> <span className="text-slate-800 font-extrabold mt-0.5 truncate">{selectedStudentDetail.student?.address || '123 Academic Campus St, City'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Parent Name</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.parentDetails?.name || '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Parent Contact</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.parentDetails?.mobile || '-'}</span></p>
                    </div>
                  </div>

                  {/* Academic details Card */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3.5">
                    <div className="flex gap-4 items-center border-b border-slate-200 pb-3">
                      <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <GraduationCap className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800">Academic Records</h4>
                        <p className="text-[11px] text-indigo-500 font-bold tracking-tight">Active Enrollment Details</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Current Year</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.year ? `Year ${selectedStudentDetail.student.year}` : '-'}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Semester & Section</span> <span className="text-slate-800 font-extrabold mt-0.5">Sem {selectedStudentDetail.student?.semester} | Sec {selectedStudentDetail.student?.section}</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Class Advisor</span> <span className="text-slate-800 font-extrabold mt-0.5">{selectedStudentDetail.student?.department} Advisor 1</span></p>
                      <p className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] uppercase">Academic Year</span> <span className="text-slate-800 font-extrabold mt-0.5">{
                        { '1': '2025-2026', '2': '2024-2025', '3': '2023-2024', '4': '2022-2023' }[selectedStudentDetail.student?.year] || '2024-2025'
                      }</span></p>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Subjects Enrolled & Assigned Faculty</span>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                          {selectedStudentDetail.subjectWise?.map((sub, i) => (
                            <p key={i} className="flex justify-between items-center text-[11px] bg-white border border-slate-100 p-1.5 rounded-lg font-bold">
                              <span className="text-slate-800">{sub.name} ({sub.code})</span>
                              <span className="text-indigo-500">Faculty: {sub.faculty || 'N/A'}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Overall Attendance Diagnostics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-center">
                    <span className="text-2xl font-black text-indigo-700">{selectedStudentDetail.overall?.percentage}%</span>
                    <p className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest mt-1">Overall Percentage</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                    <span className="text-2xl font-black text-emerald-700">{selectedStudentDetail.overall?.present}</span>
                    <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest mt-1">Days Attended</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center">
                    <span className="text-2xl font-black text-rose-700">{selectedStudentDetail.overall?.absent}</span>
                    <p className="text-[9px] font-extrabold text-rose-400 uppercase tracking-widest mt-1">Days Absent</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center">
                    <span className="text-2xl font-black text-amber-700">{selectedStudentDetail.overall?.onDuty || 0}</span>
                    <p className="text-[9px] font-extrabold text-amber-400 uppercase tracking-widest mt-1">On-Duty Approved</p>
                  </div>
                </div>

                {/* 3. Subject-wise Attendance */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Subject-wise Analytics Summary</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold">
                        <tr>
                          <th className="p-3">Subject Code</th>
                          <th className="p-3">Subject Name</th>
                          <th className="p-3 text-center">Hours Conducted</th>
                          <th className="p-3 text-center">Hours Attended</th>
                          <th className="p-3 text-center">Hours Absent</th>
                          <th className="p-3 text-right">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStudentDetail.subjectWise?.map((sub, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-extrabold text-indigo-600">{sub.code}</td>
                            <td className="p-3 font-bold text-slate-800">{sub.name}</td>
                            <td className="p-3 text-center text-slate-600 font-semibold">{sub.total}</td>
                            <td className="p-3 text-center text-emerald-600 font-semibold">{sub.present + sub.late}</td>
                            <td className="p-3 text-center text-rose-600 font-semibold">{sub.absent}</td>
                            <td className={`p-3 text-right font-black ${
                              sub.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>{sub.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily Attendance Timeline */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Daily Attendance Timeline</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3">H1</th>
                          <th className="p-3">H2</th>
                          <th className="p-3">H3</th>
                          <th className="p-3">H4</th>
                          <th className="p-3">H5</th>
                          <th className="p-3">H6</th>
                          <th className="p-3">H7</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStudentDetail.dailyTimeline?.map((day, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-600 text-left">
                              {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            {['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'].map(hour => {
                              const val = day[hour];
                              return (
                                <td key={hour} className="p-3">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${
                                    val === 'P' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                    val === 'A' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                    val === 'L' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                    val === 'OD' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                                    val === 'H' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                    'bg-slate-50 text-slate-400'
                                  }`}>
                                    {val === 'P' ? 'P' : val === 'A' ? 'A' : val === 'L' ? 'L' : val === 'OD' ? 'OD' : val === 'H' ? 'H' : '-'}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-slate-500 justify-center">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> P = Present</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> A = Absent</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> L = Late</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> OD = On-Duty</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> H = Holiday</span>
                  </div>
                </div>

                {/* 4. Monthly & Date-wise logs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Monthly Attendance */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Monthly Attendance Performance</h4>
                    <div className="space-y-3">
                      {selectedStudentDetail.monthly?.map((m, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">{m.month}</span>
                            <span className="text-slate-600">{m.percentage}% ({m.present}/{m.total} days)</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${m.percentage}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date-wise Detailed Log */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Date-wise Attendance Ledger Log (Admin Edit Control)</h4>
                      <div className="overflow-y-auto max-h-[220px] custom-scrollbar">
                        <table className="w-full text-left text-[11px] whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                            <tr>
                              <th className="p-2">Date</th>
                              <th className="p-2">Subject</th>
                              <th className="p-2">Hour</th>
                              <th className="p-2 text-center">Status</th>
                              <th className="p-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedStudentDetail.dateWise?.map((log, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2 font-bold text-slate-600">
                                  {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="p-2 font-semibold text-slate-800 truncate max-w-[100px]">{log.subject}</td>
                                <td className="p-2 text-slate-500">{log.period}</td>
                                <td className="p-2 text-center">
                                  {editingRecordId === log._id ? (
                                    <select 
                                      value={newStatusValue} 
                                      onChange={(e) => {
                                        setNewStatusValue(e.target.value);
                                        handleEditIndividualAttendance(log._id, e.target.value);
                                      }}
                                      disabled={updatingRecord}
                                      className="border border-slate-200 rounded p-1 text-[11px] font-bold text-slate-700 outline-none animate-pulse"
                                    >
                                      <option value="Present">Present</option>
                                      <option value="Absent">Absent</option>
                                      <option value="Late">Late</option>
                                      <option value="On-Duty">On-Duty</option>
                                    </select>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      log.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                                      log.status === 'Late' ? 'bg-amber-50 text-amber-700' :
                                      log.status === 'Absent' ? 'bg-rose-50 text-rose-700' :
                                      'bg-indigo-50 text-indigo-700'
                                    }`}>
                                      {log.status}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 text-right">
                                  {editingRecordId === log._id ? (
                                    <button 
                                      onClick={() => setEditingRecordId(null)}
                                      className="text-slate-400 hover:text-slate-600 font-bold ml-2"
                                    >
                                      Cancel
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setEditingRecordId(log._id);
                                        setNewStatusValue(log.status);
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 font-bold ml-2"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
