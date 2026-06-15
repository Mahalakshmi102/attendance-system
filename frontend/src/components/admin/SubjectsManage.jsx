import { useState, useEffect } from 'react';
import { getSubjects, addSubject, updateSubject, deleteSubject, bulkDeleteSubjects } from '../../api/adminApi';
import BulkUpload from './BulkUpload';

export default function SubjectsManage() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', credits: 0, department: '', regulation: '', year: 0, semester: 0, subjectType: 'Theory', assignedFaculty: '' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [search, deptFilter, semFilter, subjects]);

  const fetchSubjects = async () => {
    try {
      const res = await getSubjects();
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateSubject(editingId, {
          ...form,
          credits: Number(form.credits)
        });
        setEditingId(null);
      } else {
        await addSubject({
          ...form,
          credits: Number(form.credits)
        });
      }
      setForm({ name: '', code: '', credits: 0, department: '', regulation: '', year: 0, semester: 0, subjectType: 'Theory', assignedFaculty: '' });
      fetchSubjects();
    } catch (err) {
      alert(editingId ? 'Error updating subject' : 'Error adding subject');
    }
  };

  const handleEdit = (subject) => {
    setEditingId(subject._id);
    setForm({
      name: subject.name || '',
      code: subject.code || '',
      credits: subject.credits || 0,
      department: subject.department || '',
      regulation: subject.regulation || '',
      year: subject.year || 0,
      semester: subject.semester || 0,
      subjectType: subject.subjectType || 'Theory',
      assignedFaculty: subject.assignedFaculty || ''
    });
    // Scroll smoothly to the form for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Delete subject ${subject.name}?`)) return;
    try {
      await deleteSubject(subject._id);
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting subject');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredSubjects.map(s => s._id)])));
    } else {
      setSelectedIds(prev => prev.filter(id => !filteredSubjects.some(s => s._id === id)));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected subjects?`)) return;

    try {
      await bulkDeleteSubjects(selectedIds);
      alert('Selected subjects deleted successfully!');
      setSelectedIds([]);
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting selected subjects');
    }
  };

  const handleToggleActive = async (subject) => {
    try {
      await updateSubject(subject._id, { isActive: !subject.isActive });
      fetchSubjects();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === '' || s.department === deptFilter;
    const matchesSem = semFilter === '' || s.semester === semFilter;
    return matchesSearch && matchesDept && matchesSem;
  });

  const uniqueDepts = [...new Set(subjects.map(s => s.department).filter(Boolean))];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Subject Management</h2>
      
      <BulkUpload type="subjects" onUploadSuccess={fetchSubjects} />

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input required placeholder="Subject Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border p-2 rounded" />
        <input required placeholder="Subject Code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="border p-2 rounded font-mono" />
        <input required type="number" placeholder="Credits" value={form.credits} onChange={e => setForm({...form, credits: e.target.value})} className="border p-2 rounded" />
        <input required placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="border p-2 rounded" />
        
        <input placeholder="Regulation (e.g. 2021)" value={form.regulation} onChange={e => setForm({...form, regulation: e.target.value})} className="border p-2 rounded" />
        <input placeholder="Year" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="border p-2 rounded" />
        <input placeholder="Semester" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="border p-2 rounded" />
        <select value={form.subjectType} onChange={e => setForm({...form, subjectType: e.target.value})} className="border p-2 rounded">
           <option value="Theory">Theory</option>
           <option value="Lab">Lab</option>
        </select>
        <div className="md:col-span-4 flex gap-2">
          <button type="submit" className="flex-grow bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition font-medium">
            {editingId ? 'Update Subject' : 'Add Subject'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={() => {
                setEditingId(null);
                setForm({ name: '', code: '', credits: 0, department: '', regulation: '', year: 0, semester: 0, subjectType: 'Theory', assignedFaculty: '' });
              }} 
              className="bg-slate-200 text-slate-700 p-2 rounded hover:bg-slate-300 transition font-medium px-6"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
         <input type="text" placeholder="Search code or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 rounded w-full md:w-64" />
         <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border p-2 rounded">
            <option value="">All Departments</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
         </select>
         <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} className="border p-2 rounded">
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
         </select>
         {selectedIds.length > 0 && (
           <button 
             onClick={handleDeleteSelected}
             className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-750 transition flex items-center gap-1.5 shadow-md text-xs h-[38px]"
           >
             Delete Selected ({selectedIds.length})
           </button>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-center w-12">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={filteredSubjects.length > 0 && filteredSubjects.every(s => selectedIds.includes(s._id))}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="p-4">Code</th>
              <th className="p-4">Name</th>
              <th className="p-4">Department</th>
              <th className="p-4">Sem/Year</th>
              <th className="p-4">Type</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.map(s => (
              <tr key={s._id} className="border-b hover:bg-slate-50">
                <td className="p-4 text-center w-12">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(s._id)} 
                    onChange={() => handleSelectRow(s._id)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="p-4 font-mono font-bold text-slate-700">{s.code}</td>
                <td className="p-4">{s.name}</td>
                <td className="p-4">{s.department}</td>
                <td className="p-4">{s.semester ? `Sem ${s.semester}` : '-'} / {s.year ? `Yr ${s.year}` : '-'}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${s.subjectType === 'Lab' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{s.subjectType || 'Theory'}</span></td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${s.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {s.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button onClick={() => handleToggleActive(s)} className={`px-3 py-1.5 text-xs font-bold rounded ${s.isActive !== false ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                    {s.isActive !== false ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleEdit(s)} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">Edit</button>
                  <button onClick={() => handleDelete(s)} className="px-3 py-1.5 bg-red-100 text-red-800 rounded text-xs font-bold">Delete</button>
                </td>
              </tr>
            ))}
            {filteredSubjects.length === 0 && (
              <tr>
                <td className="p-4 text-slate-500 italic text-center" colSpan={7}>No subjects found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
