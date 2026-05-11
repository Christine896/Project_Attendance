import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom'; 
import { useRegisterSW } from 'virtual:pwa-register/react';

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
  const navigate = useNavigate();

  // --- SURGICAL FIX: Service Worker Update Listener ---
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) { console.log('SW Registered'); },
    onRegisterError(error) { console.log('SW registration error', error); },
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (window.location.pathname === '/') {
            navigate(user.role === 'lecturer' ? '/lecturer-dashboard' : '/dashboard');
        }
    }
  }, [navigate]);

 return (
    <div className="App relative">
      
      {/* --- SURGICAL FIX: The Global Update Prompt UI --- */}
      {needRefresh && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-950 text-white px-6 py-5 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col items-center gap-4 w-[90%] max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-500">
          <p className="font-black text-sm text-center tracking-tight text-blue-100">A new version of Proxi is available!</p>
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => updateServiceWorker(true)} 
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              Update Now
            </button>
            <button 
              onClick={() => setNeedRefresh(false)} 
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
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