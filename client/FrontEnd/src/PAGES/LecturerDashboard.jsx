import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import { useNavigate } from 'react-router-dom';
import { Users, LogOut, RotateCcw, Clock, ShieldCheck } from 'lucide-react';

const LecturerDashboard = () => {
  const navigate = useNavigate();
  const [unitInfo, setUnitInfo] = useState({ name: '', code: '' });
  const [showQR, setShowQR] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10 * 60); 
  const [nonce, setNonce] = useState(Date.now());
  const audioContext = useRef(null);

  const isCodeValid = /^[A-Z]{3} \d{3}$/.test(unitInfo.code.toUpperCase());

  useEffect(() => {
    const savedSession = localStorage.getItem('activeSession');
    if (savedSession) {
      const { unit, expiry, count } = JSON.parse(savedSession);
      const remaining = Math.floor((expiry - Date.now()) / 1000);
      if (remaining > 0) {
        setUnitInfo(unit);
        setTimeLeft(remaining);
        setScannedCount(count);
        setShowQR(true);
      } else {
        localStorage.removeItem('activeSession');
      }
    }
  }, []);

  // 15-SECOND ROLLING QR LOGIC
  useEffect(() => {
    let nonceTimer;
    if (showQR) {
      nonceTimer = setInterval(() => {
        setNonce(Date.now()); 
      }, 15000); 
    }
    return () => clearInterval(nonceTimer);
  }, [showQR]);

  useEffect(() => {
    let timer;
    if (showQR && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setShowQR(false);
            localStorage.removeItem('activeSession');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showQR, timeLeft]);

  const handleStartSession = () => {
    const expiry = Date.now() + 10 * 60 * 1000; 
    localStorage.setItem('activeSession', JSON.stringify({ unit: unitInfo, expiry, count: 0 }));
    setShowQR(true);
  };

  const handleReset = () => {
    setShowQR(false);
    localStorage.removeItem('activeSession');
    setScannedCount(0);
    setTimeLeft(10 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    /* GRADIENT: Light Blue -> Dark Blue -> Almost Black (20% Darker overall) */
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans overflow-hidden relative">
      
      {/* Dark Overlay for the 20% extra depth effect */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center px-8 py-6 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-400" size={24} />
          <h1 className="text-lg font-black uppercase tracking-widest">Lecturer Console</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/lecturer-reports')} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
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
            /* SESSION FORM */
            <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[40px] border border-white/10 shadow-2xl animate-in fade-in duration-500">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-black tracking-tight">Generate Attendance</h3>
                <p className="text-blue-200/50 text-sm mt-1">10 Minute Session • Rolling QR (15s)</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 ml-4 mb-2 block">Unit Name</label>
                  <input type="text" placeholder="e.g. Distributed Systems" className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-white outline-none focus:border-blue-500 transition-all" onChange={(e) => setUnitInfo({...unitInfo, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 ml-4 mb-2 block">Unit Code</label>
                  <input type="text" placeholder="SIT 302" className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-white outline-none focus:border-blue-500 transition-all" onChange={(e) => setUnitInfo({...unitInfo, code: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <button 
                onClick={handleStartSession}
                disabled={!unitInfo.name || !isCodeValid}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl disabled:opacity-20 active:scale-[0.98] transition-all mt-8 uppercase tracking-widest"
              >
                Start Session
              </button>
            </div>
          ) : (
            /* CLEAN ROLLING QR DISPLAY */
            <div className="flex flex-col items-center animate-in zoom-in duration-700">
              
              <div className="flex gap-4 mb-10">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 backdrop-blur-md">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">{scannedCount} Present</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 backdrop-blur-md">
                  <Clock size={16} className="text-blue-400" />
                  <span className={`text-xs font-black uppercase tracking-widest ${timeLeft < 60 ? 'text-rose-400 font-bold' : ''}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* QR CODE - FLASHES EVERY 15 SECS */}
              <div 
                key={nonce} 
                className="bg-white p-10 rounded-[4rem] shadow-2xl mb-12 flex items-center justify-center animate-in fade-in duration-500"
              >
                <QRCodeSVG 
                  value={JSON.stringify({...unitInfo, nonce})} 
                  size={320} 
                  level="H" 
                  includeMargin={false} 
                  fgColor="#020617" 
                />
              </div>
              
              <button 
                onClick={handleReset} 
                className="group flex items-center gap-2 px-10 py-5 bg-rose-500/10 text-rose-400 font-bold rounded-2xl border border-rose-500/20 hover:bg-rose-500/20 transition-all shadow-lg uppercase tracking-widest text-xs"
              >
                <RotateCcw size={18} className="group-hover:rotate-180 transition-all duration-500" /> 
                End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;