import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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

// --- DYNAMIC PROTECTION COMPONENT ---
// This component checks the latest localStorage every time a route changes
const ProtectedLecturerRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user'));
  
  if (!userData || userData.role !== 'lecturer') {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Core App Routes (Student) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />

          {/* --- FIXED LECTURER ROUTE --- */}
          <Route 
            path="/lecturer-dashboard" 
            element={
              <ProtectedLecturerRoute>
                <LecturerDashboard />
              </ProtectedLecturerRoute>
            } 
          />
          <Route path="/lecturer-reports" element={<LecturerReports />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;