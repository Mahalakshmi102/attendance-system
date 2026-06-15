import { Bell, Send, Users, GraduationCap, Building, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { createNotification } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

const NotificationsManage = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [loading, setLoading] = useState(false);

  const isHOD = user?.role === 'HoD';

  const handleSendNotification = async () => {
    if (!message.trim()) {
      alert('Please enter a message.');
      return;
    }
    setLoading(true);
    try {
      const res = await createNotification({ message, target });
      alert(res.data?.message || 'Notification sent successfully!');
      setMessage('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error sending notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <Bell className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <h3 className="text-xl md:text-2xl font-extrabold text-slate-800">Push Notifications Panel</h3>
        <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">Broadcast announcements, safety warnings, holiday alerts, or exam notices.</p>
      </div>

      <div className="space-y-6">
        {/* Target Audience Selector */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider">Target Audience</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(isHOD 
              ? [
                  { id: 'all', label: 'All Department', icon: Building, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100/30' },
                  { id: 'admins', label: 'Admins Only', icon: Briefcase, color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100/30' },
                  { id: 'faculty', label: 'Dept Faculty Only', icon: Users, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/30' },
                  { id: 'students', label: 'Dept Students Only', icon: GraduationCap, color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100/30' }
                ]
              : [
                  { id: 'all', label: 'Overall College', icon: Building, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100/30' },
                  { id: 'hods', label: 'HODs Only', icon: Briefcase, color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100/30' },
                  { id: 'faculty', label: 'Faculty Only', icon: Users, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/30' },
                  { id: 'students', label: 'Students Only', icon: GraduationCap, color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100/30' }
                ]
            ).map((item) => {
              const IconComp = item.icon;
              const isSelected = target === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTarget(item.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition duration-200 font-bold text-[11px] md:text-xs gap-1.5 active:scale-95 ${
                    isSelected 
                      ? `${item.color} shadow-sm border-2` 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <IconComp className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Input */}
        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-slate-400 mb-2.5 uppercase tracking-wider">Announcement Message</label>
          <textarea 
            className="w-full border border-slate-200 p-4 rounded-xl shadow-sm text-xs md:text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" 
            rows="4" 
            placeholder="Type your push notification message here..."
            value={message}
            disabled={loading}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>

        <button 
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition flex justify-center items-center gap-2 disabled:opacity-50 active:scale-[0.98]" 
          onClick={handleSendNotification}
          disabled={loading || !message.trim()}
        >
          <Send className="w-4 h-4 shrink-0" /> 
          {loading ? 'Broadcasting...' : `Send Notification to ${
            isHOD
              ? (target === 'all' ? 'All Department' : target === 'admins' ? 'Admins Only' : target === 'faculty' ? 'Dept Faculty' : 'Dept Students')
              : (target === 'all' ? 'College' : target === 'hods' ? 'HODs' : target === 'faculty' ? 'Faculty' : 'Students')
          }`}
        </button>
      </div>
    </div>
  );
};

export default NotificationsManage;
