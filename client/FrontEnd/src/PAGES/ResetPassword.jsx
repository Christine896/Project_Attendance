import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams(); // Grabs the secret token from the URL

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL; // SURGICAL ADDITION
  
  const [errors, setErrors] = useState({}); // SURGICAL FIX
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setErrors({});
    let validationErrors = {};

    const passwordPattern = /^(?=.*[0-9])(?=.*[!@#$%^&*_])[a-zA-Z0-9!@#$%^&*_]{6,}$/;
    if (!passwordPattern.test(password)) {
        validationErrors.password = "Need 6+ chars, 1 number, and 1 symbol.";
    }
    if (password !== confirmPassword) {
        validationErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsLoading(true);
      
      // SURGICAL FIX: Using live URL instead of 192.168
      const res = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccessMsg("Password Reset Successful!");

      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setErrors({ general: err.message || "Failed to reset password. The link may be expired." });
    } finally {
      setIsLoading(false);
    }
  };

  const labelStyles = "text-[10px] font-bold text-slate-800 uppercase tracking-widest pl-1";
  const inputStyles = "w-full p-4 pl-12 bg-white/90 rounded-2xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-400 transition-all shadow-sm";

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 font-sans overflow-hidden transition-colors duration-700 ${
      successMsg 
        ? "bg-gradient-to-br from-[#E9D5FF] via-[#DBEAFE] to-[#F8FAFC]" 
        // We lightened the bottom color from #475569 (Slate 600) to #94A3B8 (Slate 400) to fix the mobile dark bleed
        : "bg-gradient-to-br from-[#D8B4FE] via-[#93C5FD] to-[#94A3B8]"
    }`}>
      
      {successMsg ? (
        /* THE GRADIENT SUCCESS SCREEN (Imported from your Register design) */
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 -mt-24">
          <svg width="0" height="0" className="absolute">
            <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor="#6366F1" offset="0%" />
              <stop stopColor="#8B5CF6" offset="50%" />
              <stop stopColor="#EC4899" offset="100%" />
            </linearGradient>
          </svg>

          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/20 blur-[50px] rounded-full animate-pulse" />
            <CheckCircle2 size={100} stroke="url(#icon-gradient)" className="relative z-10 drop-shadow-md" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-3xl font-black bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-transparent bg-clip-text tracking-tight pb-1 drop-shadow-sm">
            {successMsg}
          </h1>
          <p className="text-slate-500 font-medium mt-4 animate-pulse">Redirecting to login...</p>
        </div>
      ) : (
        /* THE RESET FORM */
        <div className="w-full max-w-[400px] flex flex-col items-center gap-8 relative z-10 animate-in fade-in duration-500">
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl text-white rounded-full flex items-center justify-center mx-auto mb-4 border border-white/40 shadow-xl">
                <Lock size={32} />
            </div>
            <h1 className="text-[32px] font-black text-[#1E293B] tracking-tight">New Password</h1>
            <p className="text-slate-700 font-medium mt-1">Create a new secure password</p>
          </div>

          <div className="w-full bg-white/70 backdrop-blur-2xl p-8 rounded-[40px] border border-white/40 shadow-2xl shadow-black/10 space-y-6">
            
            {errors.general && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold uppercase tracking-tight leading-tight">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleReset} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelStyles}>New Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-500" size={20} />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" 
                    className={`${inputStyles} pr-12 ${errors.password ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if(errors.password) setErrors({...errors, password: null}); }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-400 hover:text-indigo-600 transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-rose-600 text-[10px] font-bold mt-1 pl-1 uppercase">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className={labelStyles}>Confirm Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-500" size={20} />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" 
                    className={`${inputStyles} ${errors.confirmPassword ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if(errors.confirmPassword) setErrors({...errors, confirmPassword: null}); }}
                  />
                </div>
                {errors.confirmPassword && <p className="text-rose-600 text-[10px] font-bold mt-1 pl-1 uppercase">{errors.confirmPassword}</p>}
              </div>

              <button disabled={isLoading} type="submit" className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all mt-4 disabled:opacity-70">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;