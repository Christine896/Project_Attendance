import React, { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const SuccessOverlay = ({ unitName, unitCode, onComplete, status = "success" }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000); 
    return () => clearTimeout(timer);
  }, [onComplete]);

  const isSuccess = status === "success";

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#60A5FA] via-[#E2E8F0] to-[#A78BFA] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center w-full max-w-sm">
        
        {/* Dynamic Icon */}
        <div className="relative mb-6">
          <div className={`absolute inset-0 ${isSuccess ? 'bg-cyan-400/40' : 'bg-rose-400/40'} blur-[45px] rounded-full animate-pulse`} />
          
          {isSuccess ? (
            <CheckCircle2 
              size={110} 
              className="text-cyan-500 relative z-10 animate-in zoom-in duration-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
              strokeWidth={1.5} 
            />
          ) : (
            <XCircle 
              size={110} 
              className="text-rose-500 relative z-10 animate-in zoom-in duration-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
              strokeWidth={1.5} 
            />
          )}
        </div>

        {/* Status Text */}
        <h2 className={`text-4xl font-black tracking-tighter uppercase mb-12 drop-shadow-sm ${isSuccess ? 'text-cyan-600' : 'text-rose-600'}`}>
          {isSuccess ? "Verified!" : "Failed!"}
        </h2>

        {/* Data Card Section */}
        {unitCode ? (
          /* THE TAB: Shows only when unitCode exists (Success or Expired) */
          <div className="relative w-full bg-white/30 border border-white/50 rounded-[3rem] p-10 pt-14 backdrop-blur-xl shadow-2xl">
            <div className="absolute top-6 right-10">
              <span className="text-[13px] font-black text-slate-900/60 tracking-tighter">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col items-start border-b border-black/5 pb-5">
                <span className="text-[11px] font-black text-indigo-900/60 uppercase tracking-widest mb-1">
                  Unit Name
                </span>
                <span className={`text-xl font-bold text-left leading-tight ${!isSuccess ? 'text-rose-600' : 'text-slate-900'}`}>
                  {unitName}
                </span>
              </div>
              
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-black text-indigo-900/60 uppercase tracking-widest mb-1">
                  Unit Code
                </span>
                <span className="text-xl font-mono font-bold text-indigo-900">
                  {unitCode}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* THE CLEAN VERSION: Shows only when unitCode is empty (Invalid QR) */
          <div className="mt-4 animate-in fade-in zoom-in duration-500">
            <p className="text-2xl font-black text-rose-600 uppercase tracking-[0.2em]">
              {unitName}
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default SuccessOverlay;