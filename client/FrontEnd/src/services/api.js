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

// --- EXISTING REQUEST INTERCEPTOR (Surgical Fix for your storage logic) ---
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token'); // Look for the separate 'token' key
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// --- NEW RESPONSE INTERCEPTOR (The Session Timeout Guard) ---
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 means the token has expired or is invalid
    if (error.response && error.response.status === 401) {
      console.warn("Session expired. Logging out...");
      
      // Clear all local data so the app doesn't think you are still logged in
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Jump to login with a message in the URL
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);

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