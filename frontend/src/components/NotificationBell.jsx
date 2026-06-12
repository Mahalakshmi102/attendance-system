import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Check, CheckSquare, AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/adminApi';

const NotificationBell = ({ onViewAll }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications in bell:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      setLoading(true);
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Alert':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'Success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getColorClass = (type, isRead) => {
    if (isRead) return 'bg-slate-50 border-slate-100';
    switch (type) {
      case 'Alert':
        return 'bg-red-50/70 border-red-100/50';
      case 'Warning':
        return 'bg-amber-50/70 border-amber-100/50';
      case 'Success':
        return 'bg-emerald-50/70 border-emerald-100/50';
      default:
        return 'bg-blue-50/70 border-blue-100/50';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition duration-200 focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] z-50 overflow-hidden transform origin-top-right transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">Notifications</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{unreadCount} unread announcements</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <BellOff className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-xs font-bold">No announcements yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Official notifications will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-3.5 flex items-start gap-3 border-l-3 transition-colors duration-200 ${
                    n.read ? 'border-transparent' : 
                    n.type === 'Alert' ? 'border-red-500' :
                    n.type === 'Warning' ? 'border-amber-500' :
                    n.type === 'Success' ? 'border-emerald-500' : 'border-blue-500'
                  } ${getColorClass(n.type, n.read)} hover:bg-slate-50`}
                >
                  <div className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs text-slate-700 leading-normal break-words ${!n.read ? 'font-black' : 'font-medium'}`}>
                      {n.message}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkRead(e, n._id)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0 self-center"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {onViewAll && (
            <div className="p-2.5 bg-slate-50/50 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onViewAll();
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
