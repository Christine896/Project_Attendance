import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import { useNavigate } from 'react-router-dom';
import { 
  Users, LogOut, RotateCcw, Clock, ShieldCheck, 
  Loader2, BookOpen, Hash, QrCode 
} from 'lucide-react';
import { getLecturerUnits, incrementUnitSession } from '../services/api'; // Added incrementUnitSession

const LecturerDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  
  // States
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10 * 60); 
  const [nonce, setNonce] = useState(Date.now());
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [isCapturing, setIsCapturing] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Fetch units on load
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await getLecturerUnits(user._id); 
        setUnits(response.data);
      } catch (err) {
        console.error("Failed to fetch units", err);
      }
    };
    fetchUnits();
  }, [user._id]);

  // Add this REF inside your component, before the useEffect
    const timerRef = useRef(null);

    useEffect(() => {
    let pollInterval;

    if (!showQR) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // 1. TIMER & QR ROTATION LOGIC
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowQR(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        const newTime = prev - 1;
        if (newTime % 10 === 0) setNonce(Date.now());
        return newTime;
      });
    }, 1000);

    // 2. LIVE ATTENDANCE POLLING (Step 11)
    const fetchLiveCount = async () => {
      try {
        const targetCode = selectedUnit?.unitCode || selectedUnit?.code;
        if (!targetCode) return;

        // Fetch today's attendance for this specific unit
        // Fetch only for this specific session ID
        const response = await fetch(`http://localhost:5000/api/auth/lecturer/attendance/${targetCode}/${sessionId}`);
        const data = await response.json();
        
        // If the backend returns an array of records, update the count
        if (Array.isArray(data)) {
          setScannedCount(data.length); 
        }
      } catch (err) {
        console.error("Live polling failed:", err);
      }
    };

    fetchLiveCount(); // Fetch immediately when session starts
    pollInterval = setInterval(fetchLiveCount, 5000); // Fetch again every 5 seconds

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [showQR, selectedUnit]);

  const handleStartSession = () => {
  // FIX: Check for both naming styles (capitalized or not)
  const code = selectedUnit?.unitCode || selectedUnit?.code || selectedUnit?.Unitcode;
  
  if (!selectedUnit || !code) {
    alert("Please select a valid unit first.");
    return;
  }
  
  setIsCapturing(true);
  
  navigator.geolocation.getCurrentPosition(
    async (position) => { // <--- ADDED 'async' HERE
      try {
        // STEP 12: Add +1 to the database logbook
        await incrementUnitSession(selectedUnit._id || selectedUnit.id);
      } catch (err) {
        console.error("Failed to increment session count", err);
      }

      const coords = { 
        lat: position.coords.latitude, 
        lng: position.coords.longitude 
      };
      
      const newSessionId = Date.now().toString(); 
      setSessionId(newSessionId);

      setLocation(coords);
      setIsCapturing(false);
      
      const expiry = Date.now() + 10 * 60 * 1000; 
      localStorage.setItem('activeSession', JSON.stringify({ 
        unit: selectedUnit, 
        expiry, 
        count: 0, 
        loc: coords 
      }));
      
      // THIS OPENS THE QR VIEW
      setShowQR(true);
    },
    (error) => {
      setIsCapturing(false);
      // In Kenya, indoor GPS can be tricky. This helps you debug.
      alert(`GPS Error: ${error.message}. Try moving near a window or using a hotspot.`);
    },
    { 
      enableHighAccuracy: false, 
      timeout: 10000 
    }
  );
};

  const handleReset = () => {
    setShowQR(false);
    localStorage.removeItem('activeSession');
    setScannedCount(0);
    setTimeLeft(10 * 60);
    setSelectedUnit(null);
    setSessionId(null);
  };

  // Helper function for the timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* HEADER */}
<div className="relative z-10 flex justify-between items-center px-8 py-6 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-400" size={24} />
          <h1 className="text-lg font-black uppercase tracking-widest italic">Lecturer <span className="text-blue-500">Console</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/add-unit')} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs font-bold uppercase hover:bg-white/10 transition-all">
            <BookOpen size={18} /> Add Unit
          </button>
          
          {/* ONLY CHANGE IS HERE: Added onClick */}
          <button 
            onClick={() => navigate('/class-list')} 
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs font-bold uppercase hover:bg-white/10 transition-all"
          >
            <Users size={18} /> Class List
          </button>

          <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          {!showQR ? ( 
            /* FORM VIEW */
            <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[40px] border border-white/10 shadow-2xl space-y-8">
              <div className="text-center">
                <h3 className="text-3xl font-black tracking-tight italic uppercase">Generate <span className="text-blue-500">QR</span></h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
                  <Clock size={12} className="text-blue-500" /> Each QR lasts 10 minutes
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4 mb-2 block">Unit Name</label>
                  <div className="relative flex items-center">
                    <BookOpen size={18} className="absolute left-4 text-blue-400" />
                    <input 
                      type="text"
                      placeholder="Type Unit Name"
                      className="w-full p-4 pl-12 bg-black/40 border border-white/10 rounded-2xl outline-none text-white font-bold focus:border-blue-500/50 transition-all"
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = units.find(u => u.name.toLowerCase() === val.toLowerCase());
                        setSelectedUnit(match ? match : { unitName: val, unitCode: '' });
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4 mb-2 block">Unit Code</label>
                  <div className="w-full p-4 bg-black/20 border border-white/5 rounded-2xl flex items-center gap-3 text-slate-400">
                    <Hash size={18} className="text-slate-600" />
                    <input 
                      type="text" readOnly 
                      value={selectedUnit?.unitCode || selectedUnit?.code || ""} 
                      placeholder="Auto-fills on match..."
                      className="bg-transparent outline-none w-full cursor-not-allowed text-sm italic font-mono tracking-widest"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleStartSession}
                  disabled={!selectedUnit || !selectedUnit.code || isCapturing}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl disabled:opacity-20 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                >
                  {isCapturing ? <Loader2 className="animate-spin" size={24} /> : <><QrCode size={20} /> Start Session</>}
                </button>
              </div>
            </div>
          ) : (
            /* QR VIEW WITH TIMER AT TOP */
            <div className="flex flex-col items-center animate-in zoom-in duration-700">
              <div className="flex gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 backdrop-blur-md">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">{scannedCount} present </span>
                </div>
                
                <div className={`bg-white/5 border rounded-2xl px-6 py-3 flex items-center gap-3 backdrop-blur-md ${timeLeft < 60 ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'}`}>
                  <Clock size={16} className={timeLeft < 60 ? 'text-rose-400' : 'text-blue-400'} />
                  <span className={`text-xs font-black uppercase tracking-widest ${timeLeft < 60 ? 'text-rose-400 font-bold' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[4rem] shadow-2xl mb-12 relative">
                <QRCodeSVG 
                    value={JSON.stringify({ 
                      unitId: selectedUnit?._id, 
                      code: selectedUnit?.unitCode || selectedUnit?.code, 
                      name: selectedUnit?.unitName || selectedUnit?.name,
                      sessionId: sessionId,
                      nonce: nonce, 
                      lat: location.lat, 
                      lng: location.lng 
                    })}
                    size={320}
                  />
              </div>
              
              <button onClick={handleReset} className="group flex items-center gap-2 px-10 py-5 bg-rose-500/10 text-rose-400 font-bold rounded-2xl border border-rose-500/20 hover:bg-rose-500/20 transition-all uppercase tracking-widest text-xs">
                <RotateCcw size={18} className="group-hover:rotate-180 transition-all duration-500" /> End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;