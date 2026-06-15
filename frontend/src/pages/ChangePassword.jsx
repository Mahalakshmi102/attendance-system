import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../api/http';

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    // Password strength check
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(apiUrl('/api/auth/change-password'), {
        oldPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update user info to show it's no longer first login
      let user = JSON.parse(localStorage.getItem('user'));
      if (user) {
         user.isFirstLogin = false;
         localStorage.setItem('user', JSON.stringify(user));
      }

      // Redirect based on role
      const userRole = user?.role?.toLowerCase();
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'faculty') navigate('/faculty');
      else navigate('/student');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Background Image Container with Unblur and Zoom Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-bottom animate-unblur-zoom"
        style={{ backgroundImage: "url('/background.png')" }}
      />
      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/70 via-slate-900/30 to-slate-950/75" />
      
      {/* Change Password Card */}
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-white/20 relative z-10 transition-all duration-300 hover:shadow-indigo-500/5">
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full bg-white p-1 flex items-center justify-center shadow-lg border border-slate-100 hover:scale-105 transition-transform duration-300">
            <img src="/logo.jpg" alt="NIT Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-center bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent mt-3">Change Password</h1>
          <p className="text-[10px] font-bold text-slate-500 text-center mt-1.5">For security reasons, you must change your temporary password.</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-xs font-bold">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold text-slate-500">
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">Old Password</label>
            <input 
              type="password" 
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white font-extrabold py-3.5 px-4 rounded-xl transition duration-200 mt-4 shadow-lg ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'}`}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
