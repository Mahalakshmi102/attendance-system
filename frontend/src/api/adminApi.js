import axios from 'axios';
import { API_BASE_URL } from './http';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/admin`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getSubjects = () => api.get('/subjects');
export const addSubject = (data) => api.post('/subjects', data);
export const updateSubject = (id, data) => api.put(`/subjects/${id}`, data);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);
export const bulkDeleteSubjects = (ids) => api.post('/subjects/bulk-delete', { ids });

export const getUsers = () => api.get('/users');
export const addUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const bulkDeleteUsers = (ids) => api.post('/users/bulk-delete', { ids });

export const getTimetable = () => api.get('/timetable');
export const addTimetable = (data) => api.post('/timetable', data);
export const updateTimetable = (id, data) => api.put(`/timetable/${id}`, data);
export const deleteTimetable = (id) => api.delete(`/timetable/${id}`);
export const bulkDeleteTimetable = (ids) => api.post('/timetable/bulk-delete', { ids });

export const getCalendar = () => api.get('/calendar');
export const addCalendarEvent = (data) => api.post('/calendar', data);
export const updateCalendarEvent = (id, data) => api.put(`/calendar/${id}`, data);
export const deleteCalendarEvent = (id) => api.delete(`/calendar/${id}`);
export const bulkDeleteCalendarEvents = (ids) => api.post('/calendar/bulk-delete', { ids });

export const bulkUpload = (type, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/upload/${type}`, formData);
};

export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.post('/settings', data);

export const createNotification = (data) => api.post('/notifications', data);
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

export const downloadReport = (type) => api.get(`/reports/generate?type=${type}`, { responseType: 'blob' });

export const getStudentAttendanceDetails = (id) => api.get(`/students/${id}/attendance-details`);
export const updateAttendanceRecord = (id, data) => api.put(`/attendance/${id}`, data);

export const getLogs = (params) => axios.get(`${API_BASE_URL}/api/logs`, { 
  params, 
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
});

export const downloadExcelReport = (endpoint, params) => axios.get(`${API_BASE_URL}/api/reports/${endpoint}`, { 
  params, 
  responseType: 'blob', 
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
});

export const getFacultyAttendanceActivities = (id) => api.get(`/faculty/${id}/attendance-activities`);

export const getWorkloads = (facultyId) => api.get(`/workloads?facultyId=${facultyId || ''}`);
export const addWorkload = (data) => api.post('/workloads', data);
export const updateWorkload = (id, data) => api.put(`/workloads/${id}`, data);
export const deleteWorkload = (id) => api.delete(`/workloads/${id}`);

export default api;
