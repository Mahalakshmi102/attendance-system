import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser, updateUser, bulkDeleteUsers } from '../../api/adminApi';
import { 
  Search, Download, MoreVertical, RotateCcw, 
  UserSquare2, CheckCircle2, FileText, FileSpreadsheet, Shield, Eye
} from 'lucide-react';
import BulkUpload from './BulkUpload';
import FacultyModal from './FacultyModal';
import FacultyDetailsView from './FacultyDetailsView';
import { useAuth } from '../../context/AuthContext';

export default function FacultyManage({ departmentOnly }) {
  const { user } = useAuth();
  
  const [facultyList, setFacultyList] = useState([]);
  const [filteredFaculty, setFilteredFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Details State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFaculty, setEditFaculty] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState(departmentOnly ? user?.department || '' : '');
  const [designationFilter, setDesignationFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (departmentOnly && user?.department) {
      setDeptFilter(user.department);
    }
  }, [departmentOnly, user]);

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      // Filter out 'Student' and 'Admin' roles to focus on HODs, Faculty, Class Advisor, Principal, CoE
      const academicStaff = res.data.filter(u => 
        ['HoD', 'Faculty', 'Class Advisor', 'Principal', 'CoE', 'Other Staff'].includes(u.role)
      );
      setFacultyList(academicStaff);
      setFilteredFaculty(academicStaff);
    } catch (err) {
      console.error('Error fetching faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = facultyList;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) || 
        (f.registerNumber && f.registerNumber.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.employeeId && f.employeeId.toLowerCase().includes(q))
      );
    }

    if (deptFilter) {
      result = result.filter(f => f.department === deptFilter);
    }

    if (roleFilter) {
      result = result.filter(f => f.role === roleFilter);
    }

    if (designationFilter) {
      result = result.filter(f => f.designation && f.designation.includes(designationFilter));
    }

    if (statusFilter) {
      result = result.filter(f => 
        statusFilter === 'active' ? f.isActive !== false : f.isActive === false
      );
    }

    if (advisorFilter) {
      result = result.filter(f => f.classAdvisorDetails?.isClassAdvisor === true || f.role === 'Class Advisor');
    }

    setFilteredFaculty(result);
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, deptFilter, designationFilter, roleFilter, statusFilter, advisorFilter, facultyList]);

  const handleReset = () => {
    setSearchQuery('');
    setDeptFilter(departmentOnly ? user?.department || '' : '');
    setDesignationFilter('');
    setRoleFilter('');
    setStatusFilter('');
    setAdvisorFilter(false);
  };

  const handleExport = () => {
    const csvRows = [
      ['Faculty ID', 'Employee ID', 'Full Name', 'Role', 'Designation', 'Department', 'Email', 'Mobile No.', 'Joined Date', 'Class Advisor?', 'Status']
    ];

    filteredFaculty.forEach(f => {
      csvRows.push([
        f.registerNumber || '',
        f.employeeId || '',
        f.name || '',
        f.role || '',
        f.designation || '',
        f.department || '',
        f.email || '',
        f.mobile || '',
        f.dateOfJoining ? new Date(f.dateOfJoining).toLocaleDateString() : '',
        f.classAdvisorDetails?.isClassAdvisor ? 'Yes' : 'No',
        f.isActive !== false ? 'Active' : 'Inactive'
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "faculty_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (fac) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${fac.role}: ${fac.name}? This will permanently remove their academic history.`)) return;
    try {
      await deleteUser(fac._id);
      fetchFaculty();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting faculty member.');
    }
  };

  const handleBulkDelete = async () => {
    if (filteredFaculty.length === 0) {
      alert('No faculty/staff members found in the current filtered view to delete.');
      return;
    }

    const isFiltered = searchQuery || deptFilter || designationFilter || roleFilter || statusFilter || advisorFilter;
    const warningMessage = isFiltered
      ? `Are you sure you want to permanently delete all ${filteredFaculty.length} filtered faculty/staff members?`
      : `WARNING: No filters are applied. Are you sure you want to permanently delete ALL ${filteredFaculty.length} faculty/staff members in the directory?`;

    if (!window.confirm(warningMessage)) return;
    
    const secondConfirm = window.confirm(`This action is permanent and cannot be undone. All selected accounts and their credentials will be deleted.\n\nAre you absolutely sure?`);
    if (!secondConfirm) return;

    const confirmationText = window.prompt(`To proceed, please type "DELETE" below to confirm bulk deletion:`);
    if (confirmationText !== 'DELETE') {
      alert('Bulk deletion cancelled: Confirmation text did not match "DELETE".');
      return;
    }

    try {
      setLoading(true);
      const idsToDelete = filteredFaculty.map(f => f._id);
      const res = await bulkDeleteUsers(idsToDelete);
      alert(`Successfully deleted ${res.data.deletedCount} faculty/staff members.`);
      fetchFaculty();
    } catch (err) {
      alert(err.response?.data?.message || 'Error performing bulk deletion.');
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedData.map(f => f._id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = paginatedData.map(f => f._id);
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
    
    if (!window.confirm(`Are you sure you want to permanently delete all ${selectedIds.length} selected faculty/staff members?`)) return;
    const secondConfirm = window.confirm(`This action is permanent and cannot be undone. All selected accounts and their credentials will be deleted.\n\nAre you absolutely sure?`);
    if (!secondConfirm) return;

    const confirmationText = window.prompt(`To proceed, please type "DELETE" below to confirm bulk deletion:`);
    if (confirmationText !== 'DELETE') {
      alert('Bulk deletion cancelled: Confirmation text did not match "DELETE".');
      return;
    }

    try {
      setLoading(true);
      const res = await bulkDeleteUsers(selectedIds);
      alert(`Successfully deleted ${res.data.deletedCount} faculty/staff members.`);
      setSelectedIds([]);
      fetchFaculty();
    } catch (err) {
      alert(err.response?.data?.message || 'Error performing bulk deletion.');
      setLoading(false);
    }
  };

  const handleResetToDob = async (faculty) => {
    if (!faculty.dob) {
      alert('This staff member does not have a Date of Birth set in their profile.');
      return;
    }
    const formattedDob = new Date(faculty.dob).toLocaleDateString();
    if (!window.confirm(`Are you sure you want to reset the password for ${faculty.name} to their Date of Birth (${formattedDob})?`)) return;
    
    try {
      await updateUser(faculty._id, { ...faculty, resetToDob: true });
      alert(`Password reset successful! Temporary password is set to their DOB (format: DDMMYYYY).`);
      fetchFaculty();
    } catch (err) {
      alert(err.response?.data?.message || 'Error resetting password');
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mt-10"></div>;

  if (selectedFaculty) {
    return (
      <FacultyDetailsView 
        faculty={selectedFaculty} 
        onBack={() => setSelectedFaculty(null)} 
      />
    );
  }

  const departments = [...new Set(facultyList.map(f => f.department).filter(Boolean))];
  const designations = [...new Set(facultyList.map(f => f.designation).filter(Boolean))];
  const roles = [...new Set(facultyList.map(f => f.role).filter(Boolean))];

  // Pagination Logic
  const totalEntries = filteredFaculty.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const paginatedData = filteredFaculty.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header section with Add and Bulk Upload */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Faculty & Staff Management</h2>
          <p className="text-slate-500 font-medium mt-1">Manage academic staff profiles, roles, advisor credentials, and status.</p>
        </div>
        <button 
          onClick={() => { setEditFaculty(null); setIsModalOpen(true); }}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
        >
          <UserSquare2 className="w-5 h-5" /> Add Faculty Manually
        </button>
      </div>

      <BulkUpload type="users" onUploadSuccess={fetchFaculty} />

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
          <div className="w-full flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {!departmentOnly && (
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-slate-50">
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Designation</label>
              <select value={designationFilter} onChange={e => setDesignationFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-slate-50">
                <option value="">All Designations</option>
                {designations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">System Role</label>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-slate-50">
                <option value="">All Roles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-slate-50">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <button onClick={handleExport} className="hidden md:flex bg-white border border-slate-300 text-slate-700 font-bold py-2.5 px-5 rounded-lg items-center gap-2 hover:bg-slate-50 transition text-sm shadow-sm h-[42px] shrink-0">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Row 2: Search */}
        <div className="flex flex-col md:flex-row gap-4 items-end mt-2">
          <div className="flex flex-col flex-1 max-w-xl w-full">
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Search Staff</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search by ID / Employee ID / Name / Email" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={fetchFaculty} className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 text-sm h-[38px]">
              <Search className="w-4 h-4" /> Search
            </button>
            <button onClick={handleReset} className="flex-1 md:flex-initial bg-white border border-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm shadow-sm h-[38px]">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            {filteredFaculty.length > 0 && (
              <button 
                onClick={handleBulkDelete} 
                className="flex-1 md:flex-initial bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-rose-500/20 text-sm h-[38px]"
              >
                Delete Filtered ({filteredFaculty.length})
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected} 
                className="flex-1 md:flex-initial bg-red-650 hover:bg-red-755 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-red-500/20 text-sm h-[38px]"
              >
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 px-1 mt-6 mb-4">Academic Directory</h3>

      {/* Main Table Block */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        
        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedData.map((f) => (
            <div key={f._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2.5">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(f._id)} 
                    onChange={() => handleSelectRow(f._id)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer mt-1"
                  />
                  <div>
                    <span 
                      onClick={() => setSelectedFaculty(f)} 
                      className="text-sm font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer block font-bold"
                    >
                      {f.name}
                    </span>
                    <span className="text-[11px] text-slate-405 font-mono font-bold">{f.registerNumber || 'N/A'}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  f.role === 'HoD' ? 'bg-indigo-100 text-indigo-800' :
                  f.role === 'Principal' ? 'bg-amber-100 text-amber-800' :
                  f.role === 'CoE' ? 'bg-purple-100 text-purple-800' :
                  f.role === 'Class Advisor' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {f.role === 'HoD' ? 'HOD' : f.role}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-semibold text-slate-500">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Department</span>
                  <span className="text-slate-700">{f.department || '-'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Designation</span>
                  <span className="text-slate-700 truncate block max-w-[130px]" title={f.designation}>{f.designation || '-'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Advisor</span>
                  {f.classAdvisorDetails?.isClassAdvisor ? (
                    <span className="text-indigo-600 font-bold uppercase text-[10px]">
                      {f.classAdvisorDetails.department} Y{f.classAdvisorDetails.year}{f.classAdvisorDetails.section}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Status</span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${f.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {f.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedFaculty(f)}
                  className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition"
                  title="View Dossier"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setEditFaculty(f); setIsModalOpen(true); }}
                  className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition"
                  title="Edit Faculty"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleResetToDob(f)}
                  className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 hover:text-purple-650 transition"
                  title="Reset Password to DOB"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(f)}
                  className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Delete Account"
                >
                  <span className="font-extrabold text-xs">×</span>
                </button>
              </div>
            </div>
          ))}
          {paginatedData.length === 0 && (
            <div className="p-8 text-center text-slate-500 italic text-xs font-bold">No faculty found.</div>
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
                    checked={paginatedData.length > 0 && paginatedData.every(f => selectedIds.includes(f._id))}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Faculty ID</th>
                <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Employee ID</th>
                <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Academic Staff Name</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Department</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Designation</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Role</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Advisor?</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Email Address</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Status</th>
                <th className="p-4 font-bold text-slate-800 w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((f) => (
                <tr key={f._id} className="hover:bg-slate-55 transition">
                  <td className="p-4 text-center border-r border-slate-100 w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(f._id)} 
                      onChange={() => handleSelectRow(f._id)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-bold text-slate-750 text-left border-r border-slate-100 font-mono">{f.registerNumber || '-'}</td>
                  <td className="p-4 font-semibold text-slate-700 text-left border-r border-slate-100 font-mono">{f.employeeId || '-'}</td>
                  <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">
                    <span 
                      onClick={() => setSelectedFaculty(f)} 
                      className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition font-bold"
                    >
                      {f.name}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-600 border-r border-slate-100">{f.department || '-'}</td>
                  <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{f.designation || '-'}</td>
                  <td className="p-4 border-r border-slate-100">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      f.role === 'HoD' ? 'bg-indigo-100 text-indigo-800' :
                      f.role === 'Principal' ? 'bg-amber-100 text-amber-800' :
                      f.role === 'CoE' ? 'bg-purple-100 text-purple-800' :
                      f.role === 'Class Advisor' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {f.role === 'HoD' ? 'HOD' : f.role}
                    </span>
                  </td>
                  <td className="p-4 border-r border-slate-100 font-semibold">
                    {f.classAdvisorDetails?.isClassAdvisor ? (
                      <span className="text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded text-[10px] font-black uppercase" title={`${f.classAdvisorDetails.department} Y${f.classAdvisorDetails.year} ${f.classAdvisorDetails.section}`}>
                        {f.classAdvisorDetails.department} Y{f.classAdvisorDetails.year}{f.classAdvisorDetails.section}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold">-</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 border-r border-slate-100 text-left">{f.email}</td>
                  <td className="p-4 border-r border-slate-100">
                    <span className={`px-3 py-1 rounded text-xs font-bold ${f.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {f.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button 
                        onClick={() => setSelectedFaculty(f)}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                        title="View Dossier Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setEditFaculty(f); setIsModalOpen(true); }}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Edit Faculty"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleResetToDob(f)}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-purple-600 transition"
                        title="Reset Password to DOB"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(f)}
                        className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete Account"
                      >
                        <span className="font-extrabold text-xs">×</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-500 italic">No academic staff members found.</td>
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
            
            {[...Array(totalPages)].map((_, idx) => {
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

      {/* Visual Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <div 
          onClick={() => {
            setSearchQuery('');
            setDeptFilter(departmentOnly ? user?.department || '' : '');
            setDesignationFilter('');
            setRoleFilter('Faculty');
            setStatusFilter('');
            setAdvisorFilter(false);
          }}
          className={`border p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-200 active:scale-98 rounded-2xl ${
            roleFilter === 'Faculty' && !advisorFilter
              ? 'bg-indigo-50/40 border-indigo-300 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.15)] ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]'
          }`}
        >
          <div className="bg-indigo-900 p-3 rounded-xl"><UserSquare2 className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Faculty Profiles</h4>
            <p className="text-[11px] font-semibold text-slate-500">Filter profiles by Faculty role</p>
          </div>
        </div>
        
        <div 
          onClick={() => {
            setSearchQuery('');
            setDeptFilter(departmentOnly ? user?.department || '' : '');
            setDesignationFilter('');
            setRoleFilter('');
            setStatusFilter('');
            setAdvisorFilter(true);
          }}
          className={`border p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-200 active:scale-98 rounded-2xl ${
            advisorFilter
              ? 'bg-cyan-50/40 border-cyan-300 shadow-[0_4px_20px_-4px_rgba(6,182,212,0.15)] ring-2 ring-cyan-500/20'
              : 'bg-white border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]'
          }`}
        >
          <div className="bg-cyan-700 p-3 rounded-xl"><Shield className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Class Advisors</h4>
            <p className="text-[11px] font-semibold text-slate-500">Show appointed class monitors</p>
          </div>
        </div>

        <div 
          onClick={handleExport}
          className="bg-white border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border-slate-100 hover:border-emerald-250 p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-200 active:scale-98 rounded-2xl"
        >
          <div className="bg-emerald-600 p-3 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Export Staff List</h4>
            <p className="text-[11px] font-semibold text-slate-500">Download CSV directory spreadsheet</p>
          </div>
        </div>

        <div 
          onClick={() => {
            setSearchQuery('');
            setDeptFilter(departmentOnly ? user?.department || '' : '');
            setDesignationFilter('');
            setRoleFilter('HoD');
            setStatusFilter('');
            setAdvisorFilter(false);
          }}
          className={`border p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-md transition duration-200 active:scale-98 rounded-2xl ${
            roleFilter === 'HoD' && !advisorFilter
              ? 'bg-violet-50/40 border-violet-300 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.15)] ring-2 ring-violet-500/20'
              : 'bg-white border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]'
          }`}
        >
          <div className="bg-violet-600 p-3 rounded-xl"><FileText className="w-6 h-6 text-white" /></div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Dynamic Permissions</h4>
            <p className="text-[11px] font-semibold text-slate-500">Filter profiles by HOD role</p>
          </div>
        </div>
      </div>

      <FacultyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        facultyToEdit={editFaculty}
        onSuccess={fetchFaculty}
        departmentOnly={departmentOnly}
      />
    </div>
  );
}
