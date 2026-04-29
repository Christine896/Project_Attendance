import axios from 'axios';

// THE PERMANENT FIX: Dynamic URL Sniffing + Production Readiness
const getBaseUrl = () => {
  // 1. PRODUCTION: If deployed (Vercel, Render), use the live URL from your hosting dashboard
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL; 
  }
  
  // 2. LOCAL DEVELOPMENT: Auto-detect the IP
  // If on laptop: browser is 'localhost' -> returns 'http://localhost:5000'
  // If on phone: browser is '192.168.x.x' -> returns 'http://192.168.x.x:5000'
  return `http://${window.location.hostname}:5000`;
};

const API = axios.create({ 
  baseURL: getBaseUrl() 
});

API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  return req;
});

// ... Keep all your existing export const routes below exactly as they are!

export const login = (formData) => API.post('/api/auth/login', formData);
export const loginStudent = (formData) => API.post('/api/auth/login', formData);
export const loginLecturer = (formData) => API.post('/api/auth/login', formData);
export const registerStudent = (formData) => API.post('/api/auth/register', formData);
export const registerLecturer = (formData) => API.post('/api/auth/register', formData);
export const addUnit = (unitData) => API.post('/api/units/add', unitData);
export const getLecturerUnits = (id) => API.get(`/api/units/lecturer/${id}`);
export const startSession = (sessionData) => API.post('/api/sessions/start', sessionData);
export const endSession = (sessionId) => API.post('/api/sessions/end', { sessionId });
export const logAttendance = (attendanceData) => API.post('/api/auth/scan', attendanceData);
export const getStudentHistory = (studentId) => API.get(`/api/attendance/student/${studentId}`);
export const getAllUnits = () => API.get('/api/units/all');
export const incrementUnitSession = (unitId) => API.post(`/api/auth/lecturer/unit/${unitId}/increment`);
export const getStudentStats = (studentId) => API.get(`/api/auth/stats/${studentId}`);

export default API;