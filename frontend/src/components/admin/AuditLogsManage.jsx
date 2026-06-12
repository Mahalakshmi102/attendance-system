import { useState, useEffect } from 'react';
import { getLogs, downloadExcelReport } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Calendar, Filter, RefreshCw, Download, 
  Eye, FileText, ChevronLeft, ChevronRight, AlertCircle, Info, ShieldAlert
} from 'lucide-react';

const AuditLogsManage = ({ departmentOnly = false }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters state
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [targetModel, setTargetModel] = useState('');
  const [department, setDepartment] = useState(departmentOnly ? user?.department || '' : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Diff Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // Action options based on common actions
  const actionsList = [
    { value: '', label: 'All Actions' },
    { value: 'Created User', label: 'Create User' },
    { value: 'Updated User', label: 'Update User' },
    { value: 'Deleted User', label: 'Delete User' },
    { value: 'Created Timetable Slot', label: 'Create Timetable' },
    { value: 'Updated Timetable Slot', label: 'Update Timetable' },
    { value: 'Deleted Timetable Slot', label: 'Delete Timetable' },
    { value: 'Created Calendar Event', label: 'Create Calendar Event' },
    { value: 'Updated Calendar Event', label: 'Update Calendar Event' },
    { value: 'Deleted Calendar Event', label: 'Delete Calendar Event' },
    { value: 'Created Subject', label: 'Create Subject' },
    { value: 'Updated Subject', label: 'Update Subject' },
    { value: 'Deleted Subject', label: 'Delete Subject' },
    { value: 'Edit Student Attendance', label: 'Edit Student Attendance' },
    { value: 'Manual Attendance Update', label: 'Manual Attendance Update' },
    { value: 'Updated System Settings', label: 'Update System Settings' },
    { value: 'Request Approved', label: 'Request Approved' },
    { value: 'Request Rejected', label: 'Request Rejected' },
  ];

  // Target Models
  const modelsList = [
    { value: '', label: 'All Modules' },
    { value: 'User', label: 'User Directory' },
    { value: 'Timetable', label: 'Timetable slots' },
    { value: 'AcademicCalendar', label: 'Academic Calendar' },
    { value: 'Subject', label: 'Subjects' },
    { value: 'Attendance', label: 'Attendance logs' },
    { value: 'Settings', label: 'System Settings' },
    { value: 'Request', label: 'Correction Requests' }
  ];

  const fetchLogsList = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search,
        role,
        targetModel,
        department: departmentOnly ? user?.department : department,
        startDate,
        endDate
      };

      const res = await getLogs(params);
      if (res.data && res.data.success) {
        setLogs(res.data.logs);
        setTotalLogs(res.data.pagination.total);
        setTotalPages(res.data.pagination.pages);
        setCurrentPage(res.data.pagination.page);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsList(1);
  }, [role, targetModel, department, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogsList(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRole('');
    setTargetModel('');
    if (!departmentOnly) setDepartment('');
    setStartDate('');
    setEndDate('');
    fetchLogsList(1);
  };

  const handleDownloadExcel = async () => {
    try {
      const params = {
        search,
        role,
        targetModel,
        department: departmentOnly ? user?.department : department,
        startDate,
        endDate
      };

      const res = await downloadExcelReport('audit', params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `system_audit_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      alert('Error exporting audit logs to Excel.');
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('Created') || action.includes('Approved')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (action.includes('Updated') || action.includes('Edit') || action.includes('Manual')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (action.includes('Deleted') || action.includes('Rejected')) {
      return 'bg-rose-50 text-rose-700 border-rose-100';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  };

  const formatDiffValue = (val) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">None</span>;
    if (typeof val === 'object') {
      return (
        <pre className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 overflow-x-auto max-w-full font-mono">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="font-semibold text-slate-700">{String(val)}</span>;
  };

  const renderDiffModal = () => {
    if (!selectedLog) return null;

    const isOldObject = typeof selectedLog.oldValue === 'object' && selectedLog.oldValue !== null;
    const isNewObject = typeof selectedLog.newValue === 'object' && selectedLog.newValue !== null;

    let keys = [];
    if (isOldObject && isNewObject) {
      keys = Array.from(new Set([...Object.keys(selectedLog.oldValue), ...Object.keys(selectedLog.newValue)]));
    }

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getActionBadgeColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
                <span className="text-xs font-bold text-slate-400">AUDIT DETAILED DIFF</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mt-1">Changes Visualization</h3>
            </div>
            <button 
              onClick={() => setIsDiffModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full transition"
            >
              &times;
            </button>
          </div>

          {/* Details Bar */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Performed By</span>
              <p className="font-extrabold text-slate-700 mt-0.5">{selectedLog.performedByName}</p>
              <p className="text-xs font-bold text-indigo-500 uppercase mt-0.5">{selectedLog.performedByRole} ({selectedLog.performedByDept})</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Time & Date</span>
              <p className="font-extrabold text-slate-700 mt-0.5">{new Date(selectedLog.timestamp).toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">Central Server Log</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm bg-rose-50/10">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wide flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Reason for Change
              </span>
              <p className="font-extrabold text-slate-800 mt-0.5 leading-tight">{selectedLog.reason || 'No specific reason recorded.'}</p>
            </div>
          </div>

          {/* Diff Content */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            
            {/* Object-wise Key diff rendering */}
            {isOldObject && isNewObject ? (
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4 w-1/4">Field Attribute</th>
                      <th className="p-4 bg-rose-50/20 text-rose-800">Original State</th>
                      <th className="p-4 bg-emerald-50/20 text-emerald-800">Modified State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {keys.map(key => {
                      const oldVal = selectedLog.oldValue[key];
                      const newVal = selectedLog.newValue[key];
                      const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                      return (
                        <tr key={key} className={`transition ${hasChanged ? 'bg-indigo-50/10' : 'hover:bg-slate-50/50'}`}>
                          <td className="p-4 font-bold text-slate-600">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </td>
                          <td className={`p-4 bg-rose-50/10 text-slate-700 ${hasChanged ? 'line-through text-rose-600 font-medium' : ''}`}>
                            {formatDiffValue(oldVal)}
                          </td>
                          <td className={`p-4 bg-emerald-50/10 ${hasChanged ? 'font-extrabold text-emerald-700' : 'text-slate-700'}`}>
                            {formatDiffValue(newVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Primitive or other format */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-rose-50/30 p-6 rounded-2xl border border-rose-100">
                  <h4 className="font-extrabold text-rose-800 mb-3 uppercase tracking-wider text-xs">Original Value</h4>
                  {formatDiffValue(selectedLog.oldValue)}
                </div>
                <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100">
                  <h4 className="font-extrabold text-emerald-800 mb-3 uppercase tracking-wider text-xs">Modified Value</h4>
                  {formatDiffValue(selectedLog.newValue)}
                </div>
              </div>
            )}

            {selectedLog.details && typeof selectedLog.details === 'string' && (
              <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-800 text-sm">System Description Details</h5>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">{selectedLog.details}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button 
              onClick={() => setIsDiffModalOpen(false)}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold shadow-md hover:bg-slate-900 transition text-sm"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800">Administrative Log Auditing</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Verify system adjustments, profile modifications, and attendance corrections.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchLogsList(currentPage)}
            className="p-3 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl transition duration-200 flex items-center justify-center"
            title="Refresh Logs Grid"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleDownloadExcel}
            className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> Download Audit Report (Excel)
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search by action, performer name, details, or reasons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
          <button 
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition"
          >
            Apply Search
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {/* Action role filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Staff Performer Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="HoD">HoD</option>
              <option value="Principal">Principal</option>
              <option value="CoE">CoE</option>
              <option value="Faculty">Faculty</option>
            </select>
          </div>

          {/* Target Module filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Module Scope</label>
            <select 
              value={targetModel}
              onChange={(e) => setTargetModel(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {modelsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Department Filter (Only for admins/principals) */}
          {!departmentOnly ? (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Performer Department</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Departments</option>
                <option value="CSE">Computer Science (CSE)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="EEE">Electrical (EEE)</option>
                <option value="MECH">Mechanical (MECH)</option>
                <option value="CIVIL">Civil Eng (CIVIL)</option>
                <option value="General">General / Other</option>
              </select>
            </div>
          ) : (
            <div className="opacity-60">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Department Filter</label>
              <input 
                type="text"
                value={user?.department || 'CSE'}
                disabled
                className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* Date Pickers */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">From Date</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">To Date</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-50">
          <button 
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
          >
            Clear Active Filters
          </button>
        </div>
      </div>

      {/* Audit Logs Timetable list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-500 font-semibold">
            <RefreshCw className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-4" />
            Compiling and auditing records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-slate-500">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-extrabold text-slate-800">No Audit Trail Logs Found</h4>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">No change records matched the currently configured filter settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-5">Timestamp</th>
                  <th className="p-5">Event Action</th>
                  <th className="p-5">Performed By</th>
                  <th className="p-5">Reason</th>
                  <th className="p-5 text-center">Visual Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-5 whitespace-nowrap">
                      <p className="font-bold text-slate-800">{log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </td>
                    <td className="p-5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider leading-none ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                      <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-wide">{log.targetModel} Scope</p>
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-slate-800 leading-tight">{log.performedByName}</p>
                      <p className="text-[10px] text-indigo-500 font-extrabold uppercase mt-1 tracking-wider leading-none">
                        {log.performedByRole} &bull; {log.performedByDept}
                      </p>
                    </td>
                    <td className="p-5 max-w-xs">
                      <p className="font-semibold text-slate-600 line-clamp-2 leading-relaxed text-xs">
                        {log.reason || <span className="italic text-slate-400 font-normal">Direct adjustment</span>}
                      </p>
                    </td>
                    <td className="p-5 text-center whitespace-nowrap">
                      {(log.oldValue || log.newValue) ? (
                        <button 
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDiffModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition duration-200 flex items-center gap-1.5 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Changes
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {logs.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-semibold">
              Showing <span className="text-slate-700">15</span> logs from a total of <span className="text-slate-700">{totalLogs}</span> audited change events
            </span>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => fetchLogsList(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              
              <span className="px-4 text-xs font-bold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>

              <button 
                onClick={() => fetchLogsList(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Premium Diff Modal */}
      {isDiffModalOpen && renderDiffModal()}
    </div>
  );
};

export default AuditLogsManage;
