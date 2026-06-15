import { useState, useEffect } from 'react';
import { getUsers, addUser, updateUser, deleteUser, bulkDeleteUsers } from '../../api/adminApi';
import BulkUpload from './BulkUpload';

export default function UsersManage({ roleType }) {
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', dob: '', role: roleType, department: '', semester: 0, batch: '' });

  useEffect(() => {
    fetchUsers();
    setForm(prev => ({ ...prev, role: roleType, dob: '', batch: '' }));
    setSelectedIds([]);
  }, [roleType]);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.filter(u => u.role === roleType));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addUser({ ...form, role: roleType });
      setForm({ name: '', email: '', password: '', dob: '', role: roleType, department: '', semester: 0, batch: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding user');
    }
  };

  const handleEdit = async (user) => {
    const name = prompt('Enter updated name', user.name);
    if (!name) return;
    const email = prompt('Enter updated email', user.email);
    if (!email) return;
    const dobInput = prompt('Enter updated Date of Birth (YYYY-MM-DD)', user.dob ? new Date(user.dob).toISOString().split('T')[0] : '');
    const dob = dobInput ? new Date(dobInput) : user.dob;
    const batch = roleType === 'Student' ? prompt('Enter updated Batch (e.g. 2025-2027)', user.batch || '') : undefined;
    const isActive = window.confirm(`Is this ${roleType} active? Click OK for Yes, Cancel for No.`) ? true : false;
    const password = prompt('Optional: Enter new password (leave blank to keep current)', '');

    try {
      await updateUser(user._id, { name, email, role: roleType, dob, isActive, password, batch });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating user');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${roleType} ${user.name}?`)) return;
    try {
      await deleteUser(user._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      fetchUsers();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleResetToDob = async (user) => {
    if (!user.dob) {
      alert('This user does not have a Date of Birth set in their profile.');
      return;
    }
    const formattedDob = new Date(user.dob).toLocaleDateString();
    if (!window.confirm(`Are you sure you want to reset the password for ${user.name} to their Date of Birth (${formattedDob})?`)) return;
    
    try {
      await updateUser(user._id, { ...user, resetToDob: true });
      alert(`Password reset successful! The temporary password is set to their Date of Birth (format: DDMMYYYY).`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error resetting password');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(users.map(u => u._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete all ${selectedIds.length} selected ${roleType}s?`)) return;
    const secondConfirm = window.confirm(`This action is permanent and cannot be undone. All selected accounts and their credentials will be deleted.\n\nAre you absolutely sure?`);
    if (!secondConfirm) return;

    const confirmationText = window.prompt(`To proceed, please type "DELETE" below to confirm bulk deletion:`);
    if (confirmationText !== 'DELETE') {
      alert('Bulk deletion cancelled: Confirmation text did not match "DELETE".');
      return;
    }

    try {
      await bulkDeleteUsers(selectedIds);
      alert(`Successfully deleted ${selectedIds.length} ${roleType}s.`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error performing bulk deletion.');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{roleType} Management</h2>
      
      <BulkUpload type="users" onUploadSuccess={fetchUsers} />

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-6 gap-4">
        <input required placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border p-2 rounded col-span-2" />
        <input required type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border p-2 rounded col-span-2" />
        <input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="border p-2 rounded col-span-2" />
        <input placeholder="Department (e.g. CSE)" value={form.department || ''} onChange={e => setForm({...form, department: e.target.value})} className="border p-2 rounded col-span-2" />
        <input required type="date" placeholder="Date of Birth" value={form.dob || ''} onChange={e => setForm({...form, dob: e.target.value})} className="border p-2 rounded col-span-2 text-slate-500" />
        {roleType === 'Student' && (
           <>
             <input placeholder="Batch (e.g. 2025-2027)" value={form.batch || ''} onChange={e => setForm({...form, batch: e.target.value})} className="border p-2 rounded col-span-2" />
             <input placeholder="Semester" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="border p-2 rounded col-span-2" />
           </>
        )}
        <button type="submit" className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition font-medium col-span-2">Add {roleType}</button>
      </form>

      {selectedIds.length > 0 && (
        <div className="flex justify-between items-center mb-4 bg-rose-50 border border-rose-100 rounded-xl p-3">
          <span className="text-xs font-bold text-rose-700">
            {selectedIds.length} {roleType}s selected for action
          </span>
          <button 
            onClick={handleDeleteSelected}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center border-r border-slate-100">
                  <input 
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={users.length > 0 && users.every(u => selectedIds.includes(u._id))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">Name</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Email</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Department</th>
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Date of Birth</th>
                {roleType === 'Student' && (
                  <>
                    <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Batch</th>
                    <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Semester</th>
                  </>
                )}
                <th className="p-4 font-bold text-slate-800 border-r border-slate-100">Status</th>
                <th className="p-4 font-bold text-slate-800 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50 transition">
                  <td className="p-4 text-center border-r border-slate-100">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(u._id)}
                      onChange={() => handleSelectRow(u._id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-bold text-slate-800 text-left border-r border-slate-100">{u.name}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-100">{u.email}</td>
                  <td className="p-4 font-semibold text-slate-600 border-r border-slate-100">{u.department}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-100">{u.dob ? new Date(u.dob).toLocaleDateString() : '-'}</td>
                  {roleType === 'Student' && (
                    <>
                      <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{u.batch || '-'}</td>
                      <td className="p-4 font-semibold text-slate-700 border-r border-slate-100">{u.semester || '-'}</td>
                    </>
                  )}
                  <td className="p-4 border-r border-slate-100">
                    <span className={`px-3 py-1 rounded text-xs font-bold ${u.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {u.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button onClick={() => handleToggleActive(u)} className={`px-2.5 py-1 text-xs font-bold rounded transition ${u.isActive !== false ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {u.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleEdit(u)} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition">Edit</button>
                      <button onClick={() => handleResetToDob(u)} className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded text-xs font-bold hover:bg-purple-100 transition">Reset DOB</button>
                      <button onClick={() => handleDelete(u)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            {users.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500 italic" colSpan={roleType === 'Student' ? 9 : 7}>No {roleType.toLowerCase()}s found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
