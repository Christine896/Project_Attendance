import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentStats, getAllUnits, logAttendance, getNotifications } from '../services/api';
import { 
  Bell, Home, History, User, Scan, MapPin, Database, Code, CircleUser, CalendarX, Loader2, ShieldCheck, XCircle 
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Student');
  const [percentage, setPercentage] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [upcomingUnits, setUpcomingUnits] = useState([]);
  const [unitStats, setUnitStats] = useState([]);
  const [pendingScans, setPendingScans] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [toast, setToast] = useState(null); 

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); 
  };

  useEffect(() => {
  const savedUser = JSON.parse(localStorage.getItem('user'));

  // LOAD CACHE IMMEDIATELY FOR OFFLINE native-feel
  const cachedStats = JSON.parse(localStorage.getItem('cached_stats') || '[]');
  const cachedUnits = JSON.parse(localStorage.getItem('cached_units') || '[]');
  if (cachedStats.length > 0) {
    setUnitStats(cachedStats);
    // Recalculate percentage from cache
    let totalPossible = 0; let totalAttended = 0;
    cachedStats.forEach(u => { totalPossible += u.totalSessions; totalAttended += u.attended; });
    setPercentage(totalPossible > 0 ? Math.round((totalAttended/totalPossible)*100) : 0);
  }
  
  if (savedUser) {
    // 1. Get the raw name (prioritize firstName, fallback to splitting fullName)
    const rawName = savedUser.firstName || savedUser.fullName?.split(' ')[0] || 'Student';
    
    // 2. Apply Sentence Case (Capitalize first letter, lowercase the rest)
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    setUserName(formattedName);
  }

  const calculateAttendance = async () => {
    try {
      const statsRes = await getStudentStats(savedUser._id);
      const stats = statsRes.data;
      setUnitStats(stats);
      // CACHE 1: Individual Unit Progress
      localStorage.setItem('cached_stats', JSON.stringify(stats));

      const unitsRes = await getAllUnits();
      const allUnits = unitsRes.data || [];

      const myCourseUnits = allUnits.filter(u => 
          u.course === savedUser.course && 
          u.semester === savedUser.semester
      );
      // CACHE 2: Filtered Units for this student
      localStorage.setItem('cached_units', JSON.stringify(myCourseUnits));

      // --- AREA A: PURE TRUTHFUL CALCULATION ---
      let totalPossible = 0;
      let totalAttended = 0;
      
      stats.forEach(unit => {
        // Backend is now perfectly truthful, just use the raw numbers
        totalPossible += (unit.totalSessions || 0);
        totalAttended += (unit.attended || 0);
      });

      const finalPercent = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;
      setPercentage(Math.min(100, finalPercent));

      // Update local cache with the latest data
      localStorage.setItem('cached_stats', JSON.stringify(stats));
      localStorage.setItem('cached_units', JSON.stringify(myCourseUnits));

      // ... keep your Time-Based Discovery logic exactly the same ...
      const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
      const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

      let currentActiveUnit = null;
      let upcomingList = [];

      myCourseUnits.forEach(unit => {
        if (!unit.schedule || !Array.isArray(unit.schedule)) return;
        unit.schedule.forEach(session => {
          if (session.day === today) {
            if (currentTime >= session.startTime && currentTime <= session.endTime) {
              currentActiveUnit = { ...unit, unitName: unit.name, timeRange: `${session.startTime} - ${session.endTime}` };
            } else if (currentTime < session.startTime) {
              upcomingList.push({ ...unit, unitName: unit.name, timeRange: `${session.startTime} - ${session.endTime}` });
            }
          }
        });
      });

      setActiveSession(currentActiveUnit);
      setUpcomingUnits(upcomingList);

      const notifRes = await getNotifications(savedUser._id);
      if (Array.isArray(notifRes.data)) {
        setHasUnread(notifRes.data.some(n => n.isRead === false));
      }

    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate('/login?message=Session expired. Please log in again.');
        return;
      }
      console.error("Attendance calculation failed", err);
    }
  };

  if (savedUser) calculateAttendance();
}, []);

  // STEP 25: Check for offline scans on load
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('pending_scans') || '[]');
    setPendingScans(stored);
  }, []);

  const handleSyncOffline = async () => {
    if (!navigator.onLine) return showToast("You are still offline!", "error");
    setIsSyncing(true);
    
    let failedScans = [];

    try {
      const savedUser = JSON.parse(localStorage.getItem('user'));

      for (const scan of pendingScans) {
        try {
          const { offline, ...cleanData } = scan; 
          if (!cleanData.studentId) cleanData.studentId = savedUser?._id;

          // Send to database
          await logAttendance(cleanData);
          
        } catch (err) {
          // --- SURGICAL FIX: CLEARING THE STUCK BAR ---
          const status = err?.response?.status;
          
          // If NO status (Network dropped) or 500+ (Server crash), keep the scan.
          // If status is 400 (duplicate) or 403 (wrong course), THROW IT IN THE TRASH.
          if (!status || status >= 500) {
            failedScans.push(scan);
          }
        }
      }

      // FINAL NOTIFICATION & REFRESH LOGIC
      if (failedScans.length === 0) {
        localStorage.removeItem('pending_scans');
        setPendingScans([]);
        showToast("All offline records synced successfully!", "success"); // Always shows success
        
        // Wait 1 second to ensure DB is done, then fetch the 100% truthful stats
        setTimeout(() => {
          window.location.reload(); 
        }, 2000);

      } else {
        localStorage.setItem('pending_scans', JSON.stringify(failedScans));
        setPendingScans(failedScans);
        showToast("Sync partially failed. Check connection.", "error");
      }
    } catch (globalErr) {
      console.error(globalErr);
      showToast("Sync encountered a processing error.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

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

      {/* GLASSMORPHIC TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[100] animate-in slide-in-from-top-10 fade-in duration-300">
          <div className={`p-4 backdrop-blur-2xl border rounded-2xl shadow-2xl flex items-center gap-3 ${
            toast.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-900' 
            : 'bg-rose-500/20 border-rose-500/30 text-rose-900'
          }`}>
            {toast.type === 'success' ? <ShieldCheck size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-rose-600" />}
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        </div>
      )}

      {/* STEP 25: GLASSMORPHIC PENDING SYNC BANNER */}
      {pendingScans.length > 0 && (
        <div className="mb-6 p-5 bg-amber-500/15 backdrop-blur-2xl border border-amber-400/40 rounded-[2rem] shadow-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${isSyncing ? 'bg-indigo-500/15 border-indigo-500/20 text-indigo-700' : 'bg-amber-500/20 border-amber-500/30 text-amber-600'}`}>
              {isSyncing ? <Loader2 size={24} className="animate-spin" /> : <Database size={24} />}
            </div>
            <div>
              <p className="font-black text-sm text-slate-800 uppercase tracking-widest">
                {isSyncing ? "Syncing..." : "Offline Scans"}
              </p>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                {pendingScans.length} pending
              </p>
            </div>
          </div>
          <button 
            onClick={handleSyncOffline} 
            disabled={isSyncing}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
              isSyncing 
              ? 'bg-white/40 text-slate-500 border-white/20 cursor-not-allowed' 
              : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/40 border-amber-400'
            }`}
          >
            {isSyncing ? 'Wait' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* 2. ATTENDANCE OVERVIEW */}
      <div className={`${mainCardStyles} mb-4 flex items-center justify-between`}>
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Overall Attendance</p>
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

      {/* 2.5 UNIT BREAKDOWN (HORIZONTAL CAROUSEL) */}
      <div className="mb-6">
        <h3 className="text-slate-900 font-black text-sm mb-3 tracking-tight ml-1">My Progress</h3>
        
        <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory hide-scrollbar -mx-5 px-5">
          {unitStats.map((stat, idx) => {
            // --- AREA B: PURE TRUTHFUL LABELS ---
            const sessionsCount = stat.totalSessions || 0;
            const unitPercent = sessionsCount > 0 
              ? Math.min(100, Math.round((stat.attended / sessionsCount) * 100)) 
              : 0;
              
            return (
              <div key={idx} className="bg-white/40 backdrop-blur-md border border-white/50 p-4 rounded-[24px] flex flex-col gap-2 shadow-sm min-w-[240px] snap-center shrink-0">
                {/* ... keep headers same ... */}
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800 text-sm truncate pr-2">{stat.unitName}</span>
                  <span className="text-xs font-black text-indigo-700">{unitPercent}%</span>
                </div>
                
                <div className="w-full h-2 bg-indigo-900/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${unitPercent < 50 ? 'bg-rose-500' : unitPercent < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${unitPercent}%` }}
                  />
                </div>
                {/* TRUTHFUL LABEL: Shows '5 / 5' instead of '5 / 4' */}
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Attended: {stat.attended} / {sessionsCount} Classes
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE SESSION CARD (Dynamic DB Logic) */}
      <div className={`${mainCardStyles} mb-4 relative overflow-hidden`}>
        {/* FIX: Removed the '.isActive' check, just check if the session exists */}
        {activeSession ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{activeSession.unitName}</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                <span className="text-emerald-700 text-[9px] font-black uppercase tracking-widest">Active</span>
              </div>
            </div>
            <div className="flex items-center text-slate-600 mb-5">
              <span className="text-xs font-semibold italic">{activeSession.timeRange}</span>
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

      {/* 4. UPCOMING SESSIONS (Dynamic DB Loop) */}
      <div className="flex flex-col flex-1 mb-6">
        <h3 className="text-slate-900 font-black text-lg mb-3 tracking-tight">Upcoming</h3>
        <div className="space-y-3">
          {upcomingUnits.length > 0 ? (
            upcomingUnits.map((unit, idx) => (
              <div key={idx} className={upcomingCardStyles}>
                <div className="p-2.5 bg-white rounded-xl text-indigo-800"><Database size={18}/></div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{unit.unitName}</h4>
                  <p className="text-[9px] font-mono text-slate-600">{unit.timeRange}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-600 italic font-bold">No more upcoming classes today.</p>
          )}
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
          
          /* NEW: Hides scrollbar for the horizontal carousel */
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;