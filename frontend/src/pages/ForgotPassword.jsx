import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../api/http';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/auth/forgot-password'), { email });
      setMessage(response.data.message);
      // Optional: redirect to reset password page automatically
      setTimeout(() => navigate('/reset-password', { state: { email: response.data.email } }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">Forgot Password</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{message}</span>
          </div>
        )}

        <form onSubmit={handleForgot} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email ID / Register Number</label>
            <input 
              type="text" 
              placeholder="Enter your email or register number" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition duration-200 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
          <div className="text-center mt-4">
             <a href="/" className="text-sm text-blue-600 hover:underline">Back to Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
