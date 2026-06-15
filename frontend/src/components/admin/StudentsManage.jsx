import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { 
  Search, Download, MoreVertical, RotateCcw, 
  UserSquare2, CheckCircle2, FileText, FileSpreadsheet, Layers, Eye
} from 'lucide-react';
import BulkUpload from './BulkUpload';
import StudentModal from './StudentModal';
import StudentDetailsView from './StudentDetailsView';
import { useAuth } from '../../context/AuthContext';
import { updateUser, bulkDeleteUsers } from '../../api/adminApi';

export default function StudentsManage({ departmentOnly }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState(departmentOnly ? user?.department || '' : '');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [secFilter, setSecFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const yearToAcademicYear = {
    '1': '2025-2026',
    '2': '2024-2025',
    '3': '2023-2024',
    '4': '2022-2023'
  };

  const academicYearToYear = {
    '2025-2026': '1',
    '2024-2025': '2',
    '2023-2024': '3',
    '2022-2023': '4'
  };

  const handleYearChange = (val) => {
    setYearFilter(val);
    if (val && yearToAcademicYear[val]) {
      setAcademicYearFilter(yearToAcademicYear[val]);
    } else if (!val) {
      setAcademicYearFilter('');
    }
  };

  const handleAcademicYearChange = (val) => {
    setAcademicYearFilter(val);
    if (val && academicYearToYear[val]) {
      setYearFilter(academicYearToYear[val]);
    } else if (!val) {
      setYearFilter('');
    }
  };

  // Pagination (mock state for visual matching)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (departmentOnly && user?.department) {
      setDeptFilter(user.department);
    }
  }, [departmentOnly, user]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(apiUrl('/api/admin/students/academic'), {
        headers: withAuthHeader()
      });
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = students;

    if (searchQuery) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.registerNumber && s.registerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.batch && s.batch.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.mobile && s.mobile.includes(searchQuery))
      );
    }
    if (deptFilter) result = result.filter(s => s.department === deptFilter);
    if (batchFilter) result = result.filter(s => s.batch === batchFilter);
    
    if (academicYearFilter) {
      const mappedYear = { '2025-2026': '1', '2024-2025': '2', '2023-2024': '3', '2022-2023': '4' }[academicYearFilter];
      if (mappedYear) {
        result = result.filter(s => s.year === mappedYear);
      }
    } else if (yearFilter) {
      result = result.filter(s => s.year === yearFilter);
    }

    if (semFilter) result = result.filter(s => s.semester === semFilter);
    if (secFilter) result = result.filter(s => s.section === secFilter);

    setFilteredStudents(result);
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, deptFilter, academicYearFilter, yearFilter, semFilter, secFilter, students]);

  const handleReset = () => {
    setSearchQuery('');
    setDeptFilter('');
    setAcademicYearFilter('');
    setYearFilter('');
    setSemFilter('');
    setSecFilter('');
    setBatchFilter('');
  };

  const handleExport = () => {
    const csvRows = [
      ['Register No.', 'Student Name', 'Department', 'Batch', 'Year', 'Semester', 'Section', 'Email', 'Mobile No.', 'Parent Mobile', 'Status']
    ];

    filteredStudents.forEach(s => {
      csvRows.push([
        s.registerNumber || '',
        s.name || '',
        s.department || '',
        s.batch || '',
        s.year || '',
        s.semester || '',
        s.section || '',
        s.email || '',
        s.mobile || '',
        s.parentDetails?.mobile || '',
        s.isActive !== false ? 'Active' : 'Inactive'
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetToDob = async (student) => {
    if (!student.dob) {
      alert('This student does not have a Date of Birth set in their profile.');
      return;
    }
    const formattedDob = new Date(student.dob).toLocaleDateString();
    if (!window.confirm(`Are you sure you want to reset the password for ${student.name} to their Date of Birth (${formattedDob})?`)) return;
    
    try {
      await updateUser(student._id, { ...student, resetToDob: true });
      alert(`Password reset successful! Temporary password is set to their DOB (format: DDMMYYYY).`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error resetting password');
    }
  };

  const handleBulkDelete = async () => {
    if (filteredStudents.length === 0) {
      alert('No students found in the current filtered view to delete.');
      return;
    }

    const isFiltered = searchQuery || deptFilter || academicYearFilter || yearFilter || semFilter || secFilter || batchFilter;
    const warningMessage = isFiltered
      ? `Are you sure you want to permanently delete all ${filteredStudents.length} filtered students?`
      : `WARNING: No filters are applied. Are you sure you want to permanently delete ALL ${filteredStudents.length} students in the directory?`;

    if (!window.confirm(warningMessage)) return;
    
    const secondConfirm = window.confirm(`This action is permanent and cannot be undone. All selected student accounts and their academic/attendance records will be deleted.\n\nAre you absolutely sure?`);
    if (!secondConfirm) return;

    const confirmationText = window.prompt(`To proceed, please type "DELETE" below to confirm bulk deletion:`);
    if (confirmationText !== 'DELETE') {
      alert('Bulk deletion cancelled: Confirmation text did not match "DELETE".');
      return;
    }

    try {
      setLoading(true);
      const idsToDelete = filteredStudents.map(s => s._id);
      const res = await bulkDeleteUsers(idsToDelete);
      alert(`Successfully deleted ${res.data.deletedCount} students.`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error performing bulk deletion.');
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedData.map(s => s._id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = paginatedData.map(s => s._id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete all ${selectedIds.length} selected students?`)) return;
    const secondConfirm = window.confirm(`This action is permanent and cannot be undone. All selected student accounts and their academic/attendance records will be deleted.\n\nAre you absolutely sure?`);
    if (!secondConfirm) return;

    const confirmationText = window.prompt(`To proceed, please type "DELETE" below to confirm bulk deletion:`);
    if (confirmationText !== 'DELETE') {
      alert('Bulk deletion cancelled: Confirmation text did not match "DELETE".');
      return;
    }

    try {
      setLoading(true);
      const res = await bulkDeleteUsers(selectedIds);
      alert(`Successfully deleted ${res.data.deletedCount} students.`);
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error performing bulk deletion.');
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mt-10"></div>;

  if (selectedStudentId) {
    return (
      <StudentDetailsView 
        studentId={selectedStudentId} 
        onBack={() => setSelectedStudentId(null)} 
      />
    );
  }

  const departments = [...new Set(students.map(s => s.department).filter(Boolean))];
  const batches = [...new Set(students.map(s => s.batch).filter(Boolean))];
  const years = [...new Set(students.map(s => s.year).filter(Boolean))];
  const semesters = [...new Set(students.map(s => s.semester).filter(Boolean))];
  const sections = [...new Set(students.map(s => s.section).filter(Boolean))];

  // Pagination Logic
  const totalEntries = filteredStudents.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const paginatedData = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatRomanYear = (y) => {
    const map = {'1':'I', '2':'II', '3':'III', '4':'IV'};
    return map[y] ? `${map[y]} Year` : y;
  };
  
  const formatRomanSem = (s) => {
    const map = {'1':'I', '2':'II', '3':'III', '4':'IV', '5':'V', '6':'VI', '7':'VII', '8':'VIII'};
    return map[s] ? map[s] : s;
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header section with Add and Bulk Upload */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Student Management</h2>
          <p className="text-slate-500 font-medium mt-1">Manage student profiles, academic records, and status.</p>
        </div>
        <button 
          onClick={() => { setEditStudent(null); setIsModalOpen(true); }}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
        >
          <UserSquare2 className="w-5 h-5" /> Add Student Manually
        </button>
      </div>

      <div id="bulk-upload-section" className="transition-all duration-300 rounded-2xl">
        <BulkUpload type="users" onUploadSuccess={fetchStudents} />
      </div>

      {/* Top Filters Block */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4">
        
        {/* Toggle Filters Button for Mobile */}
        <div className="flex md:hidden justify-between items-center w-full gap-2">
          <button 
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm"
          >
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button onClick={handleExport} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition text-xs shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Row 1: Selectors & Export */}
        <div className={`flex-col md:flex-row gap-4 items-end ${showMobileFilters ? 'flex' : 'hidden md:flex'}`}>
          <div className="w-full flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {!departmentOnly && (
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Batch</label>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Academic Year</label>
              <select value={academicYearFilter} onChange={e => handleAcademicYearChange(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                <option value="">All Academic Years</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2022-2023">2022-2023</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Year</label>
              <select value={yearFilter} onChange={e => handleYearChange(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{formatRomanYear(y)}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Semester</label>
              <select value={semFilter} onChange={e => setSemFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                <option value="">All Semesters</option>
                {semesters.map(s => <option key={s} value={s}>{formatRomanSem(s)}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Section</label>
              <select value={secFilter} onChange={e => setSecFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500">
                <option value="">All Sections</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleExport} className="hidden md:flex bg-white border border-slate-300 text-slate-700 font-bold py-2.5 px-5 rounded-lg items-center gap-2 hover:bg-slate-50 transition text-sm shadow-sm h-[42px] shrink-0">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Row 2: Search */}
        <div className="flex flex-col md:flex-row gap-4 items-end mt-2">
          <div className="flex flex-col flex-1 max-w-xl w-full">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search by Reg. No. / Name / Email / Mobile" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 text-sm h-[38px]">
              <Search className="w-4 h-4" /> Search
            </button>
            <button onClick={handleReset} className="flex-1 md:flex-initial bg-white border border-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm shadow-sm h-[38px]">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            {filteredStudents.length > 0 && (
              <button 
                onClick={handleBulkDelete} 
                className="flex-1 md:flex-initial bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-rose-500/20 text-sm h-[38px]"
              >
                Delete Filtered ({filteredStudents.length})
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected} 
                className="flex-1 md:flex-initial bg-red-650 hover:bg-red-750 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-red-500/20 text-sm h-[38px]"
              >
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 px-1 mt-6 mb-4">Student List</h3>

      {/* Main Table Block */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        
        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedData.map((s) => (
            <div key={s._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2.5">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(s._id)} 
                    onChange={() => handleSelectRow(s._id)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer mt-1"
                  />
                  <div>
                    <span 
                      onClick={() => setSelectedStudentId(s._id)} 
                      className="text-sm font-extrabold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block"
                    >
                      {s.name}
                    </span>
                    <span className="text-[11px] text-slate-405 font-mono font-bold">{s.registerNumber || 'N/A'}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${s.isActive !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                  {s.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-semibold text-slate-500">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Department</span>
                  <span className="text-slate-700 truncate block max-w-[130px]" title={s.department}>
                    {s.department || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Class</span>
                  <span className="text-slate-700">{s.year ? `${formatRomanYear(s.year)}` : '-'} {s.section ? `- Sec ${s.section}` : ''}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Email</span>
                  <span className="text-slate-700 truncate block max-w-[130px]" title={s.email}>{s.email || '-'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Mobile</span>
                  <span className="text-slate-700">{s.mobile || '-'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Attendance</span>
                  <span className={`font-black ${
                    (s.attendance?.percentage ?? 0) >= 75 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {s.attendance?.percentage !== undefined ? `${s.attendance.percentage}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedStudentId(s._id)}
                  className="p-1.5 border border-slate-200 rounded text-slate-505 hover:bg-slate-50 hover:text-indigo-600 transition"
                  title="View Attendance"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setEditStudent(s); setIsModalOpen(true); }}
                  className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition"
                  title="Edit Student"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleResetToDob(s)}
                  className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 hover:text-purple-600 transition"
                  title="Reset Password to DOB"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {paginatedData.length === 0 && (
            <div className="p-8 text-center text-slate-500 italic text-xs font-bold">No students found.</div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-center text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-center border-r border-slate-100 w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={paginatedData.length > 0 && paginatedData.every(s => selectedIds.includes(s._id))}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Register No.</th>
                <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Student Name</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Department</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Batch</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Year</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Semester</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Section</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Email</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Mobile No.</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Parent Mobile</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Attendance %</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Status</th>
                <th className="p-4 font-bold text-slate-800 w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((s) => (
                <tr key={s._id} className="hover:bg-slate-55 transition">
                  <td className="p-4 text-center border-r border-slate-100 w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(s._id)} 
                      onChange={() => handleSelectRow(s._id)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-bold text-slate-700 text-left border-r border-slate-100">{s.registerNumber || '-'}</td>
                  <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                    <span 
                      onClick={() => setSelectedStudentId(s._id)} 
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition"
                    >
                      {s.name}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-650 border-r border-slate-100">{s.department === 'CSE' ? 'Computer Science & Engineering' : s.department === 'ECE' ? 'Electronics & Communication' : s.department === 'EEE' ? 'Electrical & Electronics Engineering' : s.department === 'IT' ? 'Information Technology' : s.department === 'MECH' ? 'Mechanical Engineering' : s.department === 'CIVIL' ? 'Civil Engineering' : s.department || '-'}</td>
                  <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{s.batch || '-'}</td>
                  <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{formatRomanYear(s.year)}</td>
                  <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{formatRomanSem(s.semester)}</td>
                  <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{s.section || '-'}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-100">{s.email}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-100">{s.mobile || '-'}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-100">{s.parentDetails?.mobile || '-'}</td>
                  <td className="p-4 border-r border-slate-100 font-bold">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      (s.attendance?.percentage ?? 0) >= 75 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {s.attendance?.percentage !== undefined ? `${s.attendance.percentage}%` : '0%'}
                    </span>
                  </td>
                  <td className="p-4 border-r border-slate-100">
                    <span className={`px-3 py-1 rounded text-xs font-bold ${s.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {s.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button 
                        onClick={() => setSelectedStudentId(s._id)}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                        title="View Attendance & Academics"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setEditStudent(s); setIsModalOpen(true); }}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Student"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleResetToDob(s)}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-purple-600 transition"
                        title="Reset Password to DOB"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="12" className="p-8 text-center text-slate-500 italic">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-white gap-4">
          <p className="text-sm font-semibold text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalEntries)} of {totalEntries} entries
          </p>
          <div className="flex gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(c => c - 1)}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-bold"
            >
              &lt;
            </button>
            
            {/* Simple Pagination Numbers */}
            {[...Array(Math.min(totalPages, 5))].map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button 
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center border rounded text-sm font-bold transition ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && <span className="w-8 h-8 flex items-center justify-center text-slate-500 font-bold">...</span>}
            {totalPages > 5 && (
              <button 
                onClick={() => setCurrentPage(totalPages)}
                className={`w-auto px-2 h-8 flex items-center justify-center border rounded text-sm font-bold transition ${currentPage === totalPages ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {totalPages}
              </button>
            )}

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(c => c + 1)}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-bold"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <div 
          onClick={() => {
            if (paginatedData.length > 0) {
              setSelectedStudentId(paginatedData[0]._id);
            } else {
              alert("No students available in the list to view profile.");
            }
          }}
          className="bg-white border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-200 transition duration-200 active:scale-98"
        >
          <div className="bg-[#1e3a8a] p-3 rounded-xl"><UserSquare2 className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">View Student Profile</h4>
            <p className="text-[11px] font-semibold text-slate-500">View complete student details</p>
          </div>
        </div>
        
        <div 
          onClick={() => {
            if (paginatedData.length > 0) {
              setSelectedStudentId(paginatedData[0]._id);
            } else {
              alert("No students available in the list to view attendance.");
            }
          }}
          className="bg-white border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-cyan-200 transition duration-200 active:scale-98"
        >
          <div className="bg-[#0891b2] p-3 rounded-xl"><CheckCircle2 className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Student Attendance</h4>
            <p className="text-[11px] font-semibold text-slate-500">View attendance summary</p>
          </div>
        </div>

        <div 
          onClick={handleExport}
          className="bg-white border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-emerald-200 transition duration-200 active:scale-98"
        >
          <div className="bg-[#16a34a] p-3 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Export Data</h4>
            <p className="text-[11px] font-semibold text-slate-500">Export student data</p>
          </div>
        </div>

        <div 
          onClick={() => {
            const element = document.getElementById('bulk-upload-section');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              element.classList.add('ring-4', 'ring-blue-500/30', 'scale-[1.01]');
              setTimeout(() => {
                element.classList.remove('ring-4', 'ring-blue-500/30', 'scale-[1.01]');
              }, 2000);
            }
          }}
          className="bg-white border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-purple-200 transition duration-200 active:scale-98"
        >
          <div className="bg-[#8b5cf6] p-3 rounded-xl"><Layers className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Bulk Actions</h4>
            <p className="text-[11px] font-semibold text-slate-500">Perform bulk operations</p>
          </div>
        </div>
      </div>

      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentToEdit={editStudent}
        onSuccess={fetchStudents}
        departmentOnly={departmentOnly}
      />
    </div>
  );
}
