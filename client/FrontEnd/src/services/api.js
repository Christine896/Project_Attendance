import axios from 'axios';

const API = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' 
});

API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  return req;
});

// --- AUTH ---
export const login = (formData) => API.post('/api/auth/login', formData);
export const loginStudent = (formData) => API.post('/api/auth/login', formData);
export const loginLecturer = (formData) => API.post('/api/auth/login', formData);
export const registerStudent = (formData) => API.post('/api/auth/register', formData);
export const registerLecturer = (formData) => API.post('/api/auth/register', formData);

// --- UNITS (PHASE 1) ---
export const addUnit = (unitData) => API.post('/api/units/add', unitData);
export const getLecturerUnits = (id) => API.get(`/api/units/lecturer/${id}`);

// --- SESSIONS (PHASE 1) ---
export const startSession = (sessionData) => API.post('/api/sessions/start', sessionData);
export const endSession = (sessionId) => API.post('/api/sessions/end', { sessionId });

// --- STUDENT & ATTENDANCE (PHASE 2 & 3 Placeholders) ---
export const logAttendance = (attendanceData) => API.post('/api/auth/scan', attendanceData);
export const getStudentHistory = (studentId) => API.get(`/api/attendance/student/${studentId}`);

export default API;