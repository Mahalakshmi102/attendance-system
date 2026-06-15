import { useState, useEffect } from 'react';
import { getTimetable, addTimetable, updateTimetable, deleteTimetable, bulkDeleteTimetable, getSubjects, getUsers } from '../../api/adminApi';
import BulkUpload from './BulkUpload';
import { useAuth } from '../../context/AuthContext';
import { Edit, Trash2, Power, PlusCircle, ChevronDown, ChevronUp, Clock, MapPin, User } from 'lucide-react';

export default function TimetableManage({ departmentOnly }) {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [form, setForm] = useState({ 
    department: departmentOnly ? user?.department || '' : '', year: 0, semester: 0, section: '',
    dayOfWeek: 'Monday', period: 0, subject: '', faculty: '', 
    classroom: '', startTime: '', endTime: ''
  });
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(departmentOnly ? user?.department || '' : '');
  const [yearFilter, setYearFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  
  // Accordion open/close states
  const [expandedClasses, setExpandedClasses] = useState({});

  useEffect(() => {
    if (departmentOnly && user?.department) {
      setForm(f => ({ ...f, department: user.department }));
      setDeptFilter(user.department);
    }
  }, [departmentOnly, user]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [timetable, search, deptFilter, yearFilter, semFilter, dayFilter]);

  const fetchData = async () => {
    try {
      const [tRes, sRes, uRes] = await Promise.all([
        getTimetable(), getSubjects(), getUsers()
      ]);
      setTimetable(tRes.data);
      setSubjects(sRes.data);
      setFaculty(uRes.data.filter(u => u.role === 'Faculty' || u.role === 'Class Advisor'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        department: departmentOnly ? user?.department : form.department,
        subject: form.subject,
        faculty: form.faculty
      };
      if (editingId) {
        await updateTimetable(editingId, payload);
        setEditingId(null);
      } else {
        await addTimetable(payload);
      }
      setForm({ 
        department: departmentOnly ? user?.department || '' : '', 
        year: 0, 
        semester: 0, 
        section: '',
        dayOfWeek: 'Monday', 
        period: 0, 
        subject: '', 
        faculty: '', 
        classroom: '', 
        startTime: '', 
        endTime: '' 
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || (editingId ? 'Error updating timetable entry' : 'Error adding timetable entry. Possible clash detected.'));
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry._id);
    setForm({
      department: entry.department || '',
      year: entry.year || 0,
      semester: entry.semester || 0,
      section: entry.section || '',
      dayOfWeek: entry.dayOfWeek || 'Monday',
      period: entry.period || 0,
      subject: entry.subject?._id || entry.subject || '',
      faculty: entry.faculty?._id || entry.faculty || '',
      classroom: entry.classroom || '',
      startTime: entry.startTime || '',
      endTime: entry.endTime || ''
    });
    document.getElementById('timetable-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete timetable for ${entry.department} ${entry.year} Yr Sem ${entry.semester} Sec ${entry.section} (${entry.dayOfWeek} ${entry.startTime})?`)) return;
    try {
      await deleteTimetable(entry._id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting timetable entry');
    }
  };

  const handleToggleActive = async (entry) => {
    try {
      await updateTimetable(entry._id, { isActive: !entry.isActive });
      fetchData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete all ${selectedIds.length} selected timetable slots?`)) return;
    const secondConfirm = window.confirm(`This action is permanent and cannot be undone.\n\nAre you absolutely sure?`);
    if (!secondConfirm) return;

    const confirmationText = window.prompt(`To proceed, please type "DELETE" below to confirm bulk deletion:`);
    if (confirmationText !== 'DELETE') {
      alert('Bulk deletion cancelled: Confirmation text did not match "DELETE".');
      return;
    }

    try {
      await bulkDeleteTimetable(selectedIds);
      alert(`Successfully deleted ${selectedIds.length} timetable entries.`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error performing bulk deletion.');
    }
  };

  const filteredTimetable = timetable.filter(t => {
    const matchesDept = deptFilter === '' || t.department === deptFilter;
    const matchesYear = yearFilter === '' || t.year === yearFilter;
    const matchesSem = semFilter === '' || t.semester === semFilter;
    const matchesDay = dayFilter === '' || t.dayOfWeek === dayFilter;
    
    // search across classroom, subject name, faculty name, section
    const term = search.toLowerCase();
    const matchesSearch = search === '' || 
      (t.classroom && t.classroom.toLowerCase().includes(term)) ||
      (t.section && t.section.toLowerCase().includes(term)) ||
      (t.subject?.name && t.subject.name.toLowerCase().includes(term)) ||
      (t.faculty?.name && t.faculty.name.toLowerCase().includes(term));

    return matchesDept && matchesYear && matchesSem && matchesDay && matchesSearch;
  });

  // Group timetable by class
  const groupedClasses = {};
  filteredTimetable.forEach(entry => {
    const classKey = `${entry.department} - Year ${entry.year} (Sem ${entry.semester}) - Sec ${entry.section}`;
    if (!groupedClasses[classKey]) {
      groupedClasses[classKey] = [];
    }
    groupedClasses[classKey].push(entry);
  });

  const getUniquePeriodsForClass = (classEntries) => {
    const periodSet = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']);
    classEntries.forEach(entry => {
      if (entry.period) {
        periodSet.add(entry.period);
      }
    });
    return Array.from(periodSet).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, ''), 10);
      const bNum = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  };

  const toggleClassExpansion = (classKey) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classKey]: !prev[classKey]
    }));
  };

  const handleCellPlusClick = (classKey, day, period, classEntries) => {
    const reference = classEntries[0];
    if (!reference) return;

    setEditingId(null);
    setForm({
      ...form,
      department: reference.department,
      year: reference.year,
      semester: reference.semester,
      section: reference.section,
      dayOfWeek: day,
      period: period,
      subject: '',
      faculty: '',
      classroom: reference.classroom || ''
    });

    document.getElementById('timetable-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const uniqueDepts = [...new Set(timetable.map(t => t.department).filter(Boolean))];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Master Timetable Management</h2>
      <p className="text-slate-600 mb-6">Upload or manage the central scheduling system. The system automatically performs clash detection and activates faculty portals strictly during their allocated time slots.</p>
      
      <BulkUpload type="timetable" onUploadSuccess={fetchData} />

      <form id="timetable-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input required placeholder="Department (e.g. CSE)" value={departmentOnly ? user?.department || '' : form.department} onChange={e => setForm({...form, department: e.target.value})} disabled={departmentOnly} className="border p-2 rounded bg-slate-50 disabled:opacity-75" />
        <input required placeholder="Year (e.g. 3)" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="border p-2 rounded" />
        <input required placeholder="Semester (e.g. 5)" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className="border p-2 rounded" />
        <input required placeholder="Section (e.g. A)" value={form.section} onChange={e => setForm({...form, section: e.target.value})} className="border p-2 rounded" />
        
        <select required value={form.dayOfWeek} onChange={e => setForm({...form, dayOfWeek: e.target.value})} className="border p-2 rounded">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input required type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="border p-2 rounded" title="Start Time" />
        <input required type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="border p-2 rounded" title="End Time" />
        <input placeholder="Period (e.g. Period 1)" value={form.period} onChange={e => setForm({...form, period: e.target.value})} className="border p-2 rounded" />

        <select required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="border p-2 rounded md:col-span-2">
          <option value="">Select Subject...</option>
          {subjects.filter(s => !form.department || s.department === form.department).map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        <select required value={form.faculty} onChange={e => setForm({...form, faculty: e.target.value})} className="border p-2 rounded">
          <option value="">Select Faculty...</option>
          {faculty.filter(f => !form.department || f.department === form.department).map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <input required placeholder="Classroom / Lab" value={form.classroom} onChange={e => setForm({...form, classroom: e.target.value})} className="border p-2 rounded" />
        
        <div className="md:col-span-4 flex gap-2">
          <button type="submit" className="flex-grow bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition font-bold shadow-sm">
            {editingId ? 'Update Timetable Entry' : 'Add Timetable Entry'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={() => {
                setEditingId(null);
                setForm({
                  department: departmentOnly ? user?.department || '' : '',
                  year: 0,
                  semester: 0,
                  section: '',
                  dayOfWeek: 'Monday',
                  period: 0,
                  subject: '',
                  faculty: '',
                  classroom: '',
                  startTime: '',
                  endTime: ''
                });
              }} 
              className="bg-slate-200 text-slate-700 p-2 rounded hover:bg-slate-300 transition font-bold px-6"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4">
         <input type="text" placeholder="Search subject, faculty, room..." value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 rounded w-full md:w-64" />
         {!departmentOnly && (
           <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border p-2 rounded">
              <option value="">All Departments</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
           </select>
         )}
         <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="border p-2 rounded">
            <option value="">All Years</option>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
         </select>
         <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} className="border p-2 rounded">
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
         </select>
         <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="border p-2 rounded">
            <option value="">All Days</option>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
         </select>
      </div>

      {(filteredTimetable.length > 0 || selectedIds.length > 0) && (
        <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input 
              type="checkbox"
              checked={filteredTimetable.length > 0 && filteredTimetable.every(slot => selectedIds.includes(slot._id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(filteredTimetable.map(slot => slot._id));
                } else {
                  setSelectedIds([]);
                }
              }}
              className="w-4 h-4 text-indigo-650 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
            />
            Select All Filtered Slots ({filteredTimetable.length})
          </label>

          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              Delete Selected Slots ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {Object.keys(groupedClasses).map((classKey) => {
          const classEntries = groupedClasses[classKey];
          const classPeriods = getUniquePeriodsForClass(classEntries);
          const isExpanded = expandedClasses[classKey] ?? false;

          return (
            <div key={classKey} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => toggleClassExpansion(classKey)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition border-b border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 text-indigo-600 font-extrabold px-3 py-1 rounded-lg text-sm border border-indigo-100/50">
                    {classEntries[0]?.department}
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    {classKey.replace(`${classEntries[0]?.department} - `, '')} Timetable
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    ({classEntries.length} periods scheduled)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-6 overflow-x-auto">
                  <table className="w-full table-fixed min-w-[800px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <th className="w-28 p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Day</th>
                        {classPeriods.map(period => (
                          <th key={period} className="p-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daysOfWeek.map(day => (
                        <tr key={day} className="hover:bg-slate-50/30 transition">
                          {/* Day Column */}
                          <td className="p-3 align-middle font-bold text-slate-700 text-sm border-r border-slate-100/50 bg-slate-50/20">
                            {day}
                          </td>

                          {/* Period Columns */}
                          {classPeriods.map(period => {
                            const slot = classEntries.find(e => e.dayOfWeek === day && e.period === period);

                            if (slot) {
                              const isActive = slot.isActive !== false;
                              return (
                                <td key={period} className="p-2 align-top text-center border-r border-slate-100/50 last:border-r-0">
                                  <div className={`group relative p-3 rounded-xl border transition-all duration-200 text-left h-full flex flex-col justify-between ${
                                    isActive
                                      ? 'bg-indigo-50/30 border-indigo-100/70 hover:border-indigo-300 hover:shadow-sm'
                                      : 'bg-slate-50 border-slate-200 opacity-70'
                                  }`}>
                                    <input 
                                      type="checkbox"
                                      checked={selectedIds.includes(slot._id)}
                                      onChange={() => handleSelectRow(slot._id)}
                                      className="absolute top-2.5 right-2.5 w-4 h-4 text-indigo-655 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer z-10"
                                      title="Select slot"
                                    />
                                    <div>
                                      {/* Subject */}
                                      <span className="block font-black text-indigo-900 text-xs tracking-wide">
                                        {slot.subject?.code || 'SUBJ'}
                                      </span>
                                      <span className="block text-[10px] font-semibold text-slate-500 truncate leading-snug mt-0.5" title={slot.subject?.name}>
                                        {slot.subject?.name || 'Subject Name'}
                                      </span>
                                      
                                      {/* Faculty */}
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mt-2">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="truncate">{slot.faculty?.name || 'Unassigned'}</span>
                                      </span>

                                      {/* Room */}
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mt-1">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{slot.classroom || 'Lab'}</span>
                                      </span>

                                      {/* Time */}
                                      <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 mt-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{slot.startTime} - {slot.endTime}</span>
                                      </span>
                                    </div>

                                    {/* Action Hover Controls */}
                                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleActive(slot)}
                                        className={`p-1 rounded transition ${
                                          isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                        title={isActive ? 'Deactivate' : 'Activate'}
                                      >
                                        <Power className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(slot)}
                                        className="p-1 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition"
                                        title="Edit"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(slot)}
                                        className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              );
                            } else {
                              return (
                                <td key={period} className="p-2 align-middle text-center border-r border-slate-100/50 last:border-r-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCellPlusClick(classKey, day, period, classEntries)}
                                    className="w-full aspect-video border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-350 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/10 transition-all duration-200"
                                    title={`Add slot for ${day} ${period}`}
                                  >
                                    <PlusCircle className="w-5 h-5" />
                                  </button>
                                </td>
                              );
                            }
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(groupedClasses).length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-500 italic">
            No timetable entries found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
