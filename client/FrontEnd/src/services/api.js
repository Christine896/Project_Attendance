import axios from 'axios';

// Force port 5000, ignoring Vite's broken environment variables
const API = axios.create({ 
  baseURL: 'http://192.168.0.102:5000' 
});

API.interceptors.request.use((req) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  return req;
});

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