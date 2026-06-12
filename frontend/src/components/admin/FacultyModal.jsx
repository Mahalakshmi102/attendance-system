import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { X, Shield, BookOpen, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function FacultyModal({ isOpen, onClose, facultyToEdit, onSuccess, departmentOnly }) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registerNumber: '', // Faculty ID
    employeeId: '',
    department: departmentOnly ? user?.department || '' : '',
    gender: 'Male',
    dob: '',
    mobile: '',
    address: '',
    designation: 'Assistant Professor',
    qualification: '',
    experience: '',
    dateOfJoining: '',
    employmentStatus: 'Full-time',
    isActive: true,
    password: '',
    
    // Class Advisor
    isClassAdvisor: false,
    advisorDepartment: '',
    advisorYear: '1',
    advisorSemester: '1',
    advisorSection: 'A',
    
    // Permissions
    permissions: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const designations = [
    'Professor & Head (HOD)',
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Lecturer',
    'Controller of Examinations',
    'Principal',
    'Class Advisor'
  ];

  const permissionsList = [
    { key: 'mark_attendance', label: 'Mark Attendance', desc: 'Allows marking live QR/manual session records.' },
    { key: 'edit_attendance', label: 'Edit/Correct Attendance', desc: 'Allows editing previously locked attendance records.' },
    { key: 'view_analytics', label: 'View Academic Analytics', desc: 'Provides access to view class-level aggregated attendance charts.' },
    { key: 'view_reports', label: 'Generate Reports', desc: 'Allows generation and downloading of Excel attendance summaries.' },
    { key: 'manage_timetable', label: 'Manage Schedules', desc: 'Allows creating and editing timetable calendar slots.' },
    { key: 'manage_faculty', label: 'Manage Faculty/Staff', desc: 'Grants access to add, edit, or delete faculty/HOD accounts.' }
  ];

  useEffect(() => {
    if (facultyToEdit) {
      setFormData({
        name: facultyToEdit.name || '',
        email: facultyToEdit.email || '',
        registerNumber: facultyToEdit.registerNumber || '',
        employeeId: facultyToEdit.employeeId || '',
        department: facultyToEdit.department || '',
        gender: facultyToEdit.gender || 'Male',
        dob: facultyToEdit.dob ? new Date(facultyToEdit.dob).toISOString().split('T')[0] : '',
        mobile: facultyToEdit.mobile || '',
        address: facultyToEdit.address || '',
        designation: facultyToEdit.designation || 'Assistant Professor',
        qualification: facultyToEdit.qualification || '',
        experience: facultyToEdit.experience || '',
        dateOfJoining: facultyToEdit.dateOfJoining ? new Date(facultyToEdit.dateOfJoining).toISOString().split('T')[0] : '',
        employmentStatus: facultyToEdit.employmentStatus || 'Full-time',
        isActive: facultyToEdit.isActive ?? true,
        password: '',
        resetToDob: false,
        
        isClassAdvisor: facultyToEdit.classAdvisorDetails?.isClassAdvisor || false,
        advisorDepartment: facultyToEdit.classAdvisorDetails?.department || facultyToEdit.department || '',
        advisorYear: facultyToEdit.classAdvisorDetails?.year || '1',
        advisorSemester: facultyToEdit.classAdvisorDetails?.semester || '1',
        advisorSection: facultyToEdit.classAdvisorDetails?.section || 'A',
        
        permissions: facultyToEdit.permissions || []
      });
    } else {
      setFormData({
        name: '', email: '', registerNumber: '', employeeId: '',
        department: departmentOnly ? user?.department || '' : '',
        gender: 'Male', dob: '', mobile: '', address: '',
        designation: 'Assistant Professor', qualification: '', experience: '',
        dateOfJoining: new Date().toISOString().split('T')[0], employmentStatus: 'Full-time',
        isActive: true, password: '', resetToDob: false,
        isClassAdvisor: false, advisorDepartment: departmentOnly ? user?.department || '' : '',
        advisorYear: '1', advisorSemester: '1', advisorSection: 'A',
        permissions: ['mark_attendance', 'view_analytics', 'view_reports']
      });
    }
  }, [facultyToEdit, isOpen, departmentOnly, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      if (name === 'designation' && value === 'Class Advisor') {
        updated.isClassAdvisor = true;
      }
      return updated;
    });
  };

  const handlePermissionChange = (permKey) => {
    setFormData(prev => {
      const activePerms = [...prev.permissions];
      if (activePerms.includes(permKey)) {
        return { ...prev, permissions: activePerms.filter(k => k !== permKey) };
      } else {
        return { ...prev, permissions: [...activePerms, permKey] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Map designation to appropriate Mongoose Schema Role
    let finalRole = 'Faculty';
    if (formData.designation.includes('HOD') || formData.designation.includes('Head')) {
      finalRole = 'HoD';
    } else if (formData.designation.includes('Principal')) {
      finalRole = 'Principal';
    } else if (formData.designation.includes('Examinations') || formData.designation.includes('CoE')) {
      finalRole = 'CoE';
    } else if (formData.designation.includes('Advisor')) {
      finalRole = 'Class Advisor';
    }

    const payload = {
      ...formData,
      role: finalRole,
      classAdvisorDetails: {
        isClassAdvisor: formData.isClassAdvisor,
        department: formData.isClassAdvisor ? formData.advisorDepartment : '',
        year: formData.isClassAdvisor ? formData.advisorYear : '',
        semester: formData.isClassAdvisor ? formData.advisorSemester : '',
        section: formData.isClassAdvisor ? formData.advisorSection : ''
      }
    };

    if (!payload.dob) delete payload.dob;
    if (!payload.dateOfJoining) delete payload.dateOfJoining;

    try {
      if (facultyToEdit) {
        await axios.put(apiUrl(`/api/admin/users/${facultyToEdit._id}`), payload, { headers: withAuthHeader() });
      } else {
        await axios.post(apiUrl('/api/admin/users'), payload, { headers: withAuthHeader() });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save faculty profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto">
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">{facultyToEdit ? 'Edit Academic Profile' : 'Add Academic Staff'}</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Configure professional profiles, permissions, and class advisory roles.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {error && <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-sm">{error}</div>}

          <div className="space-y-8">
            
            {/* Professional Profiles */}
            <div>
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 border-b border-indigo-50/50 pb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Professional Profile
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Designation</label>
                  <select required name="designation" value={formData.designation} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-700">
                    {designations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                  <select required name="department" value={formData.department} onChange={handleChange} disabled={departmentOnly} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-700 disabled:opacity-75">
                    <option value="">Select Dept</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Employment Status</label>
                  <select required name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold text-slate-700">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Ad-hoc">Ad-hoc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Faculty ID / Username</label>
                  <input required name="registerNumber" value={formData.registerNumber} onChange={handleChange} placeholder="e.g. FAC101" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Employee ID</label>
                  <input name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="e.g. EMP40051" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Date of Joining</label>
                  <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Qualifications</label>
                  <input required name="qualification" value={formData.qualification} onChange={handleChange} placeholder="e.g. M.Tech, Ph.D" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Experience (Years)</label>
                  <input name="experience" value={formData.experience} onChange={handleChange} placeholder="e.g. 5 Years" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 border-b border-indigo-50/50 pb-2 flex items-center gap-2">
                <UserCircle2 className="w-4 h-4" /> Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                  <input required name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">{facultyToEdit ? 'Change Password (optional)' : 'Password'}</label>
                  <input type="password" name="password" required={!facultyToEdit} value={formData.password} onChange={handleChange} placeholder={facultyToEdit ? '••••••••' : 'Password'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={formData.resetToDob} />
                  {facultyToEdit && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input type="checkbox" name="resetToDob" checked={formData.resetToDob || false} onChange={handleChange} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      <span className="text-xs font-semibold text-slate-600">Reset password to Date of Birth</span>
                    </label>
                  )}
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-1.5">Residential Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700" />
                </div>
              </div>
            </div>

            {/* Class Advisor Assignment */}
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" /> Class Advisor Assignment
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">Appoints this faculty member as class advisor responsible for a particular section.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isClassAdvisor" checked={formData.isClassAdvisor} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.isClassAdvisor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 animate-in fade-in-50 duration-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Advised Department</label>
                    <select required={formData.isClassAdvisor} name="advisorDepartment" value={formData.advisorDepartment} onChange={handleChange} disabled={departmentOnly} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none disabled:opacity-75">
                      <option value="">Select Dept</option>
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="IT">IT</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Advised Year</label>
                    <select required={formData.isClassAdvisor} name="advisorYear" value={formData.advisorYear} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none">
                      <option value="1">I Year</option>
                      <option value="2">II Year</option>
                      <option value="3">III Year</option>
                      <option value="4">IV Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Advised Semester</label>
                    <select required={formData.isClassAdvisor} name="advisorSemester" value={formData.advisorSemester} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none">
                      <option value="1">I Sem</option>
                      <option value="2">II Sem</option>
                      <option value="3">III Sem</option>
                      <option value="4">IV Sem</option>
                      <option value="5">V Sem</option>
                      <option value="6">VI Sem</option>
                      <option value="7">VII Sem</option>
                      <option value="8">VIII Sem</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Advised Section</label>
                    <input required={formData.isClassAdvisor} name="advisorSection" value={formData.advisorSection} onChange={handleChange} placeholder="e.g. A" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none uppercase" />
                  </div>
                </div>
              )}
            </div>

            {/* Role-based Permissions */}
            <div>
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 border-b border-indigo-50/50 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Role Permissions
              </h4>
              <p className="text-[11px] font-bold text-slate-400 mb-6">Assign dynamic system permissions. HODs and core staff hold administrative permissions out of the box.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionsList.map((perm) => {
                  const isChecked = formData.permissions.includes(perm.key);
                  return (
                    <div 
                      key={perm.key} 
                      onClick={() => handlePermissionChange(perm.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3.5 select-none ${
                        isChecked 
                          ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}} // handled by div click
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 mt-1 cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-extrabold text-slate-800">{perm.label}</span>
                        <span className="block text-[10px] font-semibold text-slate-400 mt-1 leading-normal">{perm.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Account Status Switch */}
            <div className="flex items-center pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-3 text-xs font-black text-slate-700 uppercase tracking-wider">Account Active</span>
              </label>
            </div>

          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 text-sm shadow-md shadow-indigo-600/10">
              {loading ? 'Saving...' : facultyToEdit ? 'Update Profile' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
