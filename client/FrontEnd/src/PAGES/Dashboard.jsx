import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentHistory } from '../services/api';
import { 
  Bell, Home, History, User, Scan, MapPin, Database, Code, CircleUser, CalendarX 
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Student');
  const [percentage, setPercentage] = useState(0);
  const [hasUnread, setHasUnread] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [upcomingUnits, setUpcomingUnits] = useState([]);
  

  useEffect(() => {
  const savedUser = JSON.parse(localStorage.getItem('user'));
  if (savedUser && savedUser.fullName) {
    setUserName(savedUser.fullName.split(' ')[0]);
  }

  const fetchUnits = async () => {
    try {
      // 1. You'll need an API endpoint like getUnitsByCourse
      // For now, we fetch ALL and filter in frontend to test
      const response = await getAllUnits(); 
      const allUnits = response.data;

      const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
      const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // Find unit happening NOW for THIS student's course
      const active = allUnits.find(u => 
        u.course === savedUser.course && 
        u.day === today &&
        currentTime >= u.startTime && currentTime <= u.endTime
      );

      // Find units happening LATER today
      const upcoming = allUnits.filter(u => 
        u.course === savedUser.course && 
        u.day === today &&
        u.startTime > currentTime
      );

      setActiveSession(active);
      setUpcomingUnits(upcoming);
    } catch (err) {
      console.error("Discovery failed", err);
    }
  };
  fetchUnits();
}, []);

  const mainCardStyles = "bg-white/65 backdrop-blur-xl rounded-[28px] border border-white/40 shadow-lg p-5";
  const upcomingCardStyles = "bg-white/30 border border-white/40 p-3 rounded-[20px] flex items-center gap-3";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#93C5FD] via-[#C7D2FE] to-[#D8B4FE] flex flex-col font-sans p-5 pb-32">
      
      {/* 1. TOP HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <CircleUser size={26} className="text-indigo-950" strokeWidth={2} />
          <h1 className="text-lg font-bold text-slate-900">
            Welcome, <span className="font-black text-indigo-800">{userName}</span>
          </h1>
        </div>
      </div>

      {/* 2. ATTENDANCE OVERVIEW */}
      <div className={`${mainCardStyles} mb-4 flex items-center justify-between`}>
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">My Attendance</p>
          <h2 className="text-4xl font-extrabold text-indigo-700 tracking-tighter">{percentage}%</h2>
        </div>
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.4)" strokeWidth="6" fill="transparent" />
            <circle
              cx="32" cy="32" r="28"
              stroke="#4338CA" strokeWidth="6"
              strokeDasharray={175.8}
              strokeDashoffset={175.8 - (175.8 * percentage) / 100}
              strokeLinecap="round" fill="transparent"
            />
          </svg>
        </div>
      </div>

      {/* 3. ACTIVE SESSION CARD (Conditional Logic) */}
      <div className={`${mainCardStyles} mb-4 relative overflow-hidden`}>
        {activeSession?.isActive ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{activeSession.unitName}</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                <span className="text-emerald-700 text-[9px] font-black uppercase tracking-widest">Active</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600 mb-5">
              <MapPin size={14} className="text-indigo-800" />
              <span className="text-xs font-semibold italic">{activeSession.room}</span>
            </div>
            <button 
              onClick={() => navigate('/scanner')}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-xl shadow-lg active:scale-[0.97] transition-all"
            >
              Mark Attendance
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 opacity-60">
            <CalendarX size={32} className="text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-500">No active sessions right now</p>
          </div>
        )}
      </div>

      {/* 4. UPCOMING SESSIONS */}
      <div className="flex flex-col flex-1">
        <h3 className="text-slate-900 font-black text-lg mb-3 tracking-tight">Upcoming</h3>
        <div className="space-y-3">
          <div className={upcomingCardStyles}>
            <div className="p-2.5 bg-white rounded-xl text-indigo-800"><Database size={18}/></div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Database Systems</h4>
              <p className="text-[9px] font-mono text-slate-600">14:00 PM - 15:30 PM</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-5 left-5 right-5 z-50">
        <div className="bg-white/70 backdrop-blur-2xl border border-white/50 h-16 rounded-[28px] flex items-center justify-between px-6 shadow-2xl">
          
          <button className="flex flex-col items-center text-indigo-900 gap-0.5">
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Home</span>
          </button>

          <button onClick={() => navigate('/profile')} className="flex flex-col items-center text-slate-700 gap-0.5">
            <User size={22} strokeWidth={2.5} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Profile</span>
          </button>

          {/* SCAN BUTTON */}
          <div className="relative -translate-y-6">
            <button 
                onClick={() => navigate('/scanner')}
                className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-all border border-white/20 animate-bounce-subtle"
            >
                <Scan size={26} strokeWidth={2.5} />
            </button>
          </div>

          {/* ALERT BUTTON WITH RED DOT LOGIC */}
          <button 
            onClick={() => {
              setHasUnread(false); // CLEARS DOT ON CLICK
              navigate('/notifications');
            }} 
            className="flex flex-col items-center text-slate-700 gap-0.5"
          >
            <div className="relative">
              <Bell size={22} strokeWidth={2.5} />
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter">Alerts</span>
          </button>

          <button onClick={() => navigate('/history')} className="flex flex-col items-center text-slate-700 gap-0.5">
            <History size={22} strokeWidth={2.5} />
            <span className="text-[8px] font-black uppercase tracking-tighter">History</span>
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .animate-bounce-subtle {
            animation: bounce-subtle 2.5s infinite ease-in-out;
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;