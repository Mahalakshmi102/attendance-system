import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Shield, Search,
  TrendingUp, Award, UserCog, Mail, Phone, Calendar, MessagesSquare, History, Plus,
  FileCheck2, Check, X, ShieldAlert, ArrowLeft, Eye, Clock, Trash, AlertTriangle, Send
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import StudentDetailsView from '../admin/StudentDetailsView';
import StudentModal from '../admin/StudentModal';

export default function AdvisorDashboardView({ faculty }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('overview');
  
  // Roster, stats and details
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Local Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Student Modal Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  // Counseling Records
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    student: '',
    type: 'Counseling',
    title: '',
    description: '',
    status: 'Open',
    actionTaken: '',
    remarks: '',
    isEscalatedToHOD: false,
    escalationRemarks: '',
    parentName: '',
    parentMobile: ''
  });

  // Communications
  const [communications, setCommunications] = useState([]);
  const [loadingComms, setLoadingComms] = useState(false);
  const [commForm, setCommForm] = useState({
    recipient: '',
    recipientType: 'ClassBroadcast',
    type: 'Announcement',
    subject: '',
    content: '',
    isHODEscalation: false
  });

  // Leaves & Correction Requests
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Class Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [faculty]);

  useEffect(() => {
    if (activeSubTab === 'counseling') {
      fetchRecords();
    } else if (activeSubTab === 'communications') {
      fetchCommunications();
    } else if (activeSubTab === 'leaves') {
      fetchRequests();
    } else if (activeSubTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      let queryStr = '';
      if (faculty?.classAdvisorDetails) {
        const adv = faculty.classAdvisorDetails;
        queryStr = `?department=${adv.department}&year=${adv.year}&semester=${adv.semester}&section=${adv.section}`;
      }
      const res = await axios.get(apiUrl(`/api/admin/advisor/stats${queryStr}`), {
        headers: withAuthHeader()
      });
      setStatsData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch advisor statistics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const res = await axios.get(apiUrl('/api/admin/advisor/records'), {
        headers: withAuthHeader()
      });
      setRecords(res.data);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchCommunications = async () => {
    try {
      setLoadingComms(true);
      const res = await axios.get(apiUrl('/api/admin/advisor/communications'), {
        headers: withAuthHeader()
      });
      setCommunications(res.data);
    } catch (err) {
      console.error('Error fetching communications:', err);
    } finally {
      setLoadingComms(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await axios.get(apiUrl('/api/requests'), {
        headers: withAuthHeader()
      });
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      let queryStr = '';
      if (faculty?.classAdvisorDetails) {
        const adv = faculty.classAdvisorDetails;
        queryStr = `?department=${adv.department}&year=${adv.year}&semester=${adv.semester}&section=${adv.section}`;
      }
      const res = await axios.get(apiUrl(`/api/admin/advisor/audit-logs${queryStr}`), {
        headers: withAuthHeader()
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // CSV Export
  const handleExportRoster = () => {
    if (!statsData?.defaulters) return;
    const csvRows = [
      ['Register No.', 'Student Name', 'Attendance %', 'Total Periods', 'Attended Periods', 'Status']
    ];

    const allStudents = [...(statsData.defaulters || []), ...(statsData.atRisk || [])];
    
    // We can also fetch the whole list of students by calling directory or mapping from statsData
    // Let's export all students mapped in statsData
    const mappedExporters = [];
    const idsAdded = new Set();

    const addStudentToExport = (s, status) => {
      if (!idsAdded.has(s._id)) {
        idsAdded.add(s._id);
        mappedExporters.push([
          s.registerNumber || '',
          s.name || '',
          `${s.attendancePercentage}%`,
          s.totalClasses || 0,
          s.classesAttended || 0,
          status
        ]);
      }
    };

    statsData.defaulters.forEach(s => addStudentToExport(s, 'Defaulter (<75%)'));
    statsData.atRisk.forEach(s => addStudentToExport(s, 'At Risk (75-80%)'));

    csvRows.push(...mappedExporters);

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `advised_class_directory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Counseling/Mentorship Log
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      await axios.post(apiUrl('/api/admin/advisor/records'), recordForm, {
        headers: withAuthHeader()
      });
      alert('Record added successfully.');
      setIsRecordModalOpen(false);
      setRecordForm({
        student: '', type: 'Counseling', title: '', description: '', status: 'Open',
        actionTaken: '', remarks: '', isEscalatedToHOD: false, escalationRemarks: '',
        parentName: '', parentMobile: ''
      });
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating record.');
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this counseling log?')) return;
    try {
      await axios.delete(apiUrl(`/api/admin/advisor/records/${id}`), {
        headers: withAuthHeader()
      });
      alert('Record deleted successfully.');
      fetchRecords();
    } catch (err) {
      alert('Error deleting record.');
    }
  };

  // Submit Communication
  const handleSendCommunication = async (e) => {
    e.preventDefault();
    try {
      await axios.post(apiUrl('/api/admin/advisor/communications'), commForm, {
        headers: withAuthHeader()
      });
      alert('Announcement/Notification sent successfully.');
      setCommForm({
        recipient: '', recipientType: 'ClassBroadcast', type: 'Announcement',
        subject: '', content: '', isHODEscalation: false
      });
      fetchCommunications();
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending message.');
    }
  };

  // Approve / Reject Leave requests
  const handleReviewRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.put(apiUrl(`/api/requests/${selectedRequest._id}/review`), {
        status: reviewStatus,
        reviewRemarks
      }, {
        headers: withAuthHeader()
      });
      alert(`Request has been ${reviewStatus.toLowerCase()} successfully.`);
      setRemarksModalOpen(false);
      fetchRequests();
      fetchStats(); // Update stats list since leave approval modifies attendance statuses
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating request.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-bold">Compiling advised class statistics & directories...</p>
      </div>
    );
  }

  if (error || !statsData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-center max-w-xl mx-auto my-10 p-8 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-rose-800">Error Accessing Advisor Dashboard</h3>
        <p className="text-rose-600 font-semibold mt-2">{error || 'Class Advisor Details are missing or invalid.'}</p>
      </div>
    );
  }

  const { classDetails, statistics, defaulters, atRisk, topPerforming, pendingLeaves, attendanceTrends } = statsData;

  // Filter records
  const displayRecords = faculty 
    ? records.filter(r => String(r.advisor?._id || r.advisor?.id || r.advisor) === String(faculty._id || faculty.id))
    : records;

  // Filter communications
  const displayCommunications = faculty
    ? communications.filter(c => String(c.sender?._id || c.sender?.id || c.sender) === String(faculty._id || faculty.id))
    : communications;

  // Filter requests
  const displayRequests = faculty?.classAdvisorDetails
    ? requests.filter(req => {
        const reqStud = req.requestedBy || {};
        if (String(reqStud._id || reqStud.id) === String(faculty._id || faculty.id)) {
          return true;
        }
        const adv = faculty.classAdvisorDetails;
        return reqStud.role === 'Student' &&
          String(reqStud.department).toLowerCase() === String(adv.department).toLowerCase() &&
          String(reqStud.year) === String(adv.year) &&
          String(reqStud.semester) === String(adv.semester) &&
          String(reqStud.section).toLowerCase() === String(adv.section).toLowerCase();
      })
    : requests;

  // Compile full roster list
  const fullRoster = [];
  const addedIds = new Set();
  const addStudentToRoster = (s, category) => {
    if (!addedIds.has(s._id.toString())) {
      addedIds.add(s._id.toString());
      fullRoster.push({ ...s, category });
    }
  };
  defaulters.forEach(s => addStudentToRoster(s, 'Defaulter'));
  atRisk.forEach(s => addStudentToRoster(s, 'At-Risk'));

  // Local filtering
  const filteredRoster = fullRoster.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || 
      (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q));
  });

  // Recharts attendance trends formatting
  const chartData = attendanceTrends.map(t => {
    const d = new Date(t.date);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      name: dateFormatted,
      'Attendance %': t.percentage
    };
  });

  // If student profile details is active
  if (selectedStudentId) {
    return (
      <StudentDetailsView 
        studentId={selectedStudentId} 
        onBack={() => setSelectedStudentId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Advisor Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Advised Class Monitor</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Class Advisor Dashboard</h2>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Section: {classDetails.department} - Year {classDetails.year} | Sem {classDetails.semester} | Sec {classDetails.section}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportRoster}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition shadow-lg backdrop-blur-sm text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Class Roster
          </button>
          <button 
            onClick={fetchStats}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 hover:bg-slate-50 font-bold rounded-xl transition shadow-lg text-sm"
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-6 py-1.5 rounded-2xl shadow-sm flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Stats & Trends', icon: TrendingUp },
          { id: 'students', label: 'Students Directory', icon: Users },
          { id: 'leaves', label: `Pending Approvals (${statistics.pendingLeavesCount})`, icon: FileCheck2 },
          { id: 'communications', label: 'Message & Alerts', icon: MessagesSquare },
          { id: 'counseling', label: 'Counseling & Mentorship', icon: ShieldAlert },
          { id: 'audit', label: 'Section Audit Logs', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition text-xs ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW & TRENDS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Students</span>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{statistics.totalStudents}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Enrolled</p>
              </div>
            </div>

            {/* Attendance % */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Class Attendance</span>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{statistics.classAttendancePercentage}%</p>
                <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Average rate</p>
              </div>
            </div>

            {/* Defaulters Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-rose-50 p-3 rounded-xl text-rose-600"><XCircle className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Defaulters (&lt;75%)</span>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{statistics.defaultersCount}</p>
                <p className="text-[10px] font-semibold text-rose-500 mt-0.5">Critical list</p>
              </div>
            </div>

            {/* At-Risk Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">At Risk (75%-80%)</span>
                <p className="text-2xl font-black text-amber-600 mt-0.5">{statistics.atRiskCount}</p>
                <p className="text-[10px] font-semibold text-amber-500 mt-0.5">Warning list</p>
              </div>
            </div>

            {/* Pending Leave Requests */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition duration-200">
              <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><FileCheck2 className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pending Leaves</span>
                <p className="text-2xl font-black text-purple-600 mt-0.5">{statistics.pendingLeavesCount}</p>
                <p className="text-[10px] font-semibold text-purple-500 mt-0.5">Awaiting review</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts Attendance Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-slate-800">Class Attendance Trend</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Aggregate attendance percentage over the last 10 working days.</p>
              </div>
              <div className="h-[300px] w-full min-w-0 relative">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #f1f5f9',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="Attendance %" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 1 }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic">No attendance trend logged.</div>
                )}
              </div>
            </div>

            {/* Top Performers Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-slate-800">Top Performing Students</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Highest academic performers based on average subject marks.</p>
              </div>
              <div className="flex-1 divide-y divide-slate-100">
                {topPerforming.map((student, idx) => (
                  <div key={student._id} className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{student.registerNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-600">{student.averageMark}%</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Average mark</p>
                    </div>
                  </div>
                ))}
                {topPerforming.length === 0 && (
                  <div className="flex items-center justify-center h-full text-slate-400 italic py-20">No student grades seeded.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENTS DIRECTORY */}
      {activeSubTab === 'students' && (
        <div className="space-y-6">
          {/* Search Directory Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
              <input 
                type="text" 
                placeholder="Search students by Name, Reg No..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Roster Category:</span>
              <span className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">Defaulters ({defaulters.length})</span>
              <span className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold">At-Risk ({atRisk.length})</span>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">Register No.</th>
                    <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">Student Name</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Attendance %</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Roster Category</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Attended Periods</th>
                    <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Parent Details</th>
                    <th className="p-4 font-bold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map(s => {
                    const isDefaulter = s.attendancePercentage < 75;
                    return (
                      <tr key={s._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 font-mono">{s.registerNumber || '-'}</td>
                        <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                          <span 
                            onClick={() => setSelectedStudentId(s._id)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition font-bold"
                          >
                            {s.name}
                          </span>
                        </td>
                        <td className="p-4 border-r border-slate-100 align-middle">
                          <span className={`font-black text-sm ${isDefaulter ? 'text-rose-600' : 'text-amber-600'}`}>
                            {s.attendancePercentage}%
                          </span>
                        </td>
                        <td className="p-4 border-r border-slate-100">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isDefaulter ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {isDefaulter ? 'Defaulter' : 'At-Risk'}
                          </span>
                        </td>
                        <td className="p-4 border-r border-slate-100 text-slate-600 font-medium">
                          {s.classesAttended} / {s.totalClasses}
                        </td>
                        <td className="p-4 border-r border-slate-100 text-left">
                          <div className="text-xs font-semibold text-slate-700">Name: {s.parentName || '-'}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Mob: {s.parentMobile || '-'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button 
                              onClick={() => setSelectedStudentId(s._id)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl border border-indigo-100/50 text-xs flex items-center gap-1.5 transition shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Academics
                            </button>
                            <button 
                              onClick={() => { setEditStudent(s); setIsModalOpen(true); }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl border border-slate-200 text-xs flex items-center gap-1.5 transition shadow-sm"
                            >
                              <UserCog className="w-3.5 h-3.5" /> Edit Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRoster.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-slate-400 italic font-semibold">No students matching the filter found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. LEAVE APPROVALS */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800">Pending Leave & Correction Requests</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Review and approve/reject leave applications submitted by students in your advised class.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingRequests ? (
              <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">Student Name</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Request Type</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Reason</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Dates / Details</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100">Status</th>
                      <th className="p-4 font-bold text-slate-700">Advisor Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayRequests.map(req => {
                      const reqStud = req.requestedBy || {};
                      return (
                        <tr key={req._id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                            <div>{reqStud.name || 'Unknown Student'}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{reqStud.registerNumber || '-'}</div>
                          </td>
                          <td className="p-4 border-r border-slate-100 align-middle">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              req.targetModel === 'Leave' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {req.targetModel}
                            </span>
                          </td>
                          <td className="p-4 border-r border-slate-100 text-slate-600 max-w-[200px] truncate text-left" title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="p-4 border-r border-slate-100 text-slate-600 font-medium">
                            {req.targetModel === 'Leave' ? (
                              <span>
                                {req.newValue?.startDate ? new Date(req.newValue.startDate).toLocaleDateString() : '-'} to {req.newValue?.endDate ? new Date(req.newValue.endDate).toLocaleDateString() : '-'}
                                <div className="text-[10px] text-purple-500 font-bold mt-0.5">{req.newValue?.leaveType || 'General'} Leave</div>
                              </span>
                            ) : (
                              <span>
                                Correction to status: <strong className="text-indigo-600 uppercase">{req.newValue}</strong>
                              </span>
                            )}
                          </td>
                          <td className="p-4 border-r border-slate-100">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {req.status === 'Pending' ? (
                              <button 
                                onClick={() => { setSelectedRequest(req); setReviewStatus('Approved'); setReviewRemarks(''); setRemarksModalOpen(true); }}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition text-xs flex items-center gap-1 mx-auto shadow shadow-indigo-100"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" /> Review Application
                              </button>
                            ) : (
                              <div className="text-xs text-slate-400 font-semibold italic">Reviewed by {req.reviewedBy?.name || 'Staff'}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {displayRequests.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-10 text-center text-slate-400 italic font-semibold">No pending leaves or correction requests registered for your class.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. COMMUNICATIONS CENTER */}
      {activeSubTab === 'communications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispatch Notice form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-base font-extrabold text-slate-800">Dispatch Announcement or Warnings</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Send broadcasts or warnings to students and parents.</p>
            </div>
            
            <form onSubmit={handleSendCommunication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Recipient Scope</label>
                <select 
                  value={commForm.recipientType}
                  onChange={e => setCommForm(prev => ({ 
                    ...prev, 
                    recipientType: e.target.value,
                    recipient: e.target.value === 'ClassBroadcast' ? '' : prev.recipient 
                  }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                >
                  <option value="ClassBroadcast">All Students (Class Broadcast)</option>
                  <option value="Student">Individual Student</option>
                  <option value="Parent">Student Parent / Guardian</option>
                  <option value="HOD">Forward / Escalate concern to HOD</option>
                </select>
              </div>

              {commForm.recipientType !== 'ClassBroadcast' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select Student</label>
                  <select 
                    required
                    value={commForm.recipient}
                    onChange={e => setCommForm(prev => ({ ...prev, recipient: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                  >
                    <option value="">Select Student from Roster</option>
                    {fullRoster.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.registerNumber})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Notification Type</label>
                <select 
                  value={commForm.type}
                  onChange={e => setCommForm(prev => ({ 
                    ...prev, 
                    type: e.target.value,
                    isHODEscalation: e.target.value === 'HODEscalation' ? true : prev.isHODEscalation 
                  }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                >
                  <option value="Announcement">Announcement / General Notice</option>
                  <option value="AttendanceWarning">Attendance Warning (Low Attendance Alert)</option>
                  <option value="AcademicReminder">Academic Performance Reminder</option>
                  <option value="MeetingNotice">Parent-Teacher Meeting Notice</option>
                  <option value="ExamSchedule">Exam Schedule Bulletin</option>
                  <option value="AssignmentNotification">Assignment & Grievance Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Subject Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Critical: Attendance Defaulter Warning Letter"
                  value={commForm.subject}
                  onChange={e => setCommForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Message Body / Content</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Type details here..."
                  value={commForm.content}
                  onChange={e => setCommForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                ></textarea>
              </div>

              {commForm.recipientType === 'HOD' && (
                <div className="flex items-center mt-2 bg-purple-50 border border-purple-100 p-3 rounded-lg">
                  <input 
                    type="checkbox"
                    id="isHODEscalation"
                    checked={commForm.isHODEscalation}
                    onChange={e => setCommForm(prev => ({ ...prev, isHODEscalation: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded border-gray-300"
                  />
                  <label htmlFor="isHODEscalation" className="ml-2 text-xs font-bold text-purple-800">
                    Escalate this as an official disciplinary report
                  </label>
                </div>
              )}

              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition shadow-md shadow-indigo-200 text-sm"
              >
                <Send className="w-4 h-4" /> Send Communications
              </button>
            </form>
          </div>

          {/* Historical Logs */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[580px] overflow-hidden">
            <div className="mb-4 pb-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Communication Logs</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Logs of all broadcasts and warnings sent by this Class Advisor.</p>
              </div>
              <button onClick={fetchCommunications} className="text-xs font-bold text-indigo-600 hover:underline">Refresh Logs</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {loadingComms ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
              ) : (
                displayCommunications.map(comm => (
                  <div key={comm._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs hover:shadow-sm transition">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        comm.type === 'AttendanceWarning' ? 'bg-rose-500 text-white' :
                        comm.type === 'MeetingNotice' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                      }`}>
                        {comm.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="font-extrabold text-slate-800 text-sm">{comm.subject}</div>
                    
                    <p className="text-slate-600 font-medium leading-relaxed bg-white border border-slate-100 p-2.5 rounded-lg">{comm.content}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 text-[10px] text-slate-500 font-bold border-t border-slate-200/50">
                      <div>Sender: <span className="text-slate-700">{comm.sender?.name}</span></div>
                      <div>Recipient Scope: <span className="text-indigo-600">{comm.recipientType}</span></div>
                      {comm.recipient && (
                        <div>Target Student: <span className="text-slate-700">{comm.recipient?.name} ({comm.recipient?.registerNumber})</span></div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {displayCommunications.length === 0 && !loadingComms && (
                <div className="text-center py-32 text-slate-400 italic font-semibold">No communications dispatched yet. Use the sidebar form to broadcast announcements.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. COUNSELING & MENTORSHIP LOGS */}
      {activeSubTab === 'counseling' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Counseling Logs & Mentorship Journals</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Maintain grievance logs, parent meeting agendas, mentorship records, and counseling diaries for class students.</p>
            </div>
            <button 
              onClick={() => setIsRecordModalOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-100 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Counseling Record
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loadingRecords ? (
              <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              displayRecords.map(record => (
                <div key={record._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        record.type === 'Counseling' ? 'bg-emerald-500 text-white' :
                        record.type === 'ParentMeeting' ? 'bg-purple-50 text-white' :
                        record.type === 'Grievance' ? 'bg-sky-500 text-white' :
                        record.type === 'Mentorship' ? 'bg-indigo-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {record.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        record.status === 'Open' ? 'bg-amber-100 text-amber-700' :
                        record.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {record.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">
                        Logged on {new Date(record.date).toLocaleDateString()}
                      </span>
                      
                      {record.isEscalatedToHOD && (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-black uppercase border border-rose-100 animate-pulse">
                          Escalated to HOD
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-slate-800">{record.title}</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Student: <strong className="text-indigo-600">{record.student?.name} ({record.student?.registerNumber})</strong>
                    </p>
                    <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50 border p-3 rounded-xl">{record.description}</p>
                    
                    {record.actionTaken && (
                      <div className="text-xs text-slate-600 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                        <strong className="text-emerald-800">Action Taken:</strong> {record.actionTaken}
                      </div>
                    )}

                    {record.remarks && (
                      <div className="text-xs text-slate-500 italic">
                        <strong>Advisor Remarks:</strong> {record.remarks}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 min-w-[120px]">
                    <button 
                      onClick={() => handleDeleteRecord(record._id)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 hover:text-rose-700 font-bold rounded-xl transition text-xs flex items-center gap-1.5"
                    >
                      <Trash className="w-3.5 h-3.5" /> Delete Entry
                    </button>
                  </div>
                </div>
              ))
            )}

            {displayRecords.length === 0 && !loadingRecords && (
              <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="text-base font-bold text-slate-800">No Counseling Logs Registered</h4>
                <p className="text-xs text-slate-400 font-medium mt-1">Logs for counseling sessions and mentorship journals will show up here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. CLASS AUDIT TRAILS */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800">Class Section Audit Logs</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Chronological ledger detailing all administrative edits and modifications performed on your class section students.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loadingAudit ? (
              <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 font-mono text-xs uppercase">Time</th>
                      <th className="p-4 font-bold text-slate-700 text-left border-r border-slate-100 font-mono text-xs uppercase">Performed By</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100 font-mono text-xs uppercase">Action</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100 font-mono text-xs uppercase">Target Student</th>
                      <th className="p-4 font-bold text-slate-700 border-r border-slate-100 font-mono text-xs uppercase">Log Details</th>
                      <th className="p-4 font-bold text-slate-700 font-mono text-xs uppercase">Modification Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-xs">
                    {auditLogs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-bold text-slate-500 text-left border-r border-slate-100/50 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-extrabold text-slate-700 text-left border-r border-slate-100/50">
                          <div>{log.performedByName || 'System'}</div>
                          <div className="text-[10px] text-indigo-500 font-bold tracking-wider mt-0.5">{log.performedByRole || 'System'}</div>
                        </td>
                        <td className="p-4 border-r border-slate-100/50 text-indigo-600 font-extrabold text-center">
                          {log.action}
                        </td>
                        <td className="p-4 border-r border-slate-100/50 font-bold text-slate-800 text-left">
                          {log.student ? (
                            <span>{log.student.name} <br/> <strong className="text-[10px] text-slate-400 font-semibold">{log.student.registerNumber}</strong></span>
                          ) : (
                            <span className="text-slate-400 italic">Global / Section</span>
                          )}
                        </td>
                        <td className="p-4 border-r border-slate-100/50 text-left max-w-[250px] truncate" title={log.details}>
                          {log.details || '-'}
                        </td>
                        <td className="p-4 text-left font-semibold text-rose-700 max-w-[200px] truncate" title={log.reason}>
                          {log.reason || '-'}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-10 text-center text-slate-400 italic font-semibold">No audit logs registered for this section.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Approval Modal */}
      {remarksModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold">Review Leave Request</h3>
                <p className="text-[11px] text-slate-300 font-semibold mt-0.5">Approve or reject leave for {selectedRequest.requestedBy?.name}</p>
              </div>
              <button 
                onClick={() => setRemarksModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewRequest} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Student Name</span>
                  <span className="font-extrabold text-slate-700">{selectedRequest.requestedBy?.name}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Leave Type</span>
                  <span className="font-extrabold text-slate-700">{selectedRequest.newValue?.leaveType || 'General'}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Leave Dates</span>
                  <span className="font-black text-indigo-600">{new Date(selectedRequest.newValue?.startDate).toLocaleDateString()} to {new Date(selectedRequest.newValue?.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col text-xs font-semibold text-slate-500 pt-1.5 border-t border-slate-200/50">
                  <span>Reason for Leave</span>
                  <span className="font-bold text-slate-700 mt-1 italic">{selectedRequest.reason}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Review Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setReviewStatus('Approved')}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition ${
                      reviewStatus === 'Approved' 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4" /> Approve Leave
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReviewStatus('Rejected')}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition ${
                      reviewStatus === 'Rejected' 
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/10' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-4 h-4" /> Reject Leave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase font-sans">Review Remarks</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Leave approved per parent confirmation."
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <button 
                  type="button"
                  onClick={() => setRemarksModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counseling Record Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold">Add Class Advisor Record</h3>
                <p className="text-[11px] text-slate-300 font-semibold mt-0.5">Log counseling, parent meetings, grievances, or interventions.</p>
              </div>
              <button 
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Select Student</label>
                  <select 
                    required
                    value={recordForm.student}
                    onChange={e => setRecordForm(prev => ({ ...prev, student: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                  >
                    <option value="">Select Student</option>
                    {fullRoster.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.registerNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Record Type</label>
                  <select 
                    value={recordForm.type}
                    onChange={e => setRecordForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                  >
                    <option value="Counseling">Counseling Session</option>
                    <option value="ParentMeeting">Parent Meeting Log</option>
                    <option value="Grievance">Student Grievance Tracking</option>
                    <option value="Mentorship">Mentorship Journal</option>
                    <option value="Intervention">Academic Intervention Report</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Record Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Session regarding attendance improvement and guidance"
                  value={recordForm.title}
                  onChange={e => setRecordForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase font-sans">Detailed Description</label>
                <textarea 
                  required
                  rows="3"
                  placeholder="Describe the discussion details, actions advised, and notes..."
                  value={recordForm.description}
                  onChange={e => setRecordForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                ></textarea>
              </div>

              {recordForm.type === 'ParentMeeting' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Parent Name</label>
                    <input 
                      type="text"
                      placeholder="Name"
                      value={recordForm.parentName}
                      onChange={e => setRecordForm(prev => ({ ...prev, parentName: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Parent Contact</label>
                    <input 
                      type="text"
                      placeholder="Contact No"
                      value={recordForm.parentMobile}
                      onChange={e => setRecordForm(prev => ({ ...prev, parentMobile: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase font-sans">Action Advised / Remarks</label>
                <input 
                  type="text"
                  placeholder="e.g. Student committed to attend classes regularly."
                  value={recordForm.actionTaken}
                  onChange={e => setRecordForm(prev => ({ ...prev, actionTaken: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold"
                />
              </div>

              <div className="flex items-center mt-2 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                <input 
                  type="checkbox"
                  id="isEscalatedToHOD"
                  checked={recordForm.isEscalatedToHOD}
                  onChange={e => setRecordForm(prev => ({ ...prev, isEscalatedToHOD: e.target.checked }))}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500 rounded border-gray-300"
                />
                <label htmlFor="isEscalatedToHOD" className="ml-2 text-xs font-bold text-rose-800">
                  Escalate this journal note directly to HOD dashboard review
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <button 
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditStudent(null); }}
        studentToEdit={editStudent}
        onSuccess={() => { setIsModalOpen(false); setEditStudent(null); fetchStats(); }}
        departmentOnly={true}
      />
    </div>
  );
}
