import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginStudent } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 1. ADD ERROR STATE
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setError(""); // Clear previous errors

    try {
      const credentials = {
        regNo: regNumber, 
        password: password
      };

      const response = await loginStudent(credentials);

// SPRINT 1 UPDATE: Check for student data AND the security token
const userData = response.data.student;
const token = response.data.token;

if (userData && token) {
  // 1. Save the Gate Pass (Token)
  localStorage.setItem('token', token);
  
  // 2. Save the User Profile
  localStorage.setItem('user', JSON.stringify(userData));
  
  setTimeout(() => {
    if (userData.role === 'lecturer') {
      navigate('/lecturer-dashboard');
    } else {
      navigate('/dashboard');
    }
  }, 100);
} else {
  setError("Login failed: Security token or account data missing.");
}
      
    } catch (error) {
      // 3. USE SETERROR FOR BACKEND FAILURES
      setError(error.response?.data?.message || "Invalid credentials or server is offline.");
    }
  };

  const labelStyles = "text-[10px] font-bold text-slate-800 uppercase tracking-widest pl-1";
  const inputStyles = "w-full p-4 pl-12 bg-white/90 rounded-2xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-400 transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D8B4FE] via-[#93C5FD] to-[#475569] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={() => navigate('/')}
          className="p-3 bg-white/50 backdrop-blur-md text-slate-700 hover:text-indigo-600 transition-all rounded-2xl border border-white/40 shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="w-full max-w-[400px] flex flex-col items-center gap-8 relative z-10">
        
        <div className="text-center">
          <h1 className="text-[32px] font-black text-[#1E293B] tracking-tight">Log In</h1>
          <p className="text-slate-700 font-medium mt-1">Enter your credentials</p>
        </div>

        <div className="w-full bg-white/70 backdrop-blur-2xl p-8 rounded-[40px] border border-white/40 shadow-2xl shadow-black/10 space-y-6">
          
          {/* 4. PROFESSIONAL ERROR BOX */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold uppercase tracking-tight leading-tight">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Registration Number */}
            <div className="space-y-1.5">
              <label className={labelStyles}>Registration Number</label>
              <div className="relative flex items-center">
                <User className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type="text" 
                  required
                  placeholder="AAA001-0001/2000"
                  className={`${inputStyles} uppercase`} // 5. ADD UPPERCASE CLASS
                  value={regNumber}
                  // 6. FORCE UPPERCASE ON INPUT
                  onChange={(e) => {
                    setRegNumber(e.target.value.toUpperCase());
                    if(error) setError("");
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className={labelStyles}>Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-500" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  placeholder="••••••••"
                  className={`${inputStyles} pr-12`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if(error) setError("");
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pr-1">
              <button 
                type="button"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all mt-2"
            >
              Log In
              <LogIn size={20} />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-700 font-medium">
              Don't have an account?{' '}
              <span 
                onClick={() => navigate('/register')} 
                className="text-indigo-700 font-bold cursor-pointer hover:underline"
              >
                Register
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;