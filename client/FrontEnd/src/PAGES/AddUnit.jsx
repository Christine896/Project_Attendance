import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addUnit } from '../services/api';
import { ChevronLeft, Calendar, Save, GraduationCap, BookOpenText, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';

const AddUnit = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const semesterList = ["Year 4, Sem 1", "Year 4, Sem 2"];
  const [errorMsg, setErrorMsg] = useState("");

  const schoolData = {
    "School of Computing": ["BSc. Software Engineering", "BSc. Computer Science", "BSc. Information Technology"],
    "School of Engineering": ["BSc. Civil Engineering", "BSc. Mechanical Engineering", "BSc. Electrical Engineering"],
    "School of Business": ["B.Commerce", "BSc. Economics", "BSc. Business Administration"]
  };

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    school: '',
    course: '',
    semester: '',
    day: 'Monday',
    startTime: '',
    endTime: ''
  });

  const handleTimeChange = (e, field) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length >= 3) {
      val = val.slice(0, 2) + ':' + val.slice(2, 4);
    }
    setFormData({ ...formData, [field]: val.slice(0, 5) });
  };

  const handleCodeChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 3) {
      val = val.slice(0, 3) + ' ' + val.slice(3, 6);
    }
    setFormData({ ...formData, code: val.slice(0, 7) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); // Clear any previous errors when they click submit
    
    // 1. REGEX & TIME VALIDATIONS
    if (!/^[A-Z]{3} \d{3}$/.test(formData.code)) {
      setErrorMsg("Error: Unit Code must use format AAA 000 (e.g. SCT 123)"); return;
    }
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.startTime) || !timeRegex.test(formData.endTime)) {
      setErrorMsg("Error: Enter time as HH:MM (e.g. 08:00)"); return;
    }
    if (formData.startTime < "07:00" || formData.startTime > "19:00" || 
        formData.endTime < "07:00" || formData.endTime > "19:00") {
      setErrorMsg("Error: Classes must be between 07:00 and 19:00"); return;
    }

    try {
      setIsLoading(true);
      const payload = {
        ...formData,
        lecturerId: user._id,
        schedule: [{ day: formData.day, startTime: formData.startTime, endTime: formData.endTime }]
      };
      
      // 2. API CALL
      await addUnit(payload);
      
      // 3. TRIGGER SUCCESS UI
      setIsLoading(false);
      setIsSuccess(true);
      
      // 4. WAIT 2 SECONDS THEN RESET FORM
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          name: '', code: '', school: '', course: '', semester: '', day: 'Monday', startTime: '', endTime: ''
        });
      }, 2000);

    } catch (err) {
      setIsLoading(false);
      // Catches the specific error from the backend, or shows a default message
      setErrorMsg(err.response?.data?.message || "Error adding unit. Please try again.");
    }
  };

  const labelStyles = "text-[11px] font-black text-blue-400 uppercase tracking-widest ml-4 mb-2 block";
  const inputBaseStyles = "w-full p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 outline-none text-white font-medium focus:border-blue-500/50 transition-all cursor-pointer flex items-center justify-between shadow-lg";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans p-6 relative overflow-hidden">
      {isSuccess ? (
        /* MINTY SUCCESS SCREEN (Centered Perfectly) */
        <div className="flex-1 flex flex-col items-center justify-center text-center z-50">
          <div className="mb-6">
            <CheckCircle2 size={100} className="text-teal-400 opacity-80" strokeWidth={1.2} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase italic">
            <span className="text-white drop-shadow-md">unit added successfully</span>
          </h1>
        </div>
      ) : (
        /* 2. FORM VIEW WITH HEADER */
        <>
          {/* HEADER IS NOW INSIDE THIS BLOCK ONLY */}
          <div className="absolute top-0 left-0 w-full flex justify-between items-center px-8 py-6 backdrop-blur-xl bg-white/5 border-b border-white/10 z-20">
            <button 
              onClick={() => navigate('/lecturer-dashboard')} 
              className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-[0.2em]">Add Unit </h1>
            <div className="w-10" />
          </div>

          <div className="relative z-10 w-full flex items-center justify-center p-6 pt-24 overflow-y-auto">
            <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6 my-8">
              <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-5">
                
                {/* School Input */}
                <div className="relative">
                  <label className={labelStyles}>School</label>
                  <div onClick={() => setIsSchoolOpen(!isSchoolOpen)} className={inputBaseStyles + " pl-12 relative"}>
                    <GraduationCap className="absolute left-4 text-blue-400" size={20} />
                    <span>{formData.school || "Select School"}</span>
                    <ChevronDown size={18} className="text-slate-500" />
                  </div>
                  {isSchoolOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                      {Object.keys(schoolData).map(s => (
                        <div key={s} onClick={() => { setFormData({...formData, school: s, course: ''}); setIsSchoolOpen(false); }} className="p-4 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-0">{s}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Course Input */}
                <div className="relative">
                  <label className={labelStyles}>Course</label>
                  <div onClick={() => formData.school && setIsCourseOpen(!isCourseOpen)} className={`${inputBaseStyles} pl-12 relative ${!formData.school ? 'opacity-30' : ''}`}>
                    <BookOpenText className="absolute left-4 text-blue-400" size={20} />
                    <span>{formData.course || "Select Course"}</span>
                    <ChevronDown size={18} className="text-slate-500" />
                  </div>
                  {isCourseOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                      {schoolData[formData.school].map(c => (
                        <div key={c} onClick={() => { setFormData({...formData, course: c}); setIsCourseOpen(false); }} className="p-4 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-0">{c}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Semester Input */}
                <div className="relative mt-5">
                  <label className={labelStyles}>Semester</label>
                  <div onClick={() => setIsSemesterOpen(!isSemesterOpen)} className={`${inputBaseStyles} px-6 relative`}>
                    <span>{formData.semester || "Select Semester"}</span>
                    <ChevronDown size={18} className={`text-slate-500 transition-transform ${isSemesterOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isSemesterOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                      {semesterList.map(sem => (
                        <div 
                          key={sem} 
                          onClick={() => { setFormData({...formData, semester: sem}); setIsSemesterOpen(false); }} 
                          className="p-4 hover:bg-blue-600/20 text-slate-300 font-medium cursor-pointer border-b border-white/5 last:border-0"
                        >
                          {sem}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unit Name & Code */}
                <div>
                  <label className={labelStyles}>Unit Name</label>
                  <input type="text" required placeholder="e.g. Advanced Java" className="w-full p-4 px-6 bg-black/40 rounded-2xl border border-white/10 outline-none text-white text-sm" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>

                <div>
                  <label className={labelStyles}>Unit Code</label>
                  <input type="text" required placeholder="SCT 123" value={formData.code} className="w-full p-4 px-6 bg-black/40 rounded-2xl border border-white/10 outline-none text-white text-sm font-mono tracking-widest uppercase" onChange={handleCodeChange} />
                </div>

                {/* Day Selector */}
                <div className="relative">
                  <label className={labelStyles}>Lecture Day</label>
                  <div onClick={() => setIsDayOpen(!isDayOpen)} className={inputBaseStyles + " px-6"}>
                    <span className="text-white text-sm">{formData.day}</span>
                    <ChevronDown size={18} className={`text-slate-500 transition-transform ${isDayOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isDayOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                      {daysList.map(d => ( 
                        <div key={d} onClick={() => { setFormData({...formData, day: d}); setIsDayOpen(false); }} className="p-4 hover:bg-blue-600/20 text-slate-300 font-medium cursor-pointer border-b border-white/5 last:border-0">{d}</div> 
                      ))}
                    </div>
                  )}
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelStyles}>Start Time</label>
                    <input type="text" required value={formData.startTime} placeholder="08:00" className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-white text-sm font-mono" onChange={(e) => handleTimeChange(e, 'startTime')} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelStyles}>End Time</label>
                    <input type="text" required value={formData.endTime} placeholder="10:00" className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-white text-sm font-mono" onChange={(e) => handleTimeChange(e, 'endTime')} />
                  </div>
                </div>

              </div>
             {/* BEAUTIFUL ERROR DISPLAY */}
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 shadow-lg">
                  <p className="text-rose-400 text-xs font-bold uppercase tracking-widest text-center leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              )}
              
              {/* Save Button */}
              <button type="submit" disabled={isLoading} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl shadow-xl transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} />Save Unit</>}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AddUnit;