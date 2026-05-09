import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom'; 

import Landing from './PAGES/Landing';
import Login from './PAGES/Login';
import Register from './PAGES/Register';
import Dashboard from './PAGES/Dashboard';
import Scanner from './PAGES/Scanner';
import History from './PAGES/History';
import Notifications from './PAGES/Notifications';
import Profile from './PAGES/Profile';
import LecturerDashboard from './PAGES/LecturerDashboard';
import LecturerReports from './PAGES/LecturerReports';
import AddUnit from './PAGES/AddUnit';
import ResetPassword from './PAGES/ResetPassword';
import LecturerHistory from './PAGES/LecturerHistory';

// GUARD 1: Only allows Students
const ProtectedStudentRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData) return <Navigate to="/login" replace />;
  if (userData.role !== 'student') {
    return <Navigate to="/lecturer-dashboard" replace />; // Bounce Lecturers back
  }
  return children;
};

// GUARD 2: Only allows Lecturers
const ProtectedLecturerRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData) return <Navigate to="/login" replace />;
  if (userData.role !== 'lecturer') {
    return <Navigate to="/dashboard" replace />; // Bounce Students back
  }
  return children;
};

function App() {
  const navigate = useNavigate(); // This will now work!

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    
    if (savedUser) {
        const user = JSON.parse(savedUser);
        
        // ONLY redirect if you land on the root "/" 
        // This lets you type /login, /register, or /add-unit manually without getting kicked!
        if (window.location.pathname === '/') {
            navigate(user.role === 'lecturer' ? '/lecturer-dashboard' : '/dashboard');
        }
    }
}, [navigate]);

 return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected Student Routes */}
        <Route path="/dashboard" element={<ProtectedStudentRoute><Dashboard /></ProtectedStudentRoute>} />
        <Route path="/scanner" element={<ProtectedStudentRoute><Scanner /></ProtectedStudentRoute>} />
        <Route path="/notifications" element={<ProtectedStudentRoute><Notifications /></ProtectedStudentRoute>} />
        <Route path="/history" element={<ProtectedStudentRoute><History /></ProtectedStudentRoute>} />
        <Route path="/profile" element={<ProtectedStudentRoute><Profile /></ProtectedStudentRoute>} />

        {/* Protected Lecturer Routes */}
        <Route path="/lecturer-dashboard" element={<ProtectedLecturerRoute><LecturerDashboard /></ProtectedLecturerRoute>} />
        <Route path="/class-list" element={<ProtectedLecturerRoute><LecturerReports /></ProtectedLecturerRoute>} />
        <Route path="/add-unit" element={<ProtectedLecturerRoute><AddUnit /></ProtectedLecturerRoute>} />
        <Route path="/lecturer-history" element={<ProtectedLecturerRoute><LecturerHistory /></ProtectedLecturerRoute>} />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;