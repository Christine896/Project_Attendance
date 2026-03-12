import axios from 'axios';

// 1. The URL must end with /api
const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// 2. These two lines must use the EXACT paths 'auth/register' and 'auth/login'
export const registerStudent = (formData) => API.post('/auth/register', formData);
export const loginStudent = (loginData) => API.post('/auth/login', loginData);

// This will send the scan data to the backend
export const logAttendance = (scanData) => API.post('/auth/scan', scanData);

export const getStudentHistory = (studentId) => API.get(`/auth/history/${studentId}`);

export const getLecturerAttendance = (unitCode) => API.get(`/auth/lecturer/attendance/${unitCode}`);