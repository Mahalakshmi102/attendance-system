import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../api/http';
import { useAuth } from '../context/AuthContext';
import StudentDetailsView from '../components/admin/StudentDetailsView';
import NotificationBell from '../components/NotificationBell';
import { 
  GraduationCap, BookOpen, Calculator, Bell, LogOut, AlertTriangle, TrendingUp, 
  FileText, Calendar, Plus, CheckCircle2, XCircle, Clock, RefreshCw, Sparkles,
  MapPin, Check, X, ShieldAlert, Award, FileSpreadsheet, Eye, Mail, Phone, ExternalLink,
  Menu, CheckSquare
} from 'lucide-react';

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  
  // Real Database States
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState([]);
  const [overallAttendance, setOverallAttendance] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Timetable Schedules
  const [timetable, setTimetable] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Academic Calendar
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Notifications Alert Center
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Leave request forms & history
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'Sick',
    reason: '',
    proofImage: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchMyAttendance();
      fetchTimetable();
      fetchCalendar();
      fetchNotifications();
    }
  }, [user?.id, user?.department, user?.year, user?.semester, user?.section]);

  useEffect(() => {
    if (activeTab === 'leave') {
      fetchMyRequests();
    }
  }, [activeTab]);

  // 1. Fetch Student Attendance summary
  const fetchMyAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const res = await axios.get(apiUrl('/api/attendance/my-attendance'), {
        headers: withAuthHeader()
      });
      
      const records = res.data.records || [];
      setAttendanceRecords(records);

      // Group and calculate subject percentage
      const summaryMap = res.data.summary || {};
      const subjectList = Object.keys(summaryMap).map(subjId => {
        const sub = summaryMap[subjId];
        const total = sub.total;
        const present = sub.present;
        const late = sub.late;
        const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        return {
          subject: sub.subject,
          present,
          total,
          percent: pct
        };
      });
      setSubjectAnalytics(subjectList);

      // Aggregate overall percentage
      let totalPresent = 0;
      let totalClasses = records.length;
      records.forEach(r => {
        if (['Present', 'Late', 'On-Duty'].includes(r.status)) {
          totalPresent++;
        }
      });
      setPresentCount(totalPresent);
      setTotalCount(totalClasses);
      
      const overallPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
      setOverallAttendance(overallPct);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // 2. Fetch Student Timetable Schedule matching their class
  const fetchTimetable = async () => {
    try {
      setLoadingTimetable(true);
      const res = await axios.get(apiUrl('/api/admin/timetable'), {
        headers: withAuthHeader()
      });
      
      // Filter for exact student CSE/IT section class
      const studentClass = res.data.filter(t => 
        t.department === user.department &&
        String(t.year) === String(user.year) &&
        String(t.semester) === String(user.semester) &&
        t.section === user.section
      );
      setTimetable(studentClass);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  // 3. Fetch Academic Calendar Events
  const fetchCalendar = async () => {
    try {
      setLoadingCalendar(true);
      const res = await axios.get(apiUrl('/api/admin/calendar'), {
        headers: withAuthHeader()
      });
      setCalendarEvents(res.data);
    } catch (err) {
      console.error('Failed to load academic calendar:', err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // 4. Fetch Notification center logs
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await axios.get(apiUrl('/api/admin/notifications'), {
        headers: withAuthHeader()
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load alerts log:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // 5. Fetch Student Submitted Leaves
  const fetchMyRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await axios.get(apiUrl('/api/requests'), {
        headers: withAuthHeader()
      });
      const allRequests = response.data.requests || [];
      const leaveRequests = allRequests.filter(r => r.targetModel === 'Leave');
      setRequests(leaveRequests);
    } catch (err) {
      console.error('Failed to fetch leave history', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  // 6. Submit Leave form
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      setFormError('Start date must be before or equal to end date.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        targetModel: 'Leave',
        reason: leaveForm.reason,
        newValue: {
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          leaveType: leaveForm.leaveType,
          proofImage: leaveForm.proofImage
        }
      };

      await axios.post(apiUrl('/api/requests'), payload, {
        headers: withAuthHeader()
      });

      setFormSuccess('Leave request submitted successfully to your HOD & Class Advisor!');
      setLeaveForm({ startDate: '', endDate: '', leaveType: 'Sick', reason: '', proofImage: '' });
      fetchMyRequests();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Attendance Calculator Math Formulation
  // Formula: present + C / total + C >= 0.75
  // C >= 3 * total - 4 * present
  const requiredClasses = Math.max(0, Math.ceil(3 * totalCount - 4 * presentCount));

  const handleLogout = () => {
    logout();
  };

  // Render weekly class schedule timetable
  const renderTimetable = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'];

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 font-black text-slate-700 uppercase border-r border-slate-100 text-[10px]">Day</th>
                {periods.map(p => (
                  <th key={p} className="p-4 font-black text-slate-700 uppercase border-r border-slate-100 text-[10px]">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day} className="border-b border-slate-100 hover:bg-slate-50/30 transition">
                  <td className="p-4 font-extrabold text-slate-800 border-r border-slate-100 bg-slate-50/20 text-[10px] text-left">{day}</td>
                  {periods.map(period => {
                    const slot = timetable.find(t => t.dayOfWeek === day && t.period === period);
                    return (
                      <td key={period} className="p-3 border-r border-slate-100 min-w-[130px] align-top">
                        {slot ? (
                          <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 text-left space-y-1 relative group hover:shadow-sm transition">
                            <p className="text-[11px] font-black text-emerald-800 leading-tight">
                              {slot.subject?.name || 'Subject'}
                            </p>
                            <p className="text-[9px] text-emerald-600 font-bold uppercase">
                              {slot.classroom}
                            </p>
                            <p className="text-[8px] text-slate-400 font-mono font-bold mt-1">
                              {slot.startTime} - {slot.endTime}
                            </p>
                            <p className="text-[8px] text-indigo-600 font-bold mt-1.5 italic">
                              Staff: {slot.faculty?.name}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-extrabold">-</span>
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

  // Render today's timetable list
  const renderTodayTimetableList = () => {
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const todaySlots = timetable.filter(t => t.dayOfWeek === today).sort((a, b) => a.period.localeCompare(b.period));

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[260px]">
        <h3 className="font-extrabold text-slate-805 text-sm border-b pb-3 mb-4 flex justify-between items-center">
          <span>Today's Class Schedule ({today})</span>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            {todaySlots.length} Classes
          </span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {todaySlots.map((slot, idx) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs hover:shadow-sm transition">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded text-[9px]">
                  {slot.period}
                </span>
                <p className="font-extrabold text-slate-700 mt-1">{slot.subject?.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{slot.classroom} | Staff: {slot.faculty?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-mono font-bold">{slot.startTime} - {slot.endTime}</p>
              </div>
            </div>
          ))}
          {todaySlots.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs py-10 font-bold gap-2">
              <span>No classes scheduled for today.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: 'overview', label: 'My Attendance', icon: TrendingUp },
    { id: 'timetable', label: 'Timetable Schedule', icon: Clock },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'calculator', label: 'Attendance Calculator', icon: Calculator },
    { id: 'leave', label: 'Leave Requests', icon: FileText },
    { id: 'alerts', label: `Alerts Center (${notifications.length})`, icon: Bell },
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
              <p className="text-[10px] text-emerald-600 font-extrabold tracking-wide uppercase mt-0.5">Student Portal</p>
            </div>
          </div>
          {/* Close button for mobile sidebar */}
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-extrabold transition-all duration-200 text-xs ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
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
            {/* Hamburger Toggle */}
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
                {menuItems.find(i => i.id === activeTab)?.label}
              </span>
            </div>
            
            {/* Page title on Desktop View */}
            <div className="hidden lg:block">
              <h2 className="text-lg md:text-2xl font-black text-slate-800 leading-tight">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="hidden sm:block text-xs text-slate-400 font-semibold mt-0.5">
                Welcome back, <strong className="text-slate-700">{user?.name}</strong>! Section: {user?.department} - Year {user?.year} (Sem {user?.semester}) Section {user?.section}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <NotificationBell onViewAll={() => setActiveTab('alerts')} />
             <div className="flex items-center gap-2 md:gap-3 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 shadow-sm">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  {user?.name?.charAt(0) || 'S'}
                </div>
                <div className="text-right">
                  <p className="text-[10px] md:text-xs font-black text-slate-800 leading-tight">
                    {user?.name || 'Student'}
                  </p>
                  <p className="text-[8px] md:text-[10px] text-emerald-600 font-black uppercase tracking-wider leading-none">
                    Reg: {user?.registerNumber || 'N/A'}
                  </p>
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 pb-20 md:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto pb-10 space-y-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Warning bar */}
                {overallAttendance < 75 && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm flex gap-3 items-start animate-pulse">
                     <AlertTriangle className="text-rose-600 w-6 h-6 shrink-0 mt-0.5" />
                     <div>
                        <h4 className="font-extrabold text-rose-800 text-xs uppercase tracking-wider">Critical Attendance Warning</h4>
                        <p className="text-rose-700 text-xs font-semibold mt-1">Your aggregate attendance percentage ({overallAttendance}%) falls below the minimum 75% threshold mandated for semester exams. Please contact your Class Advisor.</p>
                     </div>
                  </div>
                )}

                <StudentDetailsView studentId={user?.id} />
              </div>
            )}

            {/* TIMETABLE TAB */}
            {activeTab === 'timetable' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Assigned Lecture Schedule Matrix</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Schedules organized for: Section {user?.section} - Year {user?.year}</p>
                  </div>
                  <button onClick={fetchTimetable} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Schedule
                  </button>
                </div>
                {renderTimetable()}
              </div>
            )}

            {/* ACADEMIC CALENDAR TAB */}
            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Academic Calendar</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Holidays, examinations, events, and assessments logs.</p>
                  </div>
                  <button onClick={fetchCalendar} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition shrink-0"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5 text-left">Date</th>
                          <th className="p-3.5 text-left">Title / Event</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {calendarEvents.map(event => (
                          <tr key={event._id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3.5 text-left font-bold text-slate-800">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="p-3.5 text-left max-w-xs truncate text-slate-600" title={event.description}>{event.title}</td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                event.type === 'Holiday' ? 'bg-rose-100 text-rose-700' :
                                event.type === 'Exam' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {event.type}
                              </span>
                            </td>
                            <td className="p-3.5 text-center text-[10px] text-slate-400 italic">
                              {event.isWorkingDay ? 'Working Day' : 'Holiday'}
                            </td>
                          </tr>
                        ))}
                        {calendarEvents.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-10 text-center text-slate-400 italic font-semibold">No calendar events published.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CALCULATOR TAB */}
            {activeTab === 'calculator' && (
              <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm max-w-2xl mx-auto text-center space-y-6">
                 <Calculator className="w-16 h-16 text-emerald-200 mx-auto" />
                 <div>
                   <h3 className="text-2xl font-black text-slate-800">Attendance Shortage Calculator</h3>
                   <p className="text-slate-500 mt-2 font-semibold text-xs max-w-md mx-auto">Calculates mathematically the consecutive present classes needed to cross the threshold.</p>
                 </div>
                 
                 <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Calculated Target Rate: 75%</p>
                    {requiredClasses > 0 ? (
                      <>
                        <p className="text-rose-600 font-extrabold text-sm uppercase tracking-wide">Shortage Flagged!</p>
                        <p className="text-2xl text-slate-700 font-black">
                          You need to attend <span className="text-5xl text-rose-500 animate-pulse">{requiredClasses}</span> continuous present classes to achieve a 75% eligibility rate.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-emerald-600 font-extrabold text-sm uppercase tracking-wide">Status: Secure!</p>
                        <p className="text-2xl text-slate-700 font-black">
                          Your attendance is currently above 75%! <br/> Keep attending classes to maintain your eligibility.
                        </p>
                      </>
                    )}
                 </div>

                 <p className="text-[10px] text-slate-400 font-bold italic">Calculation based on your current stats: Attended {presentCount} out of {totalCount} total classes.</p>
              </div>
            )}

            {/* LEAVE REQUESTS TAB */}
            {activeTab === 'leave' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Submit Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                  <h3 className="font-extrabold text-slate-800 text-sm border-b pb-3 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Apply For Leave
                  </h3>

                  {formError && (
                    <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold mb-4">
                      {formError}
                    </div>
                  )}
                  {formSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold mb-4">
                      {formSuccess}
                    </div>
                  )}

                  <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase">Leave Type</label>
                      <select 
                        required
                        value={leaveForm.leaveType}
                        onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value, proofImage: '' })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="Sick">Sick Leave</option>
                        <option value="OD">On-Duty (OD)</option>
                        <option value="Casual">Casual Leave</option>
                      </select>
                    </div>

                    {leaveForm.leaveType === 'OD' && (
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase">Upload OD Proof (Image)</label>
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLeaveForm({ ...leaveForm, proofImage: reader.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 font-bold"
                          required
                        />
                        {leaveForm.proofImage && (
                          <div className="mt-2 text-center bg-slate-50 p-2 rounded-xl border">
                            <p className="text-[10px] text-slate-400 mb-1">Preview:</p>
                            <img src={leaveForm.proofImage} alt="OD Proof Preview" className="max-h-24 mx-auto rounded-lg border shadow-sm" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase">Start Date</label>
                        <input 
                          required
                          type="date"
                          value={leaveForm.startDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-500 mb-1.5 uppercase">End Date</label>
                        <input 
                          required
                          type="date"
                          value={leaveForm.endDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 mb-1.5 uppercase">Reason for Leave</label>
                      <textarea 
                        required
                        maxLength={500}
                        rows={4}
                        placeholder="Please describe details..."
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none font-semibold text-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl uppercase transition duration-200 shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Apply Leave'}
                    </button>
                  </form>
                </div>

                {/* History List */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col h-[460px]">
                  <h3 className="font-extrabold text-slate-800 text-sm border-b pb-3 mb-4 flex justify-between items-center uppercase tracking-wider">
                    <span>Leave History Logs</span>
                    <button onClick={fetchMyRequests} className="text-xs text-emerald-600 font-bold hover:underline">Refresh List</button>
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {requestsLoading ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs py-10 animate-pulse font-bold">
                        Loading leave history...
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-16 gap-3">
                        <Clock className="w-12 h-12 text-slate-200" />
                        <p className="font-bold">No leave applications registered.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                            <tr>
                              <th className="p-3">Type</th>
                              <th className="p-3">Duration</th>
                              <th className="p-3">Reason</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Advisor Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                            {requests.map(req => (
                              <tr key={req._id} className="hover:bg-slate-50/50 transition">
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    req.newValue?.leaveType === 'Sick' 
                                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                      : req.newValue?.leaveType === 'OD' 
                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
                                    {req.newValue?.leaveType || 'General'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <p className="font-bold text-slate-800">
                                    {req.newValue?.startDate ? new Date(req.newValue.startDate).toLocaleDateString() : 'N/A'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                    to {req.newValue?.endDate ? new Date(req.newValue.endDate).toLocaleDateString() : 'N/A'}
                                  </p>
                                </td>
                                <td className="p-3 max-w-[130px] truncate text-slate-500" title={req.reason}>
                                  {req.reason}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    req.status === 'Approved' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : req.status === 'Rejected' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {req.status === 'Approved' && <Check className="w-3 h-3" />}
                                    {req.status === 'Rejected' && <X className="w-3 h-3" />}
                                    {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                                    {req.status}
                                  </span>
                                </td>
                                <td className="p-3 text-[10px] text-slate-400 italic max-w-[120px] truncate" title={req.reviewRemarks}>
                                  {req.reviewRemarks || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ALERTS AND NOTIFICATIONS TAB */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Personal Announcements & alerts center</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time alerts, class broadcasts, assignment warnings, and PTM notes dispatched by academic staff.</p>
                  </div>
                  <div className="flex gap-2">
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
                        className="px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <CheckSquare className="w-4 h-4" /> Mark all read
                      </button>
                    )}
                    <button onClick={fetchNotifications} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition shrink-0">
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[480px]">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {loadingNotifications ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs py-10 animate-pulse font-bold">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-20 gap-3">
                        <Bell className="w-12 h-12 text-slate-200" />
                        <p className="font-bold">No notifications logged.</p>
                        <p className="text-[10px] text-slate-400">All announcements will show up here.</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`p-4 rounded-xl text-xs transition border flex justify-between items-start gap-4 ${
                          n.read 
                            ? 'bg-slate-50/70 border-slate-100 opacity-85' 
                            : 'bg-white border-slate-200 border-l-4 ' + (
                                n.type === 'Alert' ? 'border-l-red-500 shadow-md shadow-red-500/5' :
                                n.type === 'Warning' ? 'border-l-amber-500 shadow-md shadow-amber-500/5' :
                                n.type === 'Success' ? 'border-l-emerald-500 shadow-md shadow-emerald-500/5' :
                                'border-l-indigo-500 shadow-md shadow-indigo-500/5'
                              )
                        }`}>
                          <div className="space-y-2 flex-1">
                            <div className="flex justify-between items-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                n.type === 'Alert' ? 'bg-red-500 text-white' :
                                n.type === 'Warning' ? 'bg-amber-500 text-white' :
                                n.type === 'Success' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
                              }`}>
                                {n.type}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono font-bold">{new Date(n.createdAt).toLocaleString()}</span>
                            </div>
                            <p className={`text-slate-800 text-sm leading-relaxed ${!n.read ? 'font-black' : 'font-medium'}`}>{n.message}</p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={async () => {
                                try {
                                  await axios.put(apiUrl(`/api/admin/notifications/${n._id}/read`), {}, {
                                    headers: withAuthHeader()
                                  });
                                  setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, read: true } : item));
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-650 transition shrink-0 self-center"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom Navigation Bar for Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-150 py-2 px-4 flex items-center justify-around z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
          {menuItems.slice(0, 3).map(item => {
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
                  isActive ? 'text-emerald-650' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 scale-105' : 'text-slate-400'}`} />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          {/* Leave tab (index 4) */}
          {(() => {
            const item = menuItems[4];
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-colors duration-200 ${
                  isActive ? 'text-emerald-650' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-650 scale-105' : 'text-slate-400'}`} />
                <span>Leave</span>
              </button>
            );
          })()}
          {/* More menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-extrabold text-slate-400 hover:text-slate-650"
          >
            <Menu className="w-5 h-5 text-slate-400" />
            <span>More</span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
