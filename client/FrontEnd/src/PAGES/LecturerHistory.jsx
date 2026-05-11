//lecturer history reports
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Download, Search, BookOpen, Loader2, 
  ChevronDown, GraduationCap, BookOpenText, CalendarDays,
  History as HistoryIcon 
} from 'lucide-react';
import { getAllUnits } from '../services/api';
import API from '../services/api';

const LecturerHistory = () => {
  const navigate = useNavigate();
  
  const [units, setUnits] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);

  const [selectedSemester, setSelectedSemester] = useState("Year 4, Sem 1");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);

  const semesterList = ["Year 4, Sem 1", "Year 4, Sem 2"];

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await getAllUnits();
        setUnits(res.data);
      } catch (err) { console.error("Failed to load units", err); }
    };
    fetchUnits();
  }, []);

  useEffect(() => {
    if (!selectedUnit) return;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
       const response = await API.get(`/api/auth/lecturer/unit-history/${selectedUnit.code}`);
      const data = response.data;
        
        if (data.students) setHistoryData(data.students);
        
        // PERFECT SYNC: Store the exact headers the backend sends
        window.sessionHeaders = data.sessionHeaders || []; 
      } catch (err) { 
        console.error("History fetch failed:", err); 
      } finally { 
        setIsLoading(false); 
      }
    };
    fetchHistory();
  }, [selectedUnit]);

  const uniqueCourses = [...new Set(units.filter(u => u.semester === selectedSemester).map(u => u.course))];
  const availableUnits = units.filter(u => u.semester === selectedSemester && u.course === selectedCourse);
  const filteredStudents = historyData.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = () => {
    if (historyData.length === 0) return alert("No data!");

    // PERFECT SYNC: Pull the exact headers we saved
    const sessionDates = window.sessionHeaders || [];
    
    // Headers: RegNo, Name, ["Session 1 - 23 Apr (Thu)"], Final %
    const headers = [
      '"Registration Number"', 
      '"Name"', 
      ...sessionDates.map(date => `"${date}"`), 
      '"Attendance Percentage"'
    ];

    const csvRows = historyData.map(student => {
      return [
        `"${student.regNo}"`,
        `"${student.name}"`,
        ...(student.matrix || []).map(status => `"${status}"`),
        `"${student.percentage}%"`
      ].join(",");
    });

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Attendance_Report_${selectedUnit.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const labelStyles = "text-sm font-black text-white uppercase tracking-widest ml-4 mb-2 block";
  const inputBaseStyles = "w-full p-4 pl-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 outline-none text-white font-bold cursor-pointer flex items-center justify-between transition-all hover:bg-white/15 shadow-sm";
  const dropdownMenuStyles = "absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200";
  const optionStyles = "p-4 hover:bg-blue-600 text-white font-medium cursor-pointer transition-colors border-b border-white/5 last:border-0 text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center mb-10">
        <button onClick={() => navigate('/lecturer-dashboard')} className="p-3 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 active:scale-95 shadow-xl">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-black uppercase tracking-widest text-white italic">Attendance History</h1>
        <button onClick={handleDownload} className="p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-95">
          <Download size={24} />
        </button>
      </div>

      {/* DROPDOWN SECTION */}
      <div className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="space-y-1.5 relative">
          <label className={labelStyles}>Academic Period</label>
          <div onClick={() => setIsSemesterOpen(!isSemesterOpen)} className={inputBaseStyles}>
            <CalendarDays className="absolute left-4 text-blue-400" size={20} />
            <span className="text-sm">Year 4 - {selectedSemester.split(', ')[1]}</span>
            <ChevronDown className={`text-white/40 transition-transform ${isSemesterOpen ? 'rotate-180' : ''}`} size={18} />
          </div>
          {isSemesterOpen && (
            <div className={dropdownMenuStyles}>
              {semesterList.map((sem) => (
                <div key={sem} className={optionStyles} onClick={() => {
                  setSelectedSemester(sem); setSelectedCourse(""); setSelectedUnit(null); setHistoryData([]); setIsSemesterOpen(false);
                }}>{sem}</div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 relative">
          <label className={labelStyles}>Select Course</label>
          <div onClick={() => setIsCourseOpen(!isCourseOpen)} className={inputBaseStyles}>
            <GraduationCap className="absolute left-4 text-blue-400" size={20} />
            <span className={selectedCourse ? "text-white text-sm" : "text-white/40 text-sm"}>{selectedCourse || "Choose Course"}</span>
            <ChevronDown className={`text-white/40 transition-transform ${isCourseOpen ? 'rotate-180' : ''}`} size={18} />
          </div>
          {isCourseOpen && (
            <div className={dropdownMenuStyles}>
              {uniqueCourses.map((course) => (
                <div key={course} className={optionStyles} onClick={() => {
                  setSelectedCourse(course); setSelectedUnit(null); setHistoryData([]); setIsCourseOpen(false);
                }}>{course}</div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 relative">
          <label className={labelStyles}>Select Unit</label>
          <div onClick={() => selectedCourse && setIsUnitOpen(!isUnitOpen)} className={`${inputBaseStyles} ${!selectedCourse ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <BookOpenText className="absolute left-4 text-emerald-400" size={20} />
            <span className={selectedUnit ? "text-white text-sm" : "text-white/40 text-sm"}>{selectedUnit ? `${selectedUnit.code}` : "Choose Unit"}</span>
            <ChevronDown className={`text-white/40 transition-transform ${isUnitOpen ? 'rotate-180' : ''}`} size={18} />
          </div>
          {isUnitOpen && selectedCourse && (
            <div className={dropdownMenuStyles}>
              {availableUnits.map((u) => (
                <div key={u._id} className={optionStyles} onClick={() => { setSelectedUnit(u); setIsUnitOpen(false); }}>
                  <div className="font-bold">{u.code}</div>
                  <div className="text-[10px] opacity-60 uppercase">{u.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative z-10 mb-6 h-14">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 z-10 pointer-events-none" size={20} />
        <input 
          type="text" 
          placeholder="Search student or ID..." 
          className="w-full h-full bg-white/5 border border-white/10 backdrop-blur-3xl rounded-2xl pl-14 pr-4 text-sm font-bold text-white outline-none focus:border-blue-400 transition-all relative z-0"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {selectedUnit && !isLoading && (
        <div className="relative z-10 mb-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md shadow-sm">
          <div>
             <h2 className="text-lg font-black text-white uppercase tracking-widest drop-shadow-sm">
               {selectedUnit.name || selectedUnit.unitName}
             </h2>
             <p className="text-blue-400 font-mono text-sm font-bold mt-1">
               {selectedUnit.code || selectedUnit.unitCode}
             </p>
          </div>
          <div className="px-3 py-1.5 bg-blue-500/20 text-blue-300 text-[10px] font-black rounded-lg uppercase tracking-widest border border-blue-500/20">
             {filteredStudents.length} Records
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col space-y-3 overflow-y-auto pr-1 pb-10">
        {!selectedUnit ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[40px] border border-white/10">
            <HistoryIcon size={40} className="text-white/10 mb-4" />
            <p className="font-black uppercase tracking-widest text-white/20 text-xs text-center">Select Academic Criteria <br/> to fetch records</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 size={40} className="text-blue-400 animate-spin" /></div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="flex items-stretch rounded-2xl border border-white/10 bg-white/5 h-[68px] mb-3 overflow-hidden hover:bg-white/10 transition-all">
              <div className="w-[180px] shrink-0 flex items-center justify-center bg-black/40">
                <span className="text-[15px] font-bold tracking-tight text-white font-mono uppercase">{student.regNo}</span>
              </div>
              <div className="w-px bg-white/10" />
              <div className="w-6 bg-transparent" />
              <div className="flex-1 flex items-center pr-6 overflow-hidden">
                <span className="text-sm font-medium text-white/80 uppercase truncate">{student.name}</span>
              </div>
              <div className="w-px bg-white/10" />
              <div className="w-28 shrink-0 flex items-center justify-center bg-blue-500/5">
                <p className="text-xl font-bold text-white">{student.percentage}%</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LecturerHistory;