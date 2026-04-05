
import { useNavigate } from 'react-router-dom';
import { registerStudent } from '../services/api'; 
import { Eye, EyeOff, User, Building2, GraduationCap, BookOpenText, Mail, Lock, ChevronDown, AlertCircle, Loader2, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const Register = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '',
    regNo: '',
    school: '',
    course: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState(""); 
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
      const verifying = localStorage.getItem('isVerifying');
      const savedData = localStorage.getItem('pendingFormData');

      if (verifying === 'true' && savedData) {
          const parsedData = JSON.parse(savedData);
          
          // 1. Put all the text back into the inputs
          setFormData(parsedData); 
          
          // 2. Open the modal again
          setShowOtpModal(true);
          
          // 3. Re-fill the course list so the dropdowns work
          if (parsedData.school) {
              setAvailableCourses(schoolData[parsedData.school] || []);
          }
      }
  }, []);

  const schoolData = {
    "School of Computing": ["BSc. Software Engineering", "BSc. Computer Science", "BSc. Information Technology"],
    "School of Engineering": ["BSc. Civil Engineering", "BSc. Mechanical Engineering", "BSc. Electrical Engineering"],
    "School of Business": ["B.Commerce", "BSc. Economics", "BSc. Business Administration"]
  };

  const handleSchoolSelect = (school) => {
    setFormData({ ...formData, school: school, course: '' });
    setAvailableCourses(schoolData[school] || []);
    setIsSchoolOpen(false);
    setError("");
  };

  const handleCourseSelect = (course) => {
    setFormData({ ...formData, course: course });
    setIsCourseOpen(false);
    setError("");
  };

  // --- NEW: COUNTDOWN TIMER FOR RESEND ---
  useEffect(() => {
    let interval;
    if (showOtpModal && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, resendTimer]);

  // --- NEW: RESEND OTP FUNCTION ---
  const handleResendOtp = async () => {
    setResendTimer(60); // Reset timer
    setError("");
    setOtpValue("");
    
    try {
      await fetch('http://192.168.0.102:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });;
    } catch (err) {
      setError("Failed to resend. Check your connection.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); 

    // 1. Name Validation (Letters only)
    const namePattern = /^[A-Za-z\s]+$/;
    if (!namePattern.test(formData.firstName) || !namePattern.test(formData.lastName)) {
      setError("Names should only contain letters.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. University Email Check
    if (!formData.email.trim().toLowerCase().endsWith("@students.jkuat.ac.ke")) {
      setError("You must use your JKUAT student email");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }

    // 3. Student ID Format
    const regNoPattern = /^[A-Z]{3}\d{3}-\d{4}\/\d{4}$/;
    if (!regNoPattern.test(formData.regNo)) {
      setError("Invalid Student ID format");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // This now allows underscores (_) alongside other special characters
    const passwordPattern = /^(?=.*[0-9])(?=.*[!@#$%^&*_])[a-zA-Z0-9!@#$%^&*_]{6,}$/;
    if (!passwordPattern.test(formData.password)) {
      setError("Password should have a minimum of 6 characters, 1 number, and 1 symbol");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.school || !formData.course) {
      setError("Please select both your school and course.");
      return;
    }

    try {
      setIsLoading(true);
      // Replace the old fetch with this:
      const res = await fetch('http://192.168.0.102:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.requireOtp) {
          // Save the WHOLE form so data persists if the student goes to Gmail
          localStorage.setItem('isVerifying', 'true');
          localStorage.setItem('pendingFormData', JSON.stringify(formData));
          setShowOtpModal(true);
      }
      
    } catch (err) {
      setError(err.message || "Server error: Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
      e.preventDefault();
      setError("");
      
      if (otpValue.length !== 6) {
          setError("OTP must be 6 digits.");
          return;
      }

      try {
          setIsVerifying(true);
          // Replace the old fetch with this:
         const res = await fetch('http://192.168.0.102:5000/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regNo: formData.regNo, otp: otpValue })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);

          // SUCCESS: Wipe the temporary memory so the modal doesn't "haunt" the user
          localStorage.removeItem('isVerifying');
          localStorage.removeItem('pendingFormData');

          setShowOtpModal(false);
          setSuccessMsg("Registration successful!");

          setTimeout(() => {
            navigate('/login');
          }, 2000);

      } catch (err) {
          setError(err.message || "Verification failed.");
          setTimeout(() => {
              setOtpValue("");
              setError("");
          }, 2000);
      } finally {
          setIsVerifying(false);
      }
  };

  const labelStyles = "text-[10px] font-bold text-slate-800 uppercase tracking-widest pl-1";
  const inputBaseStyles = "w-full p-4 pl-12 bg-white/90 rounded-2xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-400 transition-all cursor-pointer flex items-center justify-between shadow-sm";
  const dropdownMenuStyles = "absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans overflow-hidden transition-all duration-700 ${
      successMsg 
        ? "bg-gradient-to-br from-[#E9D5FF] via-[#DBEAFE] to-[#F8FAFC]" // Light background for Success
        : "bg-gradient-to-br from-[#D8B4FE] via-[#93C5FD] to-[#475569]" // Original dark background for Form
    }`}>
      {successMsg ? (
        /* RESTORED SIZE WITH GRADIENT VISIBILITY */
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
          
          {/* 1. Define the gradient for the icon */}
          <svg width="0" height="0" className="absolute">
            <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor="#6366F1" offset="0%" />
              <stop stopColor="#8B5CF6" offset="50%" />
              <stop stopColor="#EC4899" offset="100%" />
            </linearGradient>
          </svg>

          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/20 blur-[50px] rounded-full animate-pulse" />
            {/* 2. The Icon (Original size 100, but using the gradient URL) */}
            <CheckCircle2 
              size={100} 
              stroke="url(#icon-gradient)" 
              className="relative z-10 drop-shadow-md" 
              strokeWidth={1.5} 
            />
          </div>
          
          {/* 3. The Text (Original size 3xl, using matching gradient) */}
          <h1 className="text-3xl font-black bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-transparent bg-clip-text tracking-tight pb-1 drop-shadow-sm">
            {successMsg}
          </h1>
        </div>
      ) : (
        /* REGISTRATION FORM */
        <div className="w-full max-w-[400px] flex flex-col items-center gap-8 animate-in fade-in duration-500">
          <div className="text-center">
            <h1 className="text-[32px] font-black text-[#1E293B] tracking-tight">Create Account</h1>
          </div>

          <div className="w-full bg-white/70 backdrop-blur-2xl p-8 rounded-[40px] border border-white/40 shadow-2xl shadow-black/10 text-left">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl mb-6 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold uppercase tracking-tight leading-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              {/* NAME SECTION - SPLIT INTO TWO */}
              <div className="flex gap-3"> 
                <div className="space-y-1.5 flex-1">
                  <label className={labelStyles}>First Name</label>
                  <div className="relative flex items-center text-slate-500">
                    <User className="absolute left-4" size={20} />
                    <input 
                      type="text" 
                      required 
                      placeholder="Alex" 
                      className={inputBaseStyles}
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <label className={labelStyles}>Last Name</label>
                  <div className="relative flex items-center text-slate-500">
                    {/* Optional: You can hide the icon for the second field to keep it clean */}
                    <input 
                      type="text" 
                      required 
                      placeholder="Johnson" 
                      className={inputBaseStyles.replace('pl-12', 'pl-4')} // Removing left padding since no icon
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelStyles}>Student ID</label>
                <div className="relative flex items-center text-slate-500">
                  <Building2 className="absolute left-4" size={20} />
                  <input type="text" required placeholder="SCT211-0001/2022" 
                    className={inputBaseStyles + " uppercase"}
                    value={formData.regNo}
                    onChange={(e) => setFormData({...formData, regNo: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className={labelStyles}>School</label>
                <div onClick={() => setIsSchoolOpen(!isSchoolOpen)} className={inputBaseStyles}>
                    <GraduationCap className="absolute left-4 text-slate-500" size={20} />
                    <span className={formData.school ? "text-slate-900" : "text-slate-400 text-sm"}>
                        {formData.school || "Select School"}
                    </span>
                    <ChevronDown className={`text-slate-400 transition-transform ${isSchoolOpen ? 'rotate-180' : ''}`} size={18} />
                </div>
                {isSchoolOpen && (
                    <div className={dropdownMenuStyles}>
                        {Object.keys(schoolData).map((school) => (
                            <div key={school} onClick={() => handleSchoolSelect(school)}
                                className="p-4 hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                                {school}
                            </div>
                        ))}
                    </div>
                )}
              </div>

              <div className="space-y-1.5 relative">
                <label className={labelStyles}>Course</label>
                <div onClick={() => formData.school && setIsCourseOpen(!isCourseOpen)} 
                     className={`${inputBaseStyles} ${!formData.school ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <BookOpenText className="absolute left-4 text-slate-500" size={20} />
                    <span className={formData.course ? "text-slate-900" : "text-slate-400 text-sm"}>
                        {formData.course || "Select Course"}
                    </span>
                    <ChevronDown className={`text-slate-400 transition-transform ${isCourseOpen ? 'rotate-180' : ''}`} size={18} />
                </div>
                {isCourseOpen && formData.school && (
                    <div className={dropdownMenuStyles}>
                        {availableCourses.map((course) => (
                            <div key={course} onClick={() => handleCourseSelect(course)}
                                className="p-4 hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                                {course}
                            </div>
                        ))}
                    </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelStyles}>University Email</label>
                <div className="relative flex items-center text-slate-500">
                  <Mail className="absolute left-4" size={20} />
                  <input type="email" required placeholder="name@students.jkuat.ac.ke" className={inputBaseStyles}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelStyles}>Password</label>
                <div className="relative flex items-center text-slate-500">
                  <Lock className="absolute left-4" size={20} />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="********" className={`${inputBaseStyles} pr-12`}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-400 hover:text-indigo-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all mt-4 disabled:opacity-70"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Create Account"}
              </button>
            </form>

            <div className="text-center pt-6">
              <p className="text-sm text-slate-700 font-medium">
                Already have an account? <span onClick={() => navigate('/login')} className="text-indigo-700 font-bold cursor-pointer hover:underline">Sign In</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- OTP MODAL OVERLAY --- */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-[360px] bg-white/90 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            
            <button 
              onClick={() => {
                // 1. Wipe the "Persistence" memory
                localStorage.removeItem('isVerifying');
                localStorage.removeItem('pendingFormData');
                
                // 2. Actually close the modal
                setShowOtpModal(false);
              }} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Verify Identity</h2>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed px-2">
                    We sent a 6-digit code to <br/><span className="font-bold text-indigo-600">{formData.email}</span>
                </p>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-1.5">
                    <label className={labelStyles}>Security Code</label>
                    <input 
                        required 
                        type="text" 
                        maxLength="6"
                        placeholder="123456" 
                        className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 text-center text-2xl tracking-[0.5em] font-black text-slate-700 placeholder:text-slate-300 transition-all" 
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                    />
                </div>

                <button disabled={isVerifying || otpValue.length !== 6} type="submit" 
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : "Verify & Continue"}
                </button>
            </form>

          <div className="mt-6 text-center">
                <p className="text-xs text-slate-500 font-medium">
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                        <span className="text-slate-400 font-bold">Resend in {resendTimer}s</span>
                    ) : (
                        <button 
                          type="button" 
                          onClick={handleResendOtp} 
                          className="text-indigo-600 font-black hover:text-indigo-700 hover:underline transition-all"
                        >
                            Resend OTP
                        </button>
                    )}
                </p>
            </div>
            
          </div>
        </div>
      )}

      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <mask id="checkmark-mask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
            {/* Everything white is visible, everything black is invisible */}
            <rect width="1" height="1" fill="white"/>
            {/* We position the Lucide icon shape perfectly within the mask */}
            <g transform="scale(0.02) translate(13, 13)">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="m9 11 3 3L22 4" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </mask>
        </defs>
      </svg>

    </div>
  );
};

export default Register;