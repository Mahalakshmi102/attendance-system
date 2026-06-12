import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StudentModal({ isOpen, onClose, studentToEdit, onSuccess, departmentOnly }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registerNumber: '',
    rollNumber: '',
    department: departmentOnly ? user?.department || '' : '',
    batch: '',
    year: 0,
    semester: 0,
    section: '',
    gender: 'Male',
    dob: '',
    mobile: '',
    address: '',
    parentName: '',
    parentMobile: '',
    isActive: true,
    password: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        name: studentToEdit.name || '',
        email: studentToEdit.email || '',
        registerNumber: studentToEdit.registerNumber || '',
        rollNumber: studentToEdit.rollNumber || '',
        department: studentToEdit.department || '',
        batch: studentToEdit.batch || '',
        year: studentToEdit.year ?? 0,
        semester: studentToEdit.semester ?? 0,
        section: studentToEdit.section || '',
        gender: studentToEdit.gender || 'Male',
        dob: studentToEdit.dob ? new Date(studentToEdit.dob).toISOString().split('T')[0] : '',
        mobile: studentToEdit.mobile || '',
        address: studentToEdit.address || '',
        parentName: studentToEdit.parentDetails?.name || '',
        parentMobile: studentToEdit.parentDetails?.mobile || '',
        isActive: studentToEdit.isActive ?? true,
        password: '', // empty for edit unless they want to change it
        resetToDob: false,
        reason: ''
      });
    } else {
      // Reset form
      setFormData({
        name: '', email: '', registerNumber: '', rollNumber: '', department: departmentOnly ? user?.department || '' : '', batch: '', year: 0, semester: 0, section: '',
        gender: 'Male', dob: '', mobile: '', address: '', parentName: '', parentMobile: '', isActive: true, password: '', resetToDob: false, reason: ''
      });
    }
  }, [studentToEdit, isOpen, departmentOnly, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      role: 'Student',
      parentDetails: { name: formData.parentName, mobile: formData.parentMobile }
    };
    
    if (!payload.dob) delete payload.dob;

    try {
      if (studentToEdit) {
        await axios.put(apiUrl(`/api/admin/users/${studentToEdit._id}`), payload, { headers: withAuthHeader() });
      } else {
        await axios.post(apiUrl('/api/admin/users'), payload, { headers: withAuthHeader() });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save student');
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
            <h3 className="text-xl font-extrabold text-slate-800">{studentToEdit ? 'Edit Student Profile' : 'Add New Student'}</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Manual entry for student records and personal information.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {error && <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-semibold text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Academic Details */}
            <div className="lg:col-span-3">
              <h4 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider mb-4 border-b pb-2">Academic Information</h4>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Register Number</label>
              <input required name="registerNumber" value={formData.registerNumber} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
              <select required name="department" value={formData.department} onChange={handleChange} disabled={departmentOnly} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-75">
                <option value="">Select Dept</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="IT">IT</option>
                <option value="EEE">EEE</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Batch (e.g. 2025-2027)</label>
              <input name="batch" value={formData.batch} onChange={handleChange} placeholder="2025-2027" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Year</label>
                <input required name="year" type="number" min="1" max="4" value={formData.year} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Sem</label>
                <input required name="semester" type="number" min="1" max="8" value={formData.semester} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Sec</label>
                <input required name="section" value={formData.section} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none uppercase" />
              </div>
            </div>

            {/* Personal Details */}
            <div className="lg:col-span-3 mt-4">
              <h4 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider mb-4 border-b pb-2">Personal Details</h4>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
              <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Mobile Number</label>
              <input required name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Roll Number (Optional)</label>
              <input name="rollNumber" value={formData.rollNumber} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-1">Residential Address</label>
              <input name="address" value={formData.address} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div className="lg:col-span-3 mt-4">
              <h4 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider mb-4 border-b pb-2">Parent / Guardian & Account</h4>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Parent Name</label>
              <input name="parentName" value={formData.parentName} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Parent Mobile</label>
              <input name="parentMobile" value={formData.parentMobile} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{studentToEdit ? 'Change Password (leave blank to keep current)' : 'Password'}</label>
              <input type="password" name="password" required={!studentToEdit} value={formData.password} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none disabled:opacity-50 disabled:cursor-not-allowed" disabled={formData.resetToDob} />
              {studentToEdit && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input type="checkbox" name="resetToDob" checked={formData.resetToDob || false} onChange={handleChange} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                  <span className="text-xs font-semibold text-slate-600">Reset password to Date of Birth</span>
                </label>
              )}
            </div>
            
            {studentToEdit && (
              <div className="lg:col-span-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100 mt-2">
                <label className="block text-xs font-black text-rose-700 uppercase tracking-wider mb-1.5">Reason for Modification (Mandatory for Audit Logs)</label>
                <input required name="reason" value={formData.reason} onChange={handleChange} placeholder="e.g. Updating correct mobile number and parent contact details per student request." className="w-full p-2.5 bg-white border border-rose-200 rounded-lg outline-none text-sm text-slate-700 focus:ring-2 focus:ring-rose-500/20 font-semibold" />
              </div>
            )}

            <div className="lg:col-span-3 flex items-center mt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-3 text-sm font-bold text-slate-700">Account Active</span>
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50">
              {loading ? 'Saving...' : studentToEdit ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
