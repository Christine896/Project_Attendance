import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    /* GRADIENT: Vertical flow from Light Purple to Blue-Grey */
    <div className="relative min-h-screen bg-gradient-to-b from-[#D8B4FE] via-[#93C5FD] to-[#475569] flex flex-col items-center px-6 py-4 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* HEADER: Pushed to the absolute top */}
      <div className="w-full flex items-center justify-start z-20 max-w-5xl mx-auto pt-0">
        <div className="flex items-center">
          {/* font-bold for extra thickness as requested */}
          <span className="text-4xl font-bold tracking-tighter text-[#1E293B] italic">
            Proxi
            <span className="text-indigo-700 font-black not-italic">.</span>
          </span>
        </div>
      </div>

      {/* MAIN HERO SECTION: Centered vertically in the remaining space */}
      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center items-center text-center space-y-10 z-10">
        
        <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-black text-[#1E293B] leading-[1.1] tracking-tighter">
              Check in to class with a <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-800 drop-shadow-sm">
                single scan.
              </span>
            </h1>

            <p className="text-slate-800 text-lg md:text-xl px-4 leading-relaxed font-medium max-w-lg mx-auto opacity-90">
              Say goodbye to paper sheets. Scan the code, verify your location, and mark your presence in seconds.
            </p>
        </div>

        {/* PRIMARY ACTION: "Sign In" with vibrant gradient */}
        <div className="w-full flex flex-col items-center justify-center pt-4">
            <button 
              className="w-full sm:w-64 flex items-center justify-center py-3.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white text-xl font-black rounded-[20px] transition-all active:scale-[0.98] shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40"
              onClick={() => navigate('/login')} 
            >
              Sign In
            </button>
        </div>
      </div>
      
      {/* FOOTER DECOR: Pushed to the absolute bottom of the viewport */}
      <div className="w-full max-w-md text-center mt-auto pb-2 opacity-40">
        <p className="text-[10px] font-mono font-bold text-slate-900 tracking-[0.3em] uppercase">
          JKUAT SMART PORTAL • 2026
        </p>
      </div>

    </div>
  );
};

export default Landing;