import React, { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const SuccessOverlay = ({ unitName, unitCode, onComplete, status = "success", message }) => {
  
  useEffect(() => {
    // Auto-redirect to dashboard after 3 seconds
    const timer = setTimeout(onComplete, 3000); 
    return () => clearTimeout(timer);
  }, [onComplete]);

  const isSuccess = status === "success";

  return (
    /* GRADIENT MATCHED TO SCANNER COMPONENT */
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#7DD3FC] via-[#CBD5E1] to-[#A5B4FC] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
      
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm">
        
        {/* ICON SECTION */}
        <div className="relative mb-6">
          <div className={`absolute inset-0 ${isSuccess ? 'bg-cyan-400/30' : 'bg-rose-400/30'} blur-[40px] rounded-full animate-pulse`} />
          {isSuccess ? (
            <CheckCircle2 size={100} className="text-cyan-600 relative z-10 drop-shadow-lg" strokeWidth={1.5} />
          ) : (
            <XCircle size={100} className="text-rose-600 relative z-10 drop-shadow-lg" strokeWidth={1.5} />
          )}
        </div>

        {/* HEADER */}
        <h2 className={`text-4xl font-black tracking-tighter uppercase mb-4 ${isSuccess ? 'text-cyan-700' : 'text-rose-700'}`}>
          {isSuccess ? "Verified!" : "Failed!"}
        </h2>

        {/* GLASSMORPHIC TAB */}
        {isSuccess ? (
          <div className="w-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-xl animate-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">
              
              {/* UNIT CODE FIRST - LABEL BLACK */}
              <div className="text-left">
                <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] block mb-1">Unit Code</span>
                <p className="text-xl font-bold text-slate-900 tracking-tight">
                  {unitCode || "---"}
                </p>
              </div>

              <div className="h-[1px] bg-black/10 w-full" />

              {/* UNIT NAME SECOND - LABEL BLACK */}
              <div className="text-left">
                <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] block mb-1">Unit Name</span>
                <p className="text-xl font-bold text-slate-900 leading-tight tracking-tight">
                  {unitName || "---"} 
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-white/40 border border-white/60 rounded-2xl p-6 backdrop-blur-md shadow-lg">
            <p className="text-rose-700 font-bold text-lg">
              {message || "Authentication Failed"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessOverlay;