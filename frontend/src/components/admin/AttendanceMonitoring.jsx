import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { 
  Users, CheckCircle, XCircle, Clock, 
  Upload, Download, Edit3, ChevronLeft, Search, RotateCcw,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AttendanceMonitoring({ departmentOnly }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [filters, setFilters] = useState({
    department: departmentOnly ? user?.department || 'CSE' : 'CSE',
    academicYear: '',
    year: '',
    semester: '',
    section: '',
    subjectId: '',
    facultyId: '',
    date: new Date().toISOString().split('T')[0],
    period: 'H1'
  });

  const [activeSubTab, setActiveSubTab] = useState('mark'); // 'mark' or 'logs'
  const [editLogs, setEditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchEditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(apiUrl('/api/logs'), { headers: withAuthHeader() });
      if (res.data && res.data.logs) {
        const filtered = res.data.logs.filter(l => 
          l.action === 'Edit Student Attendance' || 
          l.action === 'Bulk Mark Attendance' ||
          l.action === 'Edit Attendance'
        );
        setEditLogs(filtered);
      }
    } catch (error) {
      console.error('Failed to load edit logs', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'logs') {
      fetchEditLogs();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (departmentOnly && user?.department) {
      setFilters(f => ({ ...f, department: user.department }));
    }
  }, [departmentOnly, user]);

  const fetchOptions = async () => {
    try {
      const subjectQuery = filters.department ? `?department=${filters.department}` : '';
      const facultyQuery = `?role=Faculty${filters.department ? `&department=${filters.department}` : ''}`;

      const [subsRes, facsRes] = await Promise.all([
        axios.get(apiUrl(`/api/admin/subjects${subjectQuery}`), { headers: withAuthHeader() }),
        axios.get(apiUrl(`/api/admin/users${facultyQuery}`), { headers: withAuthHeader() })
      ]);
      setSubjects(subsRes.data);
      setFaculties(facsRes.data);

      if (subsRes.data.length > 0) {
        const hasCurrentSub = subsRes.data.some(s => s._id === filters.subjectId);
        if (!hasCurrentSub) {
          setFilters(f => ({ ...f, subjectId: subsRes.data[0]._id }));
        }
      } else {
        setFilters(f => ({ ...f, subjectId: '' }));
      }

      if (facsRes.data.length > 0) {
        const hasCurrentFac = facsRes.data.some(f => f._id === filters.facultyId);
        if (!hasCurrentFac) {
          setFilters(f => ({ ...f, facultyId: facsRes.data[0]._id }));
        }
      } else {
        setFilters(f => ({ ...f, facultyId: '' }));
      }
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [filters.department]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    let newFilters = { ...filters, [name]: value };

    if (name === 'year') {
      const yearToAcademicYear = {
        '1': '2025-2026',
        '2': '2024-2025',
        '3': '2023-2024',
        '4': '2022-2023'
      };
      if (value && yearToAcademicYear[value]) {
        newFilters.academicYear = yearToAcademicYear[value];
      } else if (!value) {
        newFilters.academicYear = '';
      }
    } else if (name === 'academicYear') {
      const academicYearToYear = {
        '2025-2026': '1',
        '2024-2025': '2',
        '2023-2024': '3',
        '2022-2023': '4'
      };
      if (value && academicYearToYear[value]) {
        newFilters.year = academicYearToYear[value];
      } else if (!value) {
        newFilters.year = '';
      }
    }

    setFilters(newFilters);
  };

  const loadStudents = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      // 1. Try to load existing marked attendance records for this specific class/subject/date/period
      const queryParams = new URLSearchParams();
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.year) queryParams.append('year', filters.year);
      if (filters.semester) queryParams.append('semester', filters.semester);
      if (filters.section) queryParams.append('section', filters.section);
      if (filters.subjectId) queryParams.append('subject', filters.subjectId);
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.period) queryParams.append('period', filters.period);

      const attendanceResponse = await axios.get(apiUrl(`/api/admin/analytics/attendance-monitoring?${queryParams.toString()}`), {
        headers: withAuthHeader()
      });

      // Find the specific session matching the selected period
      const selectedPeriod = filters.period; // e.g. "H1", "H2"
      const matchedClass = attendanceResponse.data?.dailyClasses?.find(c => 
        String(c.period) === selectedPeriod || String(c.period).includes(`(${selectedPeriod})`)
      );

      if (matchedClass && matchedClass.students && matchedClass.students.length > 0) {
        // If existing attendance records are found, load them!
        const loadedStudents = matchedClass.students.map(record => ({
          id: record.id || record._id,
          regNo: record.registerNumber || record.rollNumber,
          name: record.name,
          status: record.status === 'Present' ? 'P' : record.status === 'Absent' ? 'A' : record.status === 'Late' ? 'L' : 'OD',
          remarks: record.remarks || ''
        }));
        setStudents(loadedStudents);
        setMessage({ text: `Loaded existing attendance records for Period ${selectedPeriod}.`, type: 'success' });
      } else {
        // 2. If no existing records are found, load all student accounts and default them to Present
        const studentParams = new URLSearchParams();
        studentParams.append('role', 'Student');
        if (filters.department) studentParams.append('department', filters.department);
        if (filters.year) studentParams.append('year', filters.year);
        if (filters.semester) studentParams.append('semester', filters.semester);
        if (filters.section) studentParams.append('section', filters.section);

        const response = await axios.get(apiUrl(`/api/admin/users?${studentParams.toString()}`), {
          headers: withAuthHeader()
        });
        
        const loadedStudents = response.data.map(user => ({
          id: user._id,
          regNo: user.registerNumber || user.email,
          name: user.name,
          status: 'P',
          remarks: ''
        }));
        setStudents(loadedStudents);
        
        if (loadedStudents.length === 0) {
          setMessage({ text: 'No students found matching the criteria.', type: 'error' });
        } else {
          setMessage({ text: `No attendance marked yet. Loaded ${loadedStudents.length} students.`, type: 'success' });
        }
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error loading students.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setStudents(students.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const handleRemarksChange = (id, newRemarks) => {
    setStudents(students.map(s => s.id === id ? { ...s, remarks: newRemarks } : s));
  };

  const markAll = (status) => {
    setStudents(students.map(s => ({ ...s, status })));
  };

  const saveAttendance = async () => {
    if (students.length === 0) {
      setMessage({ text: 'No students loaded to save attendance.', type: 'error' });
      return;
    }
    if (!filters.subjectId) {
      setMessage({ text: 'Please select a subject.', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: s.status === 'P' ? 'Present' : s.status === 'A' ? 'Absent' : s.status === 'L' ? 'Late' : 'On-Duty',
        remarks: s.remarks
      }));

      await axios.post(apiUrl('/api/admin/attendance/bulk'), {
        records,
        date: filters.date,
        subjectId: filters.subjectId,
        period: filters.period // Send period!
      }, { headers: withAuthHeader() });

      setMessage({ text: 'Attendance saved successfully!', type: 'success' });
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Error saving attendance.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const total = students.length;
  const present = students.filter(s => s.status === 'P').length;
  const absent = students.filter(s => s.status === 'A').length;
  const late = students.filter(s => s.status === 'L').length;
  const onDuty = students.filter(s => s.status === 'OD').length;
  const attendancePercent = total > 0 ? (((present + late + onDuty) / total) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Attendance Monitoring</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Mark daily check-ins, take period-wise attendance, and trace modification audit trails.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveSubTab('mark')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${activeSubTab === 'mark' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Mark & Edit Attendance
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${activeSubTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Attendance Edit Logs
          </button>
        </div>
      </div>

      {activeSubTab === 'logs' ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">System Modification Audit Trail</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Authorized audit logs of all attendance records edited manually by HODs or Administrators.</p>
          </div>

          {loadingLogs ? (
            <div className="p-12 text-center text-slate-500 font-bold text-xs animate-pulse">Loading audit trail records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-800">Date/Time</th>
                    <th className="p-4 font-bold text-slate-800">Modified By</th>
                    <th className="p-4 font-bold text-slate-800">Student Reg</th>
                    <th className="p-4 font-bold text-slate-800 text-center">Old Status</th>
                    <th className="p-4 font-bold text-slate-800 text-center">New Status</th>
                    <th className="p-4 font-bold text-slate-800">Change Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-semibold text-slate-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {log.performedBy?.name} ({log.performedBy?.role})
                      </td>
                      <td className="p-4 font-bold text-slate-700">
                        {log.details?.studentReg || 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                          {log.details?.oldValue || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                          {log.details?.newValue || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 text-[11px] font-semibold">
                        {log.action === 'Bulk Mark Attendance' ? log.details : `Modified attendance status from ${log.details?.oldValue} to ${log.details?.newValue}`}
                      </td>
                    </tr>
                  ))}
                  {editLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 italic">No attendance modifications recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>


      {message.text && (
        <div className={`p-4 rounded-xl border font-semibold flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
          {message.text}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Department</label>
            <select name="department" value={filters.department} onChange={handleFilterChange} disabled={departmentOnly} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-75 disabled:bg-slate-50">
              <option value="">All Departments</option>
              <option value="CSE">Computer Science & Engineering</option>
              <option value="ECE">Electronics & Communication</option>
              <option value="MECH">Mechanical Engineering</option>
              <option value="IT">Information Technology</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Academic Year</label>
            <select name="academicYear" value={filters.academicYear || ''} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="">All Academic Years</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Year</label>
            <select name="year" value={filters.year || ''} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="">All Years</option>
              <option value="1">I Year</option>
              <option value="2">II Year</option>
              <option value="3">III Year</option>
              <option value="4">IV Year</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Semester</label>
            <select name="semester" value={filters.semester} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="">All</option>
              {[...Array(8)].map((_, i) => <option key={i+1} value={i+1}>{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i]} Semester</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Section</label>
            <select name="section" value={filters.section} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="">All</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col md:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Subject</label>
            <select name="subjectId" value={filters.subjectId} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="">-- Select Subject --</option>
              {subjects.filter(sub => !filters.department || sub.department === filters.department).map(sub => (
                <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Faculty</label>
            <select name="facultyId" value={filters.facultyId} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="">-- Select Faculty --</option>
              {faculties.filter(fac => !filters.department || fac.department === filters.department).map(fac => (
                <option key={fac._id} value={fac._id}>{fac.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
            <input name="date" type="date" value={filters.date} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Period</label>
            <select name="period" value={filters.period} onChange={handleFilterChange} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
              <option value="H1">H1 (09:00 AM - 09:50 AM)</option>
              <option value="H2">H2 (09:50 AM - 10:40 AM)</option>
              <option value="H3">H3 (11:00 AM - 11:50 AM)</option>
              <option value="H4">H4 (11:50 AM - 12:40 PM)</option>
              <option value="H5">H5 (01:40 PM - 02:30 PM)</option>
              <option value="H6">H6 (02:30 PM - 03:20 PM)</option>
              <option value="H7">H7 (03:20 PM - 04:10 PM)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button 
            onClick={() => setFilters({ ...filters, department: '', year: '', semester: '', section: '' })}
            className="bg-white border border-slate-300 text-slate-700 font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={loadStudents}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition shadow-md shadow-blue-500/20 text-sm disabled:opacity-70"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search className="w-4 h-4" />} 
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-[#f0f7ff] border border-blue-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl"><Users className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-600">Total Students</p>
            <p className="text-xl font-black text-slate-800">{total}</p>
          </div>
        </div>
        <div className="bg-[#f0fdf4] border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-xl"><CheckCircle className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-600">Present</p>
            <p className="text-xl font-black text-slate-800">{present} <span className="text-sm font-semibold text-slate-500">({total ? ((present/total)*100).toFixed(2) : 0}%)</span></p>
          </div>
        </div>
        <div className="bg-[#fff1f2] border border-rose-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-rose-100 p-3 rounded-xl"><XCircle className="w-6 h-6 text-rose-600" /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-600">Absent</p>
            <p className="text-xl font-black text-slate-800">{absent} <span className="text-sm font-semibold text-slate-500">({total ? ((absent/total)*100).toFixed(2) : 0}%)</span></p>
          </div>
        </div>
        <div className="bg-[#fffbeb] border border-amber-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl"><Clock className="w-6 h-6 text-amber-600" /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-600">Late</p>
            <p className="text-xl font-black text-slate-800">{late} <span className="text-sm font-semibold text-slate-500">({total ? ((late/total)*100).toFixed(2) : 0}%)</span></p>
          </div>
        </div>
        <div className="bg-[#f5f3ff] border border-indigo-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl"><Clock className="w-6 h-6 text-indigo-600" /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-600">On-Duty</p>
            <p className="text-xl font-black text-slate-800">{onDuty} <span className="text-sm font-semibold text-slate-500">({total ? ((onDuty/total)*100).toFixed(2) : 0}%)</span></p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-center shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
          <div className="text-center">
            <p className="text-[11px] font-bold text-slate-500 mb-1">Attendance %</p>
            <p className="text-2xl font-black text-emerald-600">{attendancePercent}%</p>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        
        {/* Action Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <Edit3 className="w-4 h-4" /> Mark Manually
            </button>
            <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <Upload className="w-4 h-4" /> Upload Excel
            </button>
            <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <Download className="w-4 h-4" /> Download Template
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => markAll('P')} className="bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <CheckCircle className="w-4 h-4" /> Mark All Present
            </button>
            <button onClick={() => markAll('A')} className="bg-white border border-rose-500 text-rose-600 hover:bg-rose-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <XCircle className="w-4 h-4" /> Mark All Absent
            </button>
            <button onClick={() => markAll('L')} className="bg-white border border-amber-500 text-amber-600 hover:bg-amber-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <Clock className="w-4 h-4" /> Mark All Late
            </button>
            <button onClick={() => markAll('OD')} className="bg-white border border-indigo-500 text-indigo-600 hover:bg-indigo-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
              <Clock className="w-4 h-4" /> Mark All On-Duty
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th rowSpan="2" className="p-4 font-bold text-slate-800 border-r border-slate-200 w-12 text-center bg-slate-50">#</th>
                <th rowSpan="2" className="p-4 font-bold text-slate-800 border-r border-slate-200 bg-slate-50">Register No.</th>
                <th rowSpan="2" className="p-4 font-bold text-slate-800 border-r border-slate-200 bg-slate-50">Student Name</th>
                <th colSpan="4" className="p-3 font-bold text-slate-800 border-r border-slate-200 text-center border-b border-slate-200 bg-slate-50">Attendance Status</th>
                <th rowSpan="2" className="p-4 font-bold text-slate-800 bg-slate-50">Remarks (Optional)</th>
              </tr>
              <tr>
                <th className="p-3 font-semibold text-slate-600 border-r border-slate-200 text-center text-xs bg-slate-50">P (Present)</th>
                <th className="p-3 font-semibold text-slate-600 border-r border-slate-200 text-center text-xs bg-slate-50">A (Absent)</th>
                <th className="p-3 font-semibold text-slate-600 border-r border-slate-200 text-center text-xs bg-slate-50">L (Late)</th>
                <th className="p-3 font-semibold text-slate-600 border-r border-slate-200 text-center text-xs bg-slate-50">OD (On-Duty)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 italic">Please select filters and click "Load Students".</td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-center font-semibold text-slate-600 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-700 border-r border-slate-100">{student.regNo}</td>
                    <td className="p-4 font-semibold text-slate-800 border-r border-slate-100">{student.name}</td>
                    
                    {/* P Radio */}
                    <td className="p-4 text-center border-r border-slate-100">
                      <label className="cursor-pointer inline-flex items-center justify-center w-full h-full">
                        <input 
                          type="radio" 
                          name={`status-${student.id}`} 
                          checked={student.status === 'P'} 
                          onChange={() => handleStatusChange(student.id, 'P')}
                          className="w-5 h-5 accent-emerald-600 cursor-pointer"
                        />
                      </label>
                    </td>
                    
                    {/* A Radio */}
                    <td className="p-4 text-center border-r border-slate-100">
                      <label className="cursor-pointer inline-flex items-center justify-center w-full h-full">
                        <input 
                          type="radio" 
                          name={`status-${student.id}`} 
                          checked={student.status === 'A'} 
                          onChange={() => handleStatusChange(student.id, 'A')}
                          className="w-5 h-5 accent-rose-600 cursor-pointer"
                        />
                      </label>
                    </td>
                    
                    {/* L Radio */}
                    <td className="p-4 text-center border-r border-slate-100">
                      <label className="cursor-pointer inline-flex items-center justify-center w-full h-full">
                        <input 
                          type="radio" 
                          name={`status-${student.id}`} 
                          checked={student.status === 'L'} 
                          onChange={() => handleStatusChange(student.id, 'L')}
                          className="w-5 h-5 accent-amber-500 cursor-pointer"
                        />
                      </label>
                    </td>
                    
                    {/* OD Radio */}
                    <td className="p-4 text-center border-r border-slate-100">
                      <label className="cursor-pointer inline-flex items-center justify-center w-full h-full">
                        <input 
                          type="radio" 
                          name={`status-${student.id}`} 
                          checked={student.status === 'OD'} 
                          onChange={() => handleStatusChange(student.id, 'OD')}
                          className="w-5 h-5 accent-indigo-600 cursor-pointer"
                        />
                      </label>
                    </td>

                    <td className="p-4">
                      <input 
                        type="text" 
                        placeholder="Enter remarks"
                        value={student.remarks}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="w-full border border-slate-200 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-transparent focus:bg-white transition"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition text-sm shadow-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-3">
            <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-6 rounded-lg transition text-sm shadow-sm">
              Cancel
            </button>
            <button 
              onClick={saveAttendance}
              disabled={saving || students.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg transition text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>

      </div>
    </>
  )}
</div>
  );
}
