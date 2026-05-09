import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, LogIn, Eye, EyeOff, AlertCircle, Mail, Loader2, CheckCircle2, X } from 'lucide-react';
import { loginStudent } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // --- FORGOT PASSWORD STATES ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setErrors({}); 
    let validationErrors = {};

    // 1. Validation Checks
    // 1. Validation Checks
    const regNoPattern = /^[A-Z]{3}\d{3}-\d{4}\/\d{4}$/;
    if (!regNumber.trim()) {
      validationErrors.regNumber = "Registration number is required";
    } else if (!regNoPattern.test(regNumber)) {
      validationErrors.regNumber = "Invalid Format: Use SCT211-0001/2022";
    }

    if (!password) {
      validationErrors.password = "Password is required";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 2. API Call
    try {
      const credentials = { regNo: regNumber, password: password };
      const response = await loginStudent(credentials);
      
      const userData = response.data.student;
      const token = response.data.token;

      if (userData && token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setTimeout(() => {
          if (userData.role === 'lecturer') {
            navigate('/lecturer-dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 100);
      } else {
        setErrors({ general: "Login failed: Security token or account data missing." });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || "Invalid credentials or server is offline.";
      
      // Route the error to the correct red border based on the backend message
      if (serverMsg.toLowerCase().includes("password")) {
        setErrors({ password: serverMsg });
      } else if (serverMsg.toLowerCase().includes("account") || serverMsg.toLowerCase().includes("register") || serverMsg.toLowerCase().includes("not found")) {
        setErrors({ regNumber: serverMsg });
      } else {
        setErrors({ general: serverMsg });
      }
    }
  };

  // --- HANDLE FORGOT PASSWORD SUBMIT ---
  const handleForgotPassword = async (e) => {
      e.preventDefault();
      setForgotError("");
      setForgotMessage("");

      try {
          setForgotLoading(true);
          const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ regNo: regNumber }) // Send the main regNumber state
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);

          setForgotMessage(data.message);
          setTimeout(() => {
              setShowForgotModal(false);
              setForgotMessage("");
          }, 4000);

      } catch (err) {
          setForgotError(err.message || "Failed to send reset link.");
      } finally {
          setForgotLoading(false);
      }
  };

  const labelStyles = "text-[10px] font-bold text-slate-800 uppercase tracking-widest pl-1";
  const inputStyles = "w-full p-4 pl-12 bg-white/90 rounded-2xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-400 transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D8B4FE] via-[#93C5FD] to-[#475569] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
     <div className="absolute top-6 left-6 z-20">
        {/* PLAIN STYLE: No glassmorphism, just a clean icon button */}
        <button 
          onClick={() => navigate('/')} 
          className="p-2 text-slate-700 hover:text-indigo-600 transition-all flex items-center gap-2 group"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold"></span>
        </button>
      </div>

      <div className="w-full max-w-[400px] flex flex-col items-center gap-8 relative z-10">
        
        <div className="text-center">
          <h1 className="text-[32px] font-black text-[#1E293B] tracking-tight">Log In</h1>
          <p className="text-slate-700 font-medium mt-1">Enter your credentials</p>
        </div>

        <div className="w-full bg-white/70 backdrop-blur-2xl p-8 rounded-[40px] border border-white/40 shadow-2xl shadow-black/10 space-y-6">
          
          {errors.general && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl mb-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold uppercase tracking-tight leading-tight">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label className={labelStyles}>Registration Number</label>
              <div className="relative flex items-center">
                <User className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type="text" 
                  required 
                  placeholder="AAA001-0001/2000" 
                  className={`${inputStyles} uppercase ${errors.regNumber ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}
                  value={regNumber}
                  onChange={(e) => { 
                    setRegNumber(e.target.value.toUpperCase()); 
                    if(errors.regNumber) setErrors({...errors, regNumber: null}); 
                  }}
                />
              </div>
              {errors.regNumber && <p className="text-rose-600 text-[10px] font-bold mt-1 pl-1 uppercase">{errors.regNumber}</p>}
            </div>

            <div className="space-y-1.5">
              <label className={labelStyles}>Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  placeholder="••••••••" 
                  className={`${inputStyles} pr-12 ${errors.password ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}
                  value={password}
                  onChange={(e) => { 
                    setPassword(e.target.value); 
                    if(errors.password) setErrors({...errors, password: null}); 
                  }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-400 hover:text-indigo-600 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-600 text-[10px] font-bold mt-1 pl-1 uppercase">{errors.password}</p>}
            </div>

            {/* FIXED OVERLAPPING: Added relative z-10, py-1, and e.preventDefault() */}
            <div className="flex justify-end pr-1 relative z-10">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  // Enforce entering RegNo first
                  if (!regNumber.trim()) {
                    setErrors({ regNumber: "Please enter your Registration Number first." });
                    return;
                  }
                  setShowForgotModal(true);
                }} 
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer py-1"
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all mt-2">
              Log In
              <LogIn size={20} />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-700 font-medium">
              Don't have an account?{' '}
              <span onClick={() => navigate('/register')} className="text-indigo-700 font-bold cursor-pointer hover:underline">Register</span>
            </p>
          </div>
        </div>
      </div>

      {/* --- FORGOT PASSWORD MODAL OVERLAY --- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-[360px] bg-white/95 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            
            <button onClick={() => setShowForgotModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>

            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                    <Lock size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Recover Account</h2>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed px-2">
                    Enter your university email to receive a password reset link.
                </p>
            </div>

            {forgotError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl mb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest">{forgotError}</p>
              </div>
            )}

            {forgotMessage ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-center space-y-2 animate-in fade-in">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                  <p className="text-xs font-bold leading-relaxed">{forgotMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <p className="text-sm text-slate-700 font-medium">Send reset link for:</p>
                      <p className="text-lg font-black text-indigo-700 uppercase tracking-wider mt-1">{regNumber}</p>
                  </div>

                  <button disabled={forgotLoading} type="submit" 
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                      {forgotLoading ? <Loader2 className="animate-spin" size={20} /> : "Confirm & Send Link"}
                  </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;