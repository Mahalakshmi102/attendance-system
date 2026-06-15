import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../api/http';

function ResetPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
       setError('Passwords do not match');
       return;
    }
    if (newPassword.length < 8) {
       setError('Password must be at least 8 characters long.');
       return;
    }

    setLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/auth/reset-password'), { email, otp, newPassword });
      setMessage(response.data.message);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
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
      
      {/* Reset Password Card */}
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-white/20 relative z-10 transition-all duration-300 hover:shadow-indigo-500/5">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white p-1 flex items-center justify-center shadow-lg border border-slate-100 hover:scale-105 transition-transform duration-300">
            <img src="/logo.jpg" alt="NIT Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-black text-center bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent mt-3">Reset Password</h1>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-xs font-bold" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-xs font-bold" role="alert">
            <span className="block sm:inline">{message}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4 text-xs font-semibold text-slate-500">
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">Email ID</label>
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">OTP</label>
            <input 
              type="text" 
              placeholder="Enter the 6-digit OTP" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">New Password</label>
            <input 
              type="password" 
              placeholder="Enter new password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-slate-650 font-bold mb-1.5 uppercase tracking-wide">Confirm Password</label>
            <input 
              type="password" 
              placeholder="Confirm new password" 
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          <div className="text-center mt-4">
             <a href="/" className="text-xs text-blue-600 font-extrabold hover:underline">Back to Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
