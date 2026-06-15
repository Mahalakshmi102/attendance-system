import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Mail, Phone, MapPin, Shield, BookOpen, 
  Briefcase, GraduationCap, Clock, Award, Printer, Loader2, AlertCircle,
  CheckCircle2, XCircle, AlertTriangle, History, Check, FileText, Activity,
  ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../api/http';
import { getSubjects, getTimetable, getFacultyAttendanceActivities } from '../../api/adminApi';
import AdvisorDashboardView from '../faculty/AdvisorDashboardView';

export default function FacultyDetailsView({ faculty, onBack, onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [advisorStats, setAdvisorStats] = useState(null);
  const [error, setError] = useState('');
  
  // Consolidated activities state
  const [activityData, setActivityData] = useState(null);

  // Timetable grid states (for the timetable tab)
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);

  // States for expandable session details in Attendance History
  const [expandedSessionIds, setExpandedSessionIds] = useState({});
  const [sessionDetails, setSessionDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});
  const [detailsError, setDetailsError] = useState({});

  useEffect(() => {
    fetchFacultyData();
  }, [faculty]);

  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      setError('');
      const fId = faculty?._id || faculty?.id;
      if (!fId) return;

      const [activityRes, subjectsRes, timetableRes] = await Promise.all([
        getFacultyAttendanceActivities(fId),
        getSubjects(),
        getTimetable()
      ]);

      setActivityData(activityRes.data);

      // Fetch advisor stats if class advisor
      let advStats = null;
      if (faculty.classAdvisorDetails?.isClassAdvisor) {
        try {
          const adv = faculty.classAdvisorDetails;
          const token = localStorage.getItem('token');
          const url = `${API_BASE_URL}/api/admin/advisor/stats?department=${adv.department}&year=${adv.year}&semester=${adv.semester}&section=${adv.section}`;
          const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          advStats = res.data;
        } catch (err) {
          console.error('Failed to fetch advisor stats in dossier:', err);
        }
      }
      setAdvisorStats(advStats);

      // Filter subjects assigned to this faculty member for the timetable/portfolio tab
      const assignedSubjects = subjectsRes.data.filter(sub => 
        sub.assignedFaculty && sub.assignedFaculty.some(memberId => String(memberId) === String(fId))
      );
      setSubjects(assignedSubjects);

      // Filter timetable slots handled by this faculty
      const assignedSlots = timetableRes.data.filter(slot => 
        slot.faculty && (String(slot.faculty._id) === String(fId) || String(slot.faculty.id) === String(fId))
      );
      setTimetable(assignedSlots);

    } catch (err) {
      console.error('Error fetching faculty activities:', err);
      setError('Could not retrieve full attendance compliance or timetable stats for this faculty member.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSessionExpand = async (sessionId) => {
    if (expandedSessionIds[sessionId]) {
      setExpandedSessionIds(prev => ({ ...prev, [sessionId]: false }));
      return;
    }

    setExpandedSessionIds(prev => ({ ...prev, [sessionId]: true }));

    if (sessionDetails[sessionId]) return;

    try {
      setDetailsLoading(prev => ({ ...prev, [sessionId]: true }));
      setDetailsError(prev => ({ ...prev, [sessionId]: null }));
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/attendance/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessionDetails(prev => ({ ...prev, [sessionId]: res.data }));
    } catch (err) {
      console.error('Failed to fetch session details:', err);
      setDetailsError(prev => ({ ...prev, [sessionId]: 'Failed to load details. Click retry.' }));
    } finally {
      setDetailsLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // Group timetable slots by day
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'];

  const timetableGrid = {};
  daysOfWeek.forEach(day => {
    timetableGrid[day] = {};
    periods.forEach(p => {
      timetableGrid[day][p] = null;
    });
  });

  timetable.forEach(slot => {
    if (timetableGrid[slot.dayOfWeek] && slot.period) {
      const pKey = slot.period.includes('H') ? slot.period : `H${slot.period.replace(/\D/g, '')}`;
      timetableGrid[slot.dayOfWeek][pKey] = {
        subjectCode: slot.subject?.code || 'SUB',
        subjectName: slot.subject?.name || 'Subject',
        class: `${slot.department} Y${slot.year} ${slot.section}`,
        classroom: slot.classroom || 'CR',
        time: `${slot.startTime} - ${slot.endTime}`
      };
    }
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  };

  const handleMarkSlot = (slot) => {
    if (onNavigateTab) {
      onNavigateTab('attendance', slot);
    } else {
      alert("Only the assigned faculty member can mark attendance. If you are logged in as admin, please use manual override options under logs.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
        <Loader2 className="w-10 h-10 text-indigo-650 animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-sm">Compiling faculty attendance activities and compliance audit...</p>
      </div>
    );
  }

  if (error || !activityData) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-extrabold text-slate-800">Error Loading Data</h3>
        <p className="text-slate-500 text-xs mt-2 font-semibold">{error || 'Unable to contact server.'}</p>
        <button onClick={fetchFacultyData} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
          Retry Audit
        </button>
      </div>
    );
  }

  const { stats, sessionsList, missedSubmissions, classWiseStats, correctionRequests, recentActivities } = activityData;

  const pendingList = (() => {
    if (!activityData) return [];
    const list = [];

    // 1. Add started but unlocked sessions (type: 'session')
    sessionsList.filter(s => !s.locked).forEach(s => {
      list.push({
        _id: s._id,
        date: s.date,
        period: s.period,
        subjectCode: s.subjectCode || 'N/A',
        subjectName: s.subjectName || 'N/A',
        class: s.class,
        type: 'Session Started (Pending Lock)',
        timetableId: s.timetableId,
        classroom: s.classroom || 'N/A',
        time: s.time || (s.period ? `Period ${s.period}` : 'N/A')
      });
    });

    // 2. Add missed scheduled sessions (type: 'timetable')
    missedSubmissions.forEach(m => {
      const exists = list.some(l => 
        l.timetableId === m.timetableId && 
        new Date(l.date).toDateString() === new Date(m.date).toDateString()
      );
      if (!exists) {
        list.push({
          _id: null,
          date: m.date,
          period: m.period,
          subjectCode: m.subjectCode,
          subjectName: m.subjectName,
          class: m.class,
          type: 'Missed Scheduled Class',
          timetableId: m.timetableId,
          classroom: m.classroom || 'N/A',
          time: m.time || 'N/A'
        });
      }
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  })();

  const assigned = stats.totalClassesAssigned || 0;
  const submitted = stats.submissionsCompleted || 0;
  const pending = pendingList.length;
  const conducted = submitted + pending;
  
  const completionPct = conducted > 0 ? Math.round((submitted / conducted) * 100) : 0;
  const extraClasses = conducted > assigned ? conducted - assigned : 0;
  const displayConducted = conducted;

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-4">
      {/* Print stylesheet override */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
            break-inside: avoid;
          }
        }
      `}} />

      {/* Breadcrumbs */}
      <div className="flex justify-between items-center no-print">
        {onBack ? (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-55 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" /> Back to Faculty List
          </button>
        ) : (
          <div />
        )}

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition shadow-indigo-600/15"
        >
          <Printer className="w-4.5 h-4.5" /> Print Timetable & Submission Report
        </button>
      </div>

      {/* Header Profile Badge */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] overflow-hidden print-card">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 text-indigo-300 border border-white/10 flex items-center justify-center font-extrabold text-2xl shadow-inner uppercase">
              {faculty.name?.charAt(0) || 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                <span>{faculty.department} Department</span>
                <span>•</span>
                <span className="text-white">{faculty.designation}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{faculty.name}</h2>
              <p className="text-sm font-semibold text-slate-300 mt-1">
                Faculty ID: {faculty.registerNumber || 'N/A'} | Employee ID: {faculty.employeeId || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm ${faculty.isActive !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
              {faculty.isActive !== false ? 'Account Active' : 'Account Suspended'}
            </span>
            <p className="text-[10px] font-bold text-slate-400 mt-2">Work Status: {stats.missedSubmissionsCount === 0 ? 'All Logs Submitted' : 'Pending Action'}</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap border-t border-slate-100 bg-slate-50/50 p-2 gap-1 no-print">
          {[
            { id: 'dashboard', label: 'Dashboard Overview' },
            { id: 'activities', label: 'Attendance History' },
            { id: 'compliance', label: `Pending Submissions (${pendingList.length})` },
            { id: 'timetable', label: 'Individual Timetable' },
            { id: 'requests', label: `Correction Requests (${correctionRequests.length})` },
            { id: 'performance', label: 'Reports' },
            { id: 'audit', label: 'Audit Logs' },
            ...(faculty.classAdvisorDetails?.isClassAdvisor ? [{ id: 'advisor', label: 'Advisor Features' }] : [])
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' 
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content 0: Dashboard Overview */}
      {activeTab === 'dashboard' && (() => {
        const todaySchedule = (() => {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayDayName = days[new Date().getDay()];
          const now = new Date();

          const todayTimetable = timetable.filter(slot => slot.dayOfWeek === todayDayName);

          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          
          const todaySessions = sessionsList.filter(s => {
            const sDate = new Date(s.date);
            return sDate >= todayStart && sDate <= todayEnd;
          });

          const schedule = todayTimetable.map(slot => {
            const session = todaySessions.find(s => 
              (s.timetableId && s.timetableId.toString() === slot._id?.toString()) ||
              (s.period === slot.period && s.subjectCode === slot.subject?.code)
            );

            let status = 'Upcoming';
            let sessionId = session?._id || null;
            let locked = session?.locked || false;

            const [endHour, endMin] = slot.endTime.split(':').map(Number);
            const slotEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, 0, 0);

            if (session) {
              if (session.locked) {
                status = 'Submitted';
              } else {
                status = now > slotEnd ? 'Pending' : 'Upcoming';
              }
            } else {
              status = now > slotEnd ? 'Pending' : 'Upcoming';
            }

            const dept = slot.department || faculty.department || 'CSE';
            const yr = slot.year || '1';
            const sem = slot.semester || '1';
            const sec = slot.section || 'A';
            const className = `${dept} Y${yr} Sem ${sem} Sec ${sec}`;

            return {
              timetableId: slot._id,
              period: slot.period,
              subjectCode: slot.subject?.code || 'N/A',
              subjectName: slot.subject?.name || 'N/A',
              class: className,
              startTime: slot.startTime,
              endTime: slot.endTime,
              classroom: slot.classroom,
              status,
              sessionId,
              locked
            };
          });

          return schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
        })();
        const todayHasPending = todaySchedule.some(s => s.status === 'Pending');
        
        let nextSlot = todaySchedule.find(s => s.status === 'Pending');
        if (!nextSlot) {
          nextSlot = todaySchedule.find(s => s.status === 'Upcoming');
        }
        let pendingPast = null;
        if (!nextSlot && pendingList.length > 0) {
          pendingPast = pendingList[0];
        }

        const handleMarkNextClass = () => {
          const target = nextSlot || pendingPast;
          if (target) {
            if (onNavigateTab) {
              onNavigateTab('attendance', target);
            } else {
              alert("Only the assigned faculty member can mark attendance. If you are logged in as admin, please use manual override options under logs.");
            }
          } else {
            alert("No pending or upcoming classes to mark attendance!");
          }
        };



        return (
          <div className="space-y-6">
            {/* Primary Action Hero Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg border border-indigo-800/30">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-450 animate-pulse" />
                  Next Attendance Action
                </h3>
                {nextSlot ? (
                  <p className="text-xs text-indigo-200 mt-1.5 font-semibold">
                    {nextSlot.status === 'Pending' ? 'Pending:' : 'Upcoming:'} Period {nextSlot.period} - <span className="font-extrabold text-white">{nextSlot.class ? nextSlot.class.split(' Sec ')[0] : ''} ({nextSlot.subjectCode})</span> at {nextSlot.startTime}.
                  </p>
                ) : pendingPast ? (
                  <p className="text-xs text-indigo-200 mt-1.5 font-semibold">
                    Pending Past Class: <span className="font-extrabold text-white">{pendingPast.class ? pendingPast.class.split(' Sec ')[0] : ''} ({pendingPast.subjectCode})</span> on {new Date(pendingPast.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, Period {pendingPast.period}.
                  </p>
                ) : (
                  <p className="text-xs text-indigo-100 mt-1.5 font-semibold">
                    All attendance submissions are up to date! Great job.
                  </p>
                )}
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
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Classes assigned for today.</p>
                </div>
                <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
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
                    {todaySchedule.map((slot, idx) => (
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
                              onClick={() => handleMarkSlot(slot)}
                              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition"
                            >
                              Mark Attendance
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {todaySchedule.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-slate-400 italic font-bold">
                          No classes assigned for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(!todayHasPending || pendingList.length === 0) && todaySchedule.length > 0 && (
                <div className="m-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
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
                    {pendingList.map((p, idx) => (
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
                            onClick={() => handleMarkSlot(p)}
                            className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition"
                          >
                            Mark Attendance
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingList.length === 0 && (
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
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Periods Conducted */}
                <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Periods Conducted</span>
                  <span className="text-2xl font-black text-slate-700 mt-2 block">{displayConducted}</span>
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
                <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-center flex flex-col justify-between hover:shadow-sm transition">
                  <div>
                    <span className="text-[9px] font-black text-purple-650 uppercase tracking-widest block">Completion Percentage</span>
                    <span className="text-2xl font-black text-purple-655 mt-2 block">{completionPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 border mt-2 overflow-hidden">
                    <div className="bg-purple-650 h-1.5 rounded-full transition-all duration-300" style={{ width: `${completionPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Advisor Overview */}
            {faculty.classAdvisorDetails?.isClassAdvisor && advisorStats && (
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

      {/* Tab Content 1: Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {faculty.classAdvisorDetails?.isClassAdvisor && (
              <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl shadow-sm print-card flex items-center justify-between gap-6">
                <div>
                  <h4 className="text-sm font-extrabold text-indigo-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    Appointed Class Advisor
                  </h4>
                  <p className="text-xs font-semibold text-indigo-600 mt-1">
                    Assigned as Class Advisor for {faculty.classAdvisorDetails.department} - Year {faculty.classAdvisorDetails.year} (Sem {faculty.classAdvisorDetails.semester}), Section {faculty.classAdvisorDetails.section}.
                  </p>
                </div>
                <div className="bg-indigo-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow shadow-indigo-600/10 whitespace-nowrap">
                  {faculty.classAdvisorDetails.department} Y{faculty.classAdvisorDetails.year}{faculty.classAdvisorDetails.section} Advisor
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm print-card">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b pb-3 mb-5 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-500" /> Professional Dossier
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold">
                <div className="flex justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400">Designation</span>
                  <span className="text-slate-800 font-extrabold">{faculty.designation}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400">Qualifications</span>
                  <span className="text-slate-800 font-extrabold">{faculty.qualification || 'Not provided'}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400">Teaching Experience</span>
                  <span className="text-slate-800 font-extrabold">{faculty.experience || 'Not provided'}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400">Date of Joining</span>
                  <span className="text-slate-800 font-extrabold">{formatDate(faculty.dateOfJoining)}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400">Employment Status</span>
                  <span className="text-slate-800 font-extrabold">{faculty.employmentStatus || 'Full-time'}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <span className="text-slate-400">Department</span>
                  <span className="text-slate-800 font-extrabold">{faculty.department}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm print-card">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b pb-3 mb-5 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" /> Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-semibold">
                <div className="flex items-center gap-3.5 p-3 border border-slate-100 rounded-xl">
                  <Mail className="w-4.5 h-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</span>
                    <span className="text-slate-700 font-extrabold mt-0.5 block">{faculty.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 p-3 border border-slate-100 rounded-xl">
                  <Phone className="w-4.5 h-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact Number</span>
                    <span className="text-slate-700 font-extrabold mt-0.5 block">{faculty.mobile || 'Not provided'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 p-3 border border-slate-100 rounded-xl">
                  <Calendar className="w-4.5 h-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</span>
                    <span className="text-slate-700 font-extrabold mt-0.5 block">{formatDate(faculty.dob)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 p-3 border border-slate-100 rounded-xl">
                  <MapPin className="w-4.5 h-4.5 text-slate-400" />
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Residential Address</span>
                    <span className="text-slate-700 font-extrabold mt-0.5 block">{faculty.address || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm print-card">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-3.5 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Handled Courses
              </h4>
              {subjects.length === 0 ? (
                <p className="text-slate-400 italic text-xs text-center py-6">No subjects assigned currently.</p>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {subjects.map((sub, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-start gap-4">
                      <div>
                        <span className="block text-xs font-black text-slate-800">{sub.code}</span>
                        <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">{sub.name}</span>
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-indigo-100/50 uppercase">
                        {sub.subjectType || 'Theory'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Attendance Activities */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          {/* Workload Counters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Hours Conducted */}
            <div className="p-5 rounded-2xl border text-center shadow-sm flex flex-col justify-center text-emerald-650 bg-emerald-50/50 border-emerald-100 print-card">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Hours Conducted</span>
              <span className="block text-3xl font-black mt-2">{conducted}</span>
              {extraClasses > 0 && (
                <span className="block text-[9px] font-bold text-emerald-600 mt-1">
                  includes {extraClasses} Extra Classes
                </span>
              )}
            </div>

            {/* Attendance Submitted */}
            <div className="p-5 rounded-2xl border text-center shadow-sm flex flex-col justify-center text-teal-650 bg-teal-50/50 border-teal-100 print-card">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance Submitted</span>
              <span className="block text-3xl font-black mt-2">{submitted}</span>
            </div>

            {/* Pending Attendance */}
            <div className="p-5 rounded-2xl border text-center shadow-sm flex flex-col justify-center text-amber-650 bg-amber-50/50 border-amber-100 print-card">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Attendance</span>
              <span className="block text-3xl font-black mt-2">{pending}</span>
            </div>

            {/* Overall Completion Percentage */}
            <div className="p-5 rounded-2xl border text-center shadow-sm flex flex-col justify-center text-indigo-650 bg-indigo-55/50 border-indigo-100 print-card">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Overall Completion %</span>
              <span className="block text-3xl font-black mt-2">{completionPct}%</span>
            </div>
          </div>

          {/* Conducted Sessions List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-card">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-extrabold text-slate-800">Conducted Attendance Log</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Chronological list of all attendance sessions started or locked by this faculty member.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3.5 w-10"></th>
                    <th className="p-3.5 text-left">Date / Period</th>
                    <th className="p-3.5 text-left">Class</th>
                    <th className="p-3.5 text-left">Subject</th>
                    <th className="p-3.5">Attendance status</th>
                    <th className="p-3.5">Submission Time</th>
                    <th className="p-3.5">Submission Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {sessionsList.map(s => (
                    <React.Fragment key={s._id}>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="p-3.5 text-center">
                          <button 
                            onClick={() => toggleSessionExpand(s._id)}
                            className="p-1 hover:bg-slate-100 rounded transition text-slate-400 hover:text-indigo-600"
                            title="Toggle Student Details"
                          >
                            {expandedSessionIds[s._id] ? (
                              <ChevronUp className="w-4 h-4 text-indigo-650" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3.5 text-left">
                          <span className="block font-bold text-slate-800">{new Date(s.date).toLocaleDateString()}</span>
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">Period {s.period}</span>
                        </td>
                        <td className="p-3.5 text-left">
                          <span className="block font-bold text-slate-800">{s.class || 'N/A'}</span>
                        </td>
                        <td className="p-3.5 text-left">
                          <span className="block font-bold text-slate-800">{s.subjectCode}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5">{s.subjectName}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          {s.locked ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-emerald-600 font-extrabold text-xs">{s.attendancePercentage}%</span>
                              <span className="text-[9px] text-slate-400 font-bold mt-0.5">Rate ({s.totalStudents} students)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium italic">Un-finalized</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center text-[11px] text-slate-500">
                          {s.locked ? (
                            <span className="font-medium text-slate-600">{formatDateTime(s.submissionTime)}</span>
                          ) : (
                            <span className="text-rose-500 font-black tracking-wide uppercase text-[9px]">Awaiting Lock</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.locked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {s.locked ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3 animate-spin" />}
                            {s.locked ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                      {expandedSessionIds[s._id] && (
                        <tr className="bg-slate-50/30">
                          <td colSpan="7" className="p-4 border-b border-slate-100">
                            <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm max-h-[300px] overflow-y-auto">
                              <div className="flex items-center justify-between border-b pb-2 mb-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-indigo-650" />
                                  Student Attendance Details ({s.class})
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400">
                                  Session ID: {s._id}
                                </span>
                              </div>

                              {detailsLoading[s._id] ? (
                                <div className="flex items-center justify-center py-6 gap-2 text-slate-550 font-bold text-xs">
                                  <Loader2 className="w-4 h-4 text-indigo-655 animate-spin" />
                                  Fetching attendance records...
                                </div>
                              ) : detailsError[s._id] ? (
                                <div className="text-center py-4 space-y-2">
                                  <p className="text-xs text-rose-500 font-bold">{detailsError[s._id]}</p>
                                  <button 
                                    onClick={() => {
                                      setSessionDetails(prev => {
                                        const copy = { ...prev };
                                        delete copy[s._id];
                                        return copy;
                                      });
                                      toggleSessionExpand(s._id);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition"
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : !sessionDetails[s._id] || sessionDetails[s._id].length === 0 ? (
                                <p className="text-slate-400 italic text-xs py-4 text-center">No student check-in records found for this session.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50/70 text-slate-450 font-black uppercase tracking-wider border-b border-slate-200">
                                      <tr>
                                        <th className="p-2 w-10">#</th>
                                        <th className="p-2">Register Number</th>
                                        <th className="p-2">Roll Number</th>
                                        <th className="p-2">Student Name</th>
                                        <th className="p-2 text-center">Status</th>
                                        <th className="p-2">Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                      {sessionDetails[s._id].map((record, index) => {
                                        const student = record.student || {};
                                        const isPresent = record.status === 'Present' || record.status === 'Late' || record.status === 'On-Duty' || record.status === 'On Duty';
                                        
                                        return (
                                          <tr key={record._id || index} className="hover:bg-slate-50/40">
                                            <td className="p-2 font-bold text-slate-400 font-mono">{index + 1}</td>
                                            <td className="p-2 font-mono font-bold text-slate-800">{student.registerNumber || 'N/A'}</td>
                                            <td className="p-2 font-mono text-slate-500">{student.rollNumber || 'N/A'}</td>
                                            <td className="p-2 font-extrabold text-slate-750">{student.name || 'N/A'}</td>
                                            <td className="p-2 text-center">
                                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                isPresent 
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                                              }`}>
                                                {isPresent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {record.status}
                                              </span>
                                            </td>
                                            <td className="p-2 text-slate-500 font-normal italic text-[11px] max-w-[150px] truncate" title={record.remarks}>
                                              {record.remarks || '-'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {sessionsList.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-slate-400 italic">No attendance sessions recorded in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Pending & Missed Submissions */}
      {activeTab === 'compliance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-extrabold text-slate-800">Pending & Missed Submissions</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Automated compliance trail listing started but un-locked sessions and missed classes in the last 30 days.</p>
          </div>

          <div className="p-6">
            {pendingList.length === 0 ? (
              <div className="bg-emerald-50/40 border border-emerald-100 p-8 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-extrabold text-emerald-800 text-sm uppercase">All Attendance Submitted!</h4>
                <p className="text-xs text-emerald-600 font-semibold max-w-md mx-auto">This faculty member has successfully completed and locked attendance for all scheduled classes and started sessions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 items-start">
                  <AlertTriangle className="text-rose-600 w-5.5 h-5.5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-rose-800 text-xs uppercase tracking-wider">Pending Actions Detected</h4>
                    <p className="text-rose-700 text-xs font-semibold mt-1">The system detected {pendingList.length} total pending submissions (including started sessions awaiting lock and completely missed scheduled slots) requiring attention.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-center text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-3 text-left">Date / Day</th>
                        <th className="p-3">Period / Time</th>
                        <th className="p-3 text-left">Assigned Subject</th>
                        <th className="p-3 text-left">Target Class</th>
                        <th className="p-3 text-center">Status / Type</th>
                        <th className="p-3">Room</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {pendingList.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="p-3 text-left font-bold text-slate-800">
                            {new Date(p.date).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                            <span className="block text-[9px] text-slate-400 mt-0.5">
                              {new Date(p.date).toLocaleDateString('default', { weekday: 'long' })}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-slate-800">{p.period}</span>
                            <span className="block text-[9px] text-slate-400 font-mono mt-0.5">{p.time}</span>
                          </td>
                          <td className="p-3 text-left">
                            <span className="block font-bold text-slate-800">{p.subjectCode}</span>
                            <span className="block text-[9px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={p.subjectName}>{p.subjectName}</span>
                          </td>
                          <td className="p-3 text-left font-bold text-slate-800">{p.class}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              p.type === 'Session Started (Pending Lock)' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {p.type === 'Session Started (Pending Lock)' ? 'Pending Lock' : 'Missed Class'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-600">{p.classroom}</td>
                          <td className="p-3 text-center">
                            {p.type === 'Session Started (Pending Lock)' ? (
                              <button 
                                onClick={() => handleMarkSlot(p)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition"
                              >
                                Review & Lock
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleMarkSlot(p)}
                                className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition"
                              >
                                Mark Attendance
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 4: Performance & Class Averages */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-extrabold text-slate-800">Class & Subject Averages</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Average aggregate student attendance ratios calculated across locked check-ins handled by this faculty.</p>
          </div>

          <div className="p-6">
            {classWiseStats.length === 0 ? (
              <p className="text-slate-400 italic text-xs text-center py-12">No class attendance averages compiled yet. Faculty must finalize attendance sessions first.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classWiseStats.map((stat, idx) => (
                  <div key={idx} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-3 shadow-sm hover:shadow-md transition duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-xs font-black text-indigo-700 uppercase tracking-wide block">{stat.class}</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-1 block">{stat.subject}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        stat.attendancePercentage >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        Avg: {stat.attendancePercentage}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 border rounded-full h-2">
                        <div 
                          className={`h-1.5 rounded-full ${stat.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                          style={{ width: `${stat.attendancePercentage}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-450 block text-right mt-1">Conducted: {stat.totalSessions} sessions</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: Correction Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-extrabold text-slate-800">Correction & Modification Requests</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">List of attendance overrides or marking modification logs requested by this faculty member.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3.5 text-left">Date Raised</th>
                  <th className="p-3.5 text-left">Request Target</th>
                  <th className="p-3.5 text-left">Reason / Justification</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-left">Approver Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                {correctionRequests.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5 text-left">
                      <span className="font-bold text-slate-850 block">{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(r.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="p-3.5 text-left">
                      <span className="bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded font-black uppercase text-[9px] text-slate-600 inline-block">
                        {r.targetModel}
                      </span>
                    </td>
                    <td className="p-3.5 text-left max-w-[200px] truncate text-slate-500 font-medium" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                        r.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.status === 'Approved' && <Check className="w-3 h-3" />}
                        {r.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {r.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-left">
                      {r.reviewedBy ? (
                        <>
                          <span className="block text-[10px] font-bold text-slate-700">By {r.reviewedBy?.name}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5 truncate max-w-[150px] font-semibold italic" title={r.reviewRemarks}>{r.reviewRemarks || '-'}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {correctionRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-slate-400 italic">No correction requests raised by this faculty.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 6: Timetable Schedule */}
      {activeTab === 'timetable' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-extrabold text-slate-800">Academic Teaching Schedule</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Schedules mapped directly in the central college database for active timetables.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-semibold border-collapse whitespace-nowrap table-fixed min-w-[800px]">
              <thead className="bg-slate-100/70 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider w-36 border-r border-slate-200/50">Day / Period</th>
                  {periods.map(p => (
                    <th key={p} className="p-3.5 text-slate-700 font-bold text-xs uppercase tracking-wider border-r border-slate-200/50">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-xs">
                {daysOfWeek.map((day) => (
                  <tr key={day} className="hover:bg-slate-55 transition h-[80px]">
                    <td className="p-3.5 text-left font-extrabold text-slate-700 border-r border-slate-100/50 bg-slate-50/30">{day}</td>
                    {periods.map(p => {
                      const cell = timetableGrid[day][p];
                      return (
                        <td key={p} className="p-2 border-r border-slate-100/50 align-middle">
                          {cell ? (
                            <div className="bg-indigo-50 border border-indigo-100/80 p-2.5 rounded-xl shadow-sm hover:scale-105 transition-all text-center">
                              <span className="block text-indigo-700 font-black text-[11px] leading-tight">{cell.subjectCode}</span>
                              <span className="block text-[9px] font-black text-slate-700 mt-1 leading-none">{cell.class}</span>
                              <span className="block text-[8px] font-bold text-slate-400 mt-1 leading-none">{cell.classroom}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
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
      )}

      {/* Tab Content 7: System Privileges */}
      {activeTab === 'permissions' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm print-card">
          <div className="mb-6 pb-4 border-b">
            <h3 className="text-lg font-extrabold text-slate-800">Dynamic Role Permissions</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Granular active privileges assigned to this account by System Administrators.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { key: 'mark_attendance', label: 'Mark Attendance', desc: 'Allows marking live QR/manual session records.' },
              { key: 'edit_attendance', label: 'Edit/Correct Attendance', desc: 'Allows editing previously locked attendance records.' },
              { key: 'view_analytics', label: 'View Academic Analytics', desc: 'Provides access to view class-level aggregated attendance charts.' },
              { key: 'view_reports', label: 'Generate Reports', desc: 'Allows generation and downloading of Excel attendance summaries.' },
              { key: 'manage_timetable', label: 'Manage Schedules', desc: 'Allows creating and editing timetable calendar slots.' },
              { key: 'manage_faculty', label: 'Manage Faculty/Staff', desc: 'Grants access to add, edit, or delete faculty/HOD accounts.' }
            ].map((perm) => {
              const hasPerm = faculty.permissions && faculty.permissions.includes(perm.key);
              
              return (
                <div 
                  key={perm.key} 
                  className={`p-5 rounded-2xl border flex gap-4 ${
                    hasPerm 
                      ? 'bg-emerald-50/20 border-emerald-200/80 shadow-sm' 
                      : 'bg-slate-50/30 border-slate-100 opacity-60'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border self-start ${hasPerm ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800">{perm.label}</span>
                    <span className="block text-[10px] font-semibold text-slate-400 mt-1.5 leading-normal">{perm.desc}</span>
                    <span className={`inline-block mt-3.5 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${hasPerm ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {hasPerm ? 'Active Privilege' : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 8: Logged Actions */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Faculty Audit Trail</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Chronological ledger of security and data update actions logged for this staff member.</p>
            </div>
            <Activity className="w-5 h-5 text-indigo-550" />
          </div>

          <div className="p-6">
            {recentActivities.length === 0 ? (
              <div className="text-center p-8 text-slate-400 italic text-xs font-bold">No actions logged in audit logs.</div>
            ) : (
              <div className="relative border-l border-slate-150 pl-6 space-y-6 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                {recentActivities.map((l) => (
                  <div key={l._id} className="relative">
                    <span className="absolute -left-9 top-1 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-500">
                      <History className="w-3.5 h-3.5" />
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-extrabold text-slate-800 text-[13px]">{l.action}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{formatDateTime(l.timestamp)}</span>
                      </div>
                      <p className="text-slate-500 leading-normal font-medium">{l.reason || 'Administrative update actions logged.'}</p>
                      {l.details && typeof l.details === 'string' && (
                        <div className="p-2 bg-slate-55 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-600 max-w-lg mt-1 whitespace-pre-wrap">
                          {l.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'advisor' && faculty.classAdvisorDetails?.isClassAdvisor && (
        <AdvisorDashboardView faculty={faculty} />
      )}

    </div>
  );
}
