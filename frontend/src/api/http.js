const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const defaultLocalBaseUrl = 'http://localhost:5000';

export const API_BASE_URL = trimTrailingSlash(configuredBaseUrl || defaultLocalBaseUrl);

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const withAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
