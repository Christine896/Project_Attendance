import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import API from '../services/api'; 
import { useNavigate } from 'react-router-dom';
import { 
  Users, LogOut, RotateCcw, Clock, ShieldCheck, Loader2, BookOpen, Hash, QrCode, 
  History as HistoryIcon, HelpCircle, XCircle, MapPin, Database, ToggleRight, Download
} from 'lucide-react';
import { getLecturerUnits, incrementUnitSession } from '../services/api'; 

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
  const [totalExpected, setTotalExpected] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  // --- NEW FIX: RESTORE ACTIVE SESSION ON LOAD ---
  useEffect(() => {
    const savedSession = localStorage.getItem('activeSession');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      const now = Date.now();
      
      // If the session is still within its 10-minute window, restore it!
      if (parsed.expiry > now) {
        setSelectedUnit(parsed.unit);
        setSessionId(parsed.sessionId);
        setLocation(parsed.loc);
        
        // Calculate exactly how many seconds are left
        const secondsRemaining = Math.floor((parsed.expiry - now) / 1000);
        setTimeLeft(secondsRemaining);
        
        // Pop the QR code back up
        setShowQR(true);
      } else {
        // If it expired while they were on the other page, clean it up
        localStorage.removeItem('activeSession');
      }
    }
  }, []);
  
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

  // --- NEW: FETCH TOTAL ENROLLED FOR STAT CARDS ---
  useEffect(() => {
    if (showQR && selectedUnit) {
      const fetchTotal = async () => {
        try {
           const expectedRes = await API.get(`/api/auth/expected-students/${selectedUnit.course}/${selectedUnit.semester}`);
           setTotalExpected(expectedRes.data.length || 0);
        } catch(e) { console.error("Failed to fetch expected count", e); }
      }
      fetchTotal();
    }
  }, [showQR, selectedUnit]);

  useEffect(() => {
    let pollInterval;
    let nonceInterval; // NEW: Dedicated QR updater

    if (!showQR) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // 1. DYNAMIC QR UPDATER (Perfectly updates every 10 seconds)
    nonceInterval = setInterval(() => {
      setNonce(Date.now());
    }, 10000);

    // 2. THE UI CLOCK (Strictly pure math so React doesn't freeze)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowQR(false);
          // Save to sticky history when time runs out
          const sessionData = localStorage.getItem('activeSession');
          if (sessionData) {
            localStorage.setItem('lastSession', sessionData);
            localStorage.removeItem('activeSession');
          }
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3. LIVE POLLING (Every 3 seconds)
    const fetchLiveCount = async () => {
      try {
        const targetCode = selectedUnit?.unitCode || selectedUnit?.code; 
        if (!targetCode || !sessionId) return;

        const response = await API.get(`/api/auth/lecturer/attendance/${targetCode}/${sessionId}`);
        const data = response.data;
        
        if (Array.isArray(data)) {
          setScannedCount(data.length); 
        }
      } catch (err) {
        console.error("Live polling failed:", err);
      }
    };

    fetchLiveCount(); 
    pollInterval = setInterval(fetchLiveCount, 3000); 

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollInterval) clearInterval(pollInterval);
      if (nonceInterval) clearInterval(nonceInterval); // Clean up the QR interval
    };
  }, [showQR, selectedUnit, sessionId]);

  const handleStartSession = () => {
    const code = selectedUnit?.unitCode || selectedUnit?.code || selectedUnit?.Unitcode;
    
    if (!selectedUnit || !code) {
      alert("Please select a valid unit first.");
      return;
    }
    
    setIsCapturing(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => { 
        // 1. SURGICAL FIX: Initialize newSessionId FIRST so it's available immediately
        const newSessionId = Date.now().toString(); 
        
        const coords = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };

       try {
            // SURGICAL FIX: Removed the duplicate "MASTER ANCHOR" call. 
            // We only need to send this payload to the backend ONCE.
            await API.post(`/api/auth/lecturer/session`, {
                unitCode: selectedUnit?.unitCode || selectedUnit?.code,
                unitName: selectedUnit?.unitName || selectedUnit?.name,
                sessionId: newSessionId
            });

        } catch (err) {
          console.error("Failed to anchor session", err);
        }

        setSessionId(newSessionId);
        setLocation(coords);
        setIsCapturing(false);
        
        const expiry = Date.now() + 10 * 60 * 1000; 
        
        localStorage.setItem('activeSession', JSON.stringify({ 
          unit: selectedUnit, 
          expiry,   
          count: 0, 
          loc: coords,
          sessionId: newSessionId  
        }));
        
        setNonce(Date.now());
        setShowQR(true);
      },
      (error) => {
        setIsCapturing(false);
        alert(`GPS Error: ${error.message}. Try moving near a window or using a hotspot.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReset = () => {
    setShowQR(false);
    // NEW: Save to history before deleting
    const sessionData = localStorage.getItem('activeSession');
    if (sessionData) {
      localStorage.setItem('lastSession', sessionData);
      localStorage.removeItem('activeSession');
    }
    setScannedCount(0);
    setTimeLeft(10 * 60);
    setSelectedUnit(null);
    setSessionId(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans relative overflow-hidden md:flex-row">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* SLEEK SIDEBAR / NAVIGATION RAIL */}
      <div className="relative z-20 w-64 bg-white/5 border-r border-white/10 flex-col p-6 backdrop-blur-3xl hidden md:flex shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-12 mt-4">
          <ShieldCheck className="text-blue-400 shrink-0" size={36} />
          <h1 className="text-xl font-black uppercase tracking-widest italic leading-tight text-white">
            Lecturer <br/><span className="text-blue-500">Console</span>
          </h1>
        </div>
        
        <div className="flex flex-col gap-2 flex-1">
          {/* ACTIVE PAGE */}
          <button onClick={() => navigate('/lecturer-dashboard')} className="flex items-center gap-4 px-5 py-4 bg-blue-600 rounded-2xl text-sm font-bold uppercase text-white shadow-lg shadow-blue-600/20 text-left transition-all">
            <QrCode size={20} /> Generate QR
          </button>
          
          {/* INACTIVE PAGES */}
          <button onClick={() => navigate('/add-unit')} className="flex items-center gap-4 px-5 py-4 bg-transparent rounded-2xl text-sm font-bold uppercase text-white/50 hover:text-white hover:bg-white/5 transition-all text-left">
            <BookOpen size={20} /> Add Unit
          </button>
          
          <button onClick={() => navigate('/class-list')} className="flex items-center gap-4 px-5 py-4 bg-transparent rounded-2xl text-sm font-bold uppercase text-white/50 hover:text-white hover:bg-white/5 transition-all text-left">
            <Users size={20} /> Attendance
          </button>

          <button onClick={() => navigate('/lecturer-history')} className="flex items-center gap-4 px-5 py-4 bg-transparent rounded-2xl text-sm font-bold uppercase text-white/50 hover:text-white hover:bg-white/5 transition-all text-left">
            <HistoryIcon size={20} /> View History
          </button>

          {/* NEW LECTURER HELP BUTTON (DESKTOP) */}
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-4 px-5 py-4 bg-transparent rounded-2xl text-sm font-bold uppercase text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 transition-all text-left mt-2">
            <HelpCircle size={20} /> User Guide
          </button>
        </div>

        <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="flex items-center gap-4 px-5 py-4 mt-auto bg-rose-500/10 text-rose-400 rounded-2xl hover:bg-rose-500/20 transition-all text-sm font-bold uppercase text-left">
          <LogOut size={20} /> Logout
        </button>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="md:hidden relative z-20 flex justify-between items-center p-6 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <ShieldCheck className="text-blue-400" size={28} />
        <div className="flex gap-2">
           <button onClick={() => navigate('/class-list')} className="p-2 bg-white/10 rounded-lg"><Users size={20}/></button>
           
           {/* NEW LECTURER HELP BUTTON (MOBILE) */}
           <button onClick={() => setShowHelp(true)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><HelpCircle size={20}/></button>
           
           <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><LogOut size={20}/></button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className={`w-full transition-all duration-700 ${!showQR ? 'max-w-xl' : 'max-w-[1100px]'}`}>
          {!showQR ? ( 
            /* FORM VIEW */
            <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[40px] border border-white/10 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-8">
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
            /* QR PRESENTATION MODE (SPLIT LAYOUT) */
            
            <div className="flex flex-col lg:flex-row w-full items-center justify-between gap-12 animate-in fade-in zoom-in-95 duration-700 bg-transparent">
              
              {/* LEFT SIDE: MASSIVE QR CODE (Increased by 10% to 550px) */}
              <div className="flex-1 flex justify-center items-center">
                <div className="bg-white p-6 rounded-[3rem] shadow-[0_0_80px_rgba(255,255,255,0.1)]">
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
                    size={600} 
                    level="L" 
                    includeMargin={true} 
                  />
                </div>
              </div>

              {/* RIGHT SIDE: TEXT & STATS DASHBOARD */}
              <div className="w-full lg:w-[380px] flex flex-col gap-5 shrink-0">
                
                {/* --- NEW: UNIT INFO BANNER --- */}
                  <div className="border border-white/10 bg-white/5 rounded-[2rem] p-6 flex flex-col items-center justify-center backdrop-blur-md text-center">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white drop-shadow-md leading-tight">
                    {selectedUnit?.unitName || selectedUnit?.name}
                  </h2>
                  <p className="text-blue-400 font-mono text-sm font-bold mt-2 tracking-[0.2em]">
                    {selectedUnit?.unitCode || selectedUnit?.code}
                  </p>
                </div>

                {/* 1. TIMER */}
                <div className={`border rounded-[2rem] p-8 flex flex-col items-center justify-center backdrop-blur-md transition-all ${timeLeft < 60 ? 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/5'}`}>
                  <span className="text-white/40 text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Clock size={16} className={timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-blue-400'} /> Time Remaining
                  </span>
                  <span className={`text-6xl font-black tracking-widest ${timeLeft < 60 ? 'text-rose-400' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>

                {/* 2. STAT CARDS */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* ENROLLED: Big, On Top (col-span-2) */}
                  <div className="col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center backdrop-blur-xl">
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Enrolled</span>
                    <span className="text-5xl font-black text-white">{totalExpected}</span>
                  </div>

                  {/* PRESENT: Bottom Left (No top line, larger text) */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex flex-col items-center justify-center backdrop-blur-xl">
                    <span className="text-emerald-400 text-sm font-black uppercase tracking-[0.2em] mb-1">Present</span>
                    <span className="text-4xl font-black text-emerald-400">{scannedCount}</span>
                  </div>

                  {/* ABSENT: Bottom Right (Larger text to match Present) */}
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 flex flex-col items-center justify-center backdrop-blur-xl">
                    <span className="text-rose-400/80 text-sm font-black uppercase tracking-[0.2em] mb-1">Absent</span>
                    <span className="text-4xl font-black text-rose-400">
                      {totalExpected > 0 ? Math.max(0, totalExpected - scannedCount) : 0}
                    </span>
                  </div>
                </div>

                {/* 3. END SESSION BUTTON */}
                <button onClick={handleReset} className="group mt-2 flex items-center justify-center gap-3 w-full py-5 bg-white/5 text-white/60 font-bold rounded-2xl border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all uppercase tracking-widest text-sm">
                  <RotateCcw size={20} className="group-hover:-rotate-180 transition-all duration-500" /> End Session
                </button>
                
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LECTURER HELP MODAL - MOVED HERE */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-5 animate-in fade-in duration-300">
          {/* Changed from max-w-md to max-w-lg for a wider, desktop-optimized view */}
          <div className="bg-[#111827]/90 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl p-7 w-full max-w-lg text-white">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-white">User Guide</h2>
              <button onClick={() => setShowHelp(false)} className="p-1.5 bg-white/10 rounded-full text-white/60 hover:text-white hover:bg-rose-500/80 transition-all">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-4 font-medium">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><MapPin size={18}/> Session Setup</h4>
                <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside">
                  <li>Type or select the Unit Name from the dashboard.</li>
                  <li>Click <strong>Start Session</strong> to lock the GPS anchor to your hall.</li>
                </ul>
              </div>
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Clock size={18}/> Live Monitoring</h4>
                <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside">
                  <li>The displayed QR code rotates automatically every 10 seconds.</li>
                  <li>Navigate to the <strong>Attendance</strong> tab in the menu to view the live roster.</li>
                </ul>
              </div>
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><ToggleRight size={18}/> Manual Overrides</h4>
                <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside">
                  <li>Navigate to the <strong>Attendance</strong> tab in the side menu.</li>
                  <li>Click the toggle icon on the <strong>far right</strong> of a student's name to mark them present/absent.</li>
                </ul>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Download size={18}/> Exporting Reports</h4>
                <ul className="text-xs text-white/70 space-y-1.5 list-disc list-inside">
                  <li><strong>Current Class:</strong> Download directly from the <strong>Attendance</strong> tab.</li>
                  <li><strong>Past Classes:</strong> Search for a unit and export it from the <strong>View History</strong> tab.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LecturerDashboard;