import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UsersManage from '../components/admin/UsersManage';
import FacultyManage from '../components/admin/FacultyManage';
import StudentsManage from '../components/admin/StudentsManage';
import SubjectsManage from '../components/admin/SubjectsManage';
import TimetableManage from '../components/admin/TimetableManage';
import CalendarManage from '../components/admin/CalendarManage';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import ApprovalsManage from '../components/admin/ApprovalsManage';
import AttendanceMonitoring from '../components/admin/AttendanceMonitoring';
import ReportsManage from '../components/admin/ReportsManage';
import AuditLogsManage from '../components/admin/AuditLogsManage';
import NotificationsManage from '../components/admin/NotificationsManage';
import SettingsManage from '../components/admin/SettingsManage';
import NotificationBell from '../components/NotificationBell';
import { 
  ShieldCheck, Users, UserCog, BookOpen, Calendar, Clock, BarChart3, 
  FileCheck2, LogOut, FileText, Bell, Settings, CheckSquare, GraduationCap, History,
  Menu, X
} from 'lucide-react';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
    { id: 'students', label: 'Student Management', icon: Users },
    { id: 'faculty', label: 'Faculty Management', icon: UserCog },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen },
    { id: 'timetable', label: 'Timetable Management', icon: Clock },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'attendance', label: 'Attendance Monitoring', icon: CheckSquare },
    { id: 'approvals', label: 'Approval Requests', icon: FileCheck2 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'audit', label: 'System Audit Logs', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans flex overflow-hidden relative">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col z-30 transition-transform duration-300 transform lg:translate-x-0 lg:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-slate-200 bg-white p-0.5 flex items-center justify-center shadow-sm hover:scale-105 transition-transform duration-300">
              <img src="/logo.jpg" alt="NIT Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight leading-tight">NITify</h1>
              <p className="text-[10px] text-rose-600 font-extrabold tracking-wide uppercase mt-0.5">Admin Portal</p>
            </div>
          </div>
          {/* Close button for mobile sidebar */}
          <button 
            className="lg:hidden p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Main Modules</p>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-sm ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold py-3 rounded-xl transition-all shadow-sm"
          >
            <LogOut className="w-5 h-5" /> Logout Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:px-10 md:py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger Toggle */}
            <button 
              className="lg:hidden p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo and App Name on Mobile View */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/logo.jpg" alt="NIT Logo" className="w-8 h-8 object-contain rounded-full border border-slate-200 bg-white" />
              <span className="text-base font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">NITify</span>
              <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold max-w-[100px] sm:max-w-[120px] truncate">
                {menuItems.find(i => i.id === activeTab)?.label}
              </span>
            </div>

            {/* Page title on Desktop View */}
            <div className="hidden lg:block">
              <h2 className="text-lg md:text-2xl font-extrabold text-slate-800 leading-tight">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="hidden sm:block text-xs md:text-sm text-slate-500 font-medium mt-1">Manage system configurations and monitor operations.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <NotificationBell onViewAll={() => setActiveTab('notifications')} />
             <div className="flex items-center gap-3 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 shadow-sm">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="text-right">
                  <p className="text-[10px] md:text-xs font-bold text-slate-800 leading-tight">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-[8px] md:text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                    {user?.role || 'Admin'}
                    {user?.role === 'HoD' && ` (${user?.department})`}
                  </p>
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 pb-20 md:p-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto pb-10">
            {activeTab === 'overview' && <AnalyticsDashboard setActiveTab={setActiveTab} />}
            {activeTab === 'students' && <StudentsManage />}
            {activeTab === 'faculty' && <FacultyManage />}
            {activeTab === 'subjects' && <SubjectsManage />}
            {activeTab === 'timetable' && <TimetableManage />}
            {activeTab === 'calendar' && <CalendarManage />}
            {activeTab === 'attendance' && <AttendanceMonitoring />}
            {activeTab === 'approvals' && <ApprovalsManage />}
            {activeTab === 'reports' && <ReportsManage />}
            {activeTab === 'audit' && <AuditLogsManage />}
            {activeTab === 'notifications' && <NotificationsManage />}
            {activeTab === 'settings' && <SettingsManage />}
          </div>
        </div>

        {/* Bottom Navigation Bar for Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-150 py-2 px-4 flex items-center justify-around z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]">
          {menuItems.slice(0, 3).map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-colors duration-200 ${
                  isActive ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 scale-105' : 'text-slate-400'}`} />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          {/* Attendance tab (index 6) */}
          {(() => {
            const item = menuItems[6];
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-colors duration-200 ${
                  isActive ? 'text-indigo-650' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 scale-105' : 'text-slate-400'}`} />
                <span>Monitor</span>
              </button>
            );
          })()}
          {/* More menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-extrabold text-slate-400 hover:text-slate-650"
          >
            <Menu className="w-5 h-5 text-slate-400" />
            <span>More</span>
          </button>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
