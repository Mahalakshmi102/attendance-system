import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../api/http';
import { useAuth } from '../context/AuthContext';
import FacultyManage from '../components/admin/FacultyManage';
import StudentsManage from '../components/admin/StudentsManage';
import TimetableManage from '../components/admin/TimetableManage';
import AttendanceMonitoring from '../components/admin/AttendanceMonitoring';
import AuditLogsManage from '../components/admin/AuditLogsManage';
import ApprovalsManage from '../components/admin/ApprovalsManage';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import NotificationBell from '../components/NotificationBell';
import NotificationsManage from '../components/admin/NotificationsManage';
import { 
  ShieldCheck, Users, UserCog, Clock, BarChart3, 
  FileCheck2, LogOut, CheckSquare, History,
  Menu, X, Bell, RefreshCw, Loader2, Check, CheckSquare as CheckSquareIcon, Send
} from 'lucide-react';

function HODDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  // Notifications System
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await axios.get(apiUrl('/api/admin/notifications'), {
        headers: withAuthHeader()
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load HOD notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { id: 'overview', label: 'Department Overview', icon: BarChart3 },
    { id: 'faculty', label: 'Faculty Monitoring', icon: UserCog },
    { id: 'students', label: 'Student Monitoring', icon: Users },
    { id: 'timetable', label: 'Timetable Management', icon: Clock },
    { id: 'attendance', label: 'Attendance Reports', icon: CheckSquare },
    { id: 'audit', label: 'Department Audit Logs', icon: History },
    { id: 'approvals', label: 'Pending Approvals', icon: FileCheck2 },
    { id: 'send-notifications', label: 'Send Announcements', icon: Send },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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
        <div className="p-8 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2.5 rounded-xl shadow-lg shadow-purple-200">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">HOD Portal</h1>
              <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-0.5">{user?.department} Dept</p>
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
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Department Modules</p>
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
                    ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
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
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:px-10 md:py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Toggle */}
            <button 
              className="lg:hidden p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-extrabold text-slate-800 leading-tight">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="hidden sm:block text-sm text-slate-500 font-medium mt-1">
                {activeTab === 'notifications' ? 'View system announcements and notifications from admin.' : 'Manage and monitor department operations.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <NotificationBell onViewAll={() => setActiveTab('notifications')} />
             <div className="flex items-center gap-3 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 shadow-sm">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md">
                  {user?.name?.charAt(0) || 'H'}
                </div>
                <div className="text-right">
                  <p className="text-[10px] md:text-xs font-bold text-slate-800 leading-tight">
                    {user?.name || 'HOD'}
                  </p>
                  <p className="text-[8px] md:text-[10px] text-purple-500 font-bold uppercase tracking-wider">
                    {user?.role || 'HOD'}
                  </p>
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 pb-20 md:p-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto pb-10">
            {activeTab === 'overview' && <AnalyticsDashboard departmentOnly={true} />}
            {activeTab === 'faculty' && <FacultyManage departmentOnly={true} />}
            {activeTab === 'students' && <StudentsManage departmentOnly={true} />}
            {activeTab === 'timetable' && <TimetableManage departmentOnly={true} />}
            {activeTab === 'attendance' && <AttendanceMonitoring departmentOnly={true} />}
            {activeTab === 'audit' && <AuditLogsManage departmentOnly={true} />}
            {activeTab === 'approvals' && <ApprovalsManage departmentOnly={true} />}
            {activeTab === 'send-notifications' && <NotificationsManage />}
            
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Announcements & Notifications</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">View broadcasted system messages, holiday alerts, and announcements from administrator.</p>
                  </div>
                  <div className="flex gap-2">
                    {notifications.filter(n => !n.read).length > 0 && (
                      <button 
                        onClick={async () => {
                          try {
                            await axios.put(apiUrl('/api/admin/notifications/read-all'), {}, {
                              headers: withAuthHeader()
                            });
                            setNotifications(prev => prev.map(item => ({ ...item, read: true })));
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <CheckSquareIcon className="w-4 h-4" /> Mark all read
                      </button>
                    )}
                    <button onClick={fetchNotifications} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition shrink-0">
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[480px]">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs py-10 animate-pulse font-bold">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin mr-2" /> Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-20 gap-3">
                        <Bell className="w-12 h-12 text-slate-200" />
                        <p className="font-bold">No notifications logged.</p>
                        <p className="text-[10px] text-slate-400">All announcements will show up here.</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`p-4 rounded-xl text-xs transition border flex justify-between items-start gap-4 ${
                          n.read 
                            ? 'bg-slate-50/70 border-slate-100 opacity-85' 
                            : 'bg-white border-slate-200 border-l-4 ' + (
                                n.type === 'Alert' ? 'border-l-red-500 shadow-md shadow-red-500/5' :
                                n.type === 'Warning' ? 'border-l-amber-500 shadow-md shadow-amber-500/5' :
                                n.type === 'Success' ? 'border-l-emerald-500 shadow-md shadow-emerald-500/5' :
                                'border-l-indigo-500 shadow-md shadow-indigo-500/5'
                              )
                        }`}>
                          <div className="space-y-2 flex-1">
                            <div className="flex justify-between items-center">
                              <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                n.type === 'Alert' ? 'bg-red-500 text-white' :
                                n.type === 'Warning' ? 'bg-amber-500 text-white' :
                                n.type === 'Success' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
                              }`}>
                                {n.type}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono font-bold">{new Date(n.createdAt).toLocaleString()}</span>
                            </div>
                            <p className={`text-slate-800 text-sm leading-relaxed ${!n.read ? 'font-black' : 'font-medium'}`}>{n.message}</p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={async () => {
                                try {
                                  await axios.put(apiUrl(`/api/admin/notifications/${n._id}/read`), {}, {
                                    headers: withAuthHeader()
                                  });
                                  setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, read: true } : item));
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-650 transition shrink-0 self-center"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
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
          {/* Approvals tab (index 6) */}
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
                <span>Approvals</span>
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

export default HODDashboard;
