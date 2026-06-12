import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../api/http';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/auth/login'), {
        email: identifier,
        password
      });

      const { token, user } = response.data;
      // Redirect based on role
      const userRole = user.role.toLowerCase();
      
      // Call AuthContext login to set state
      login(token, user);

      if (user.isFirstLogin) {
        navigate('/change-password');
        return;
      }

      if (['admin', 'principal', 'coe'].includes(userRole)) {
        navigate('/admin');
      } else if (userRole === 'hod') {
        navigate('/hod');
      } else if (userRole === 'faculty') {
        navigate('/faculty');
      } else if (userRole === 'student') {
        navigate('/student');
      } else {
        setError('Access Denied: Invalid role.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">Smart Attendance</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email ID / Register Number</label>
            <input 
              type="text" 
              placeholder="Enter your email or register number" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <input 
              type="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</a>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition duration-200 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
