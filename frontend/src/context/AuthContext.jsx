import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../api/http';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Load state from local storage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Fetch fresh user details from DB in background to sync state/properties
        axios.get(apiUrl('/api/auth/profile'), {
          headers: { Authorization: `Bearer ${storedToken}` }
        }).then(res => {
          if (res.data) {
            const updatedUser = {
              id: res.data._id || res.data.id,
              name: res.data.name,
              email: res.data.email,
              role: res.data.role,
              department: res.data.department,
              year: res.data.year,
              semester: res.data.semester,
              section: res.data.section,
              isFirstLogin: res.data.isFirstLogin,
              permissions: res.data.permissions || [],
              classAdvisorDetails: res.data.classAdvisorDetails || { isClassAdvisor: false }
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        }).catch(err => {
          console.error("Failed to sync user profile on mount:", err);
        });

      } catch (error) {
        console.error("Failed to parse user from local storage", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
