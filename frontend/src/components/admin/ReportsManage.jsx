import { useState } from 'react';
import { downloadExcelReport } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, ShieldCheck, Users, UserCheck, GraduationCap, BarChart3, 
  Download, Calendar, Filter, RefreshCw, AlertCircle
} from 'lucide-react';

const ReportsManage = ({ departmentOnly = false }) => {
  const { user } = useAuth();
  const [loadingReport, setLoadingReport] = useState(null);

  // Filter states
  const [department, setDepartment] = useState(departmentOnly ? user?.department || '' : '');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportCards = [
    {
      id: 'audit',
      title: 'Centralized Audit Trail Log',
      description: 'Review system adjustments, profile modifications, timetable updates, and direct attendance corrections.',
      icon: ShieldCheck,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50/50',
      endpoint: 'audit',
      fileName: 'system_audit_trail.xlsx',
      needsDate: true,
      needsClass: false
    },
    {
      id: 'attendance-summary',
      title: 'Attendance Summary & Defaulters',
      description: 'Overall student attendance statistics grouped by subject, complete with a sheet of critical defaulters (< 75%).',
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50/50',
      endpoint: 'attendance-summary',
      fileName: 'student_attendance_summary.xlsx',
      needsDate: false,
      needsClass: true
    },
    {
      id: 'faculty-activity',
      title: 'Faculty Compliance Monitor',
      description: 'Trace timetable slot configurations, attendance sessions started/locked, and faculty submission delay indexes.',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50/50',
      endpoint: 'faculty-activity',
      fileName: 'faculty_compliance_activity.xlsx',
      needsDate: false,
      needsClass: false
    },
    {
      id: 'student-report',
      title: 'Student Roster Directory',
      description: 'Export exhaustive personal student listings containing contact numbers, DOB, gender, and parent details.',
      icon: GraduationCap,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50/50',
      endpoint: 'student-report',
      fileName: 'student_roster_directory.xlsx',
      needsDate: false,
      needsClass: true
    },
    {
      id: 'dept-performance',
      title: 'Department Performance KPIs',
      description: 'Cross-compare total student strength, average attendance, and locking compliance rates across all 5 departments.',
      icon: BarChart3,
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-50/50',
      endpoint: 'dept-performance',
      fileName: 'department_kpis_performance.xlsx',
      needsDate: false,
      needsClass: false,
      adminOnly: true
    }
  ];

  const handleDownload = async (report) => {
    setLoadingReport(report.id);
    try {
      const params = {
        department: departmentOnly ? user?.department : department,
        semester,
        year,
        startDate,
        endDate
      };

      const res = await downloadExcelReport(report.endpoint, params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(`Error downloading ${report.title}:`, err);
      alert('Error compiling or downloading the selected report spreadsheet.');
    } finally {
      setLoadingReport(null);
    }
  };

  const isStaffAuthorized = (report) => {
    if (report.adminOnly && ['HoD', 'Faculty'].includes(user?.role)) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-8">
      {/* Configuration Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h4 className="font-extrabold text-slate-800 text-sm">Configure Report Scoping Filters</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Department Selection */}
          {!departmentOnly ? (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Focus Department</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Departments</option>
                <option value="CSE">CSE Department</option>
                <option value="ECE">ECE Department</option>
                <option value="EEE">EEE Department</option>
                <option value="MECH">MECH Department</option>
                <option value="CIVIL">CIVIL Department</option>
              </select>
            </div>
          ) : (
            <div className="opacity-60">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Department Scope</label>
              <input 
                type="text"
                value={user?.department || 'CSE'}
                disabled
                className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* Year and Semester */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Focus Year</label>
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Focus Semester</label>
            <select 
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Semesters</option>
              <option value="1">1st Sem</option>
              <option value="2">2nd Sem</option>
              <option value="3">3rd Sem</option>
              <option value="4">4th Sem</option>
              <option value="5">5th Sem</option>
              <option value="6">6th Sem</option>
              <option value="7">7th Sem</option>
              <option value="8">8th Sem</option>
            </select>
          </div>

          {/* Date range filters */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">Audit Date Range</label>
            <div className="flex gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                title="Start Date"
              />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                title="End Date"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-50">
          <button 
            onClick={() => {
              if (!departmentOnly) setDepartment('');
              setSemester('');
              setYear('');
              setStartDate('');
              setEndDate('');
            }}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
          >
            Reset Scoping Filters
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.filter(isStaffAuthorized).map((report) => {
          const Icon = report.icon;
          const isDownloading = loadingReport === report.id;

          return (
            <div 
              key={report.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300"
            >
              <div className="p-8 flex gap-5">
                <div className={`p-4 rounded-2xl bg-gradient-to-tr ${report.color} text-white shadow-lg shrink-0 w-14 h-14 flex items-center justify-center`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-md font-extrabold text-slate-800 leading-tight">{report.title}</h4>
                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{report.description}</p>
                </div>
              </div>

              {/* Scoping pill status indicators */}
              <div className="px-8 pb-2 flex flex-wrap gap-2 text-[10px] font-bold text-indigo-500">
                {report.needsClass && (semester || year) && (
                  <span className="bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Class Scoped</span>
                )}
                {report.needsDate && (startDate || endDate) && (
                  <span className="bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Date Filtered</span>
                )}
                {department && (
                  <span className="bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{department} Dept Scoped</span>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center mt-auto">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  xlsx spreadsheet
                </span>
                
                <button 
                  onClick={() => handleDownload(report)}
                  disabled={!!loadingReport}
                  className={`px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-900 transition flex items-center gap-2 shadow-md disabled:opacity-50`}
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Export Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsManage;
