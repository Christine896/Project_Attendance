import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerStudent } from '../services/api'; 
import { Eye, EyeOff, User, Building2, GraduationCap, BookOpenText, Mail, Lock, ChevronDown, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'; 

const Register = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
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

  const schoolData = {
    "School of Computing": ["BSc. Software Engineering", "BSc. Computer Science", "BSc. IT"],
    "School of Engineering": ["BSc. Civil Engineering", "BSc. Mechanical Engineering", "BSc. Electrical"],
    "School of Business": ["BCom", "BSc. Economics", "Business Administration"]
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); 

    if (!formData.email.trim().toLowerCase().endsWith("@students.jkuat.ac.ke")) {
      setError("You must use your JKUAT student email");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }

    if (!formData.school || !formData.course) {
      setError("Please select both your school and course.");
      return;
    }

    try {
      setIsLoading(true);
      await registerStudent(formData);
      
      // TRIGGER MINIMALIST WHITE SUCCESS
      setSuccessMsg("Registration successful");

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.message || "Server error: Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const labelStyles = "text-[10px] font-bold text-slate-800 uppercase tracking-widest pl-1";
  const inputBaseStyles = "w-full p-4 pl-12 bg-white/90 rounded-2xl border border-slate-200 outline-none text-slate-900 placeholder:text-slate-400 font-medium focus:border-indigo-400 transition-all cursor-pointer flex items-center justify-between shadow-sm";
  const dropdownMenuStyles = "absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D8B4FE] via-[#93C5FD] to-[#475569] flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      
      {successMsg ? (
        /* MINIMALIST WHITE SUCCESS SCREEN (2 SECONDS) */
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
          <div className="relative mb-6">
            {/* Subtle white glow */}
            <div className="absolute inset-0 bg-white/20 blur-[50px] rounded-full animate-pulse" />
            <CheckCircle2 
              size={100} 
              className="text-white relative z-10 opacity-90" 
              strokeWidth={1.2} 
            />
          </div>
          
          <h1 className="text-3xl font-medium text-white tracking-tight opacity-90 drop-shadow-md">
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
              <div className="space-y-1.5">
                <label className={labelStyles}>Full Name</label>
                <div className="relative flex items-center text-slate-500">
                  <User className="absolute left-4" size={20} />
                  <input type="text" required placeholder="Alex Johnson" className={inputBaseStyles}
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
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
                    onChange={(e) => setFormData({...formData, email: e.target.value})} />
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
    </div>
  );
};

export default Register;