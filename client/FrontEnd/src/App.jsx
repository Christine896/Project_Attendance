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
import LecturerHistory from './pages/LecturerHistory';

const ProtectedLecturerRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData || userData.role !== 'lecturer') {
    return <Navigate to="/login" replace />;
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
        {/* Auth Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />

        {/* Lecturer Routes */}
        <Route path="/lecturer-dashboard" element={<ProtectedLecturerRoute><LecturerDashboard /></ProtectedLecturerRoute>} />
        <Route path="/class-list" element={<ProtectedLecturerRoute><LecturerReports /></ProtectedLecturerRoute>} />
        <Route path="/add-unit" element={<ProtectedLecturerRoute><AddUnit /></ProtectedLecturerRoute>} />

        {/* 1. MOVE RESET PASSWORD ABOVE THE ASTERISK */}
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* 2. THE ASTERISK MUST ALWAYS BE LAST */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/lecturer-history" element={<LecturerHistory />} />
      </Routes>
    </div>
  );
}

export default App;