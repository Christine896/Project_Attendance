import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Mail, BookOpen, LogOut, GraduationCap, Lock, CircleUser, Building2, X, Loader2, Eye, EyeOff 
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState({
    fullName: "Student Name",
    regNo: "SCT211-0000/2022",
    email: "student@students.jkuat.ac.ke",
    school: "School of Computing",
    course: "BSc. Computer Science",
  });

  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState(""); 
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    // Read the user object that was saved during Login/Registration
    const savedUser = JSON.parse(localStorage.getItem('user'));
    
    if (savedUser) {
      // COMBINE NAMES: If firstName and lastName exist, join them. 
      // Otherwise, use the existing fullName string.
      const combinedName = savedUser.firstName 
        ? `${savedUser.firstName} ${savedUser.lastName}` 
        : savedUser.fullName;

      setStudent({
        ...savedUser,
        fullName: combinedName,
        school: savedUser.school || "School of Computing",
        course: savedUser.course || "Information Technology",
        semester: savedUser.semester || "Year 4, Sem 1"
      });
    }
  }, []);

  const handleLogout = () => {
    // 1. Completely wipe the keys to the castle
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Optional: Clear offline scans if you don't want them leaking to another user
    // localStorage.removeItem('pending_scans'); 

    // 2. Hard Redirect: This forces React to flush its memory completely 
    // and replaces the history state so the "Back" button cannot return here.
    window.location.replace('/login');
  };

  // MOCKUP: Password Update Logic
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setPasswordError("");

    try {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: savedUser._id, 
          currentPassword, 
          newPassword 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setModalSuccess(true);
      
      // Clear inputs and close modal after success
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(false);
        setCurrentPassword("");
        setNewPassword("");
      }, 2000);

    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdating(false);
    }
  };

  const mainCardStyles = "bg-white/40 backdrop-blur-2xl rounded-[28px] border border-white/30 shadow-lg p-5 transition-all";
  const iconContainerStyles = "p-3 bg-white/40 rounded-2xl shadow-sm text-indigo-900 border border-white/40 shrink-0"; // Added shrink-0 to prevent icon squishing

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#93C5FD] via-[#C7D2FE] to-[#D8B4FE] flex flex-col font-sans overflow-hidden p-5 pb-24">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-center mb-8 pt-1">
        <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 text-indigo-950 active:scale-95 shadow-sm">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Student Profile</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* AVATAR SECTION */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[28px] flex items-center justify-center shadow-xl border-2 border-blue-900/40">
            <CircleUser size={48} className="text-white" strokeWidth={1.5} />
          </div>
          
          <h2 className="mt-5 text-2xl font-black text-slate-900 tracking-tight text-center px-4 capitalize">
            {student.fullName.toLowerCase()}
          </h2>
          
          <span className="mt-1 text-indigo-950 text-sm font-black uppercase tracking-[0.15em]">
            {student.regNo}
          </span>

          {/* THE NEW SEMESTER BADGE */}
          {student.semester && (
            <span className="mt-2 text-indigo-900 text-[10px] font-black uppercase tracking-widest bg-white/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/60 shadow-sm">
              {student.semester}
            </span>
          )}
        </div>
 
        {/* 3. DETAILS LIST */}
        <div className="space-y-3">
          
          {/* NEW: School Card */}
          <div className={`${mainCardStyles} flex items-center gap-4 py-4`}>
            <div className={iconContainerStyles}><Building2 size={20} strokeWidth={2.5} /></div>
            <div>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">School / Faculty</p>
              <p className="text-sm text-slate-900 font-bold leading-tight">{student.school}</p>
            </div>
          </div>

          <div className={`${mainCardStyles} flex items-center gap-4 py-4`}>
            <div className={iconContainerStyles}><GraduationCap size={20} strokeWidth={2.5} /></div>
            <div>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Program of Study</p>
              <p className="text-sm text-slate-900 font-bold leading-tight">{student.course}</p>
            </div>
          </div>

          <div className={`${mainCardStyles} flex items-center gap-4 py-4`}>
            <div className={iconContainerStyles}><Mail size={20} strokeWidth={2.5} /></div>
            <div className="overflow-hidden">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Institutional Email</p>
              <p className="text-sm text-slate-900 font-bold truncate">{student.email}</p>
            </div>
          </div>

          {/* CHANGE PASSWORD TRIGGER */}
          <button onClick={() => setIsModalOpen(true)} className={`${mainCardStyles} w-full flex items-center gap-4 py-4 hover:bg-white/50`}>
            <div className={iconContainerStyles}><Lock size={20} strokeWidth={2.5} /></div>
            <div className="text-left">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Security</p>
              <p className="text-sm text-indigo-900 font-medium">Change Password</p>
            </div>
          </button>
        </div>

        {/* 4. LOGOUT */}
        <button onClick={handleLogout} className="mt-8 w-full p-4 bg-rose-600/20 border-2 border-rose-600/40 text-rose-700 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <LogOut size={18} strokeWidth={2.5} /> Log Out
        </button>
      </div>

      {/* --- CHANGE PASSWORD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isUpdating && setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-[360px] bg-white/90 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            {modalSuccess ? (
          <div className="py-8 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Password Updated</h3>
            <p className="text-sm text-slate-500">Your security is now up to date.</p>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <h2 className="text-xl font-black text-slate-900 mb-2">Security Update</h2>
            
            {/* Current Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
              <div className="relative flex items-center">
                <input 
                  required 
                  type={showCurrent ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full p-4 pr-12 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 text-sm transition-all" 
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative flex items-center">
                <input 
                  required 
                  type={showNew ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full p-4 pr-12 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 text-sm transition-all" 
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] text-rose-600 font-bold uppercase text-center leading-tight">
                  {passwordError}
                </p>
              </div>
            )}

            <button disabled={isUpdating} type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
              {isUpdating ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )}
    </div>
  );
};

export default Profile;