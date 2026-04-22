//lecturer attendance
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Download, Search, CheckCircle2, ShieldCheck, QrCode, LogOut,
  User, Users, FileSpreadsheet, Loader2, UserMinus, UserPlus 
} from 'lucide-react';

const LecturerReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceData, setAttendanceData] = useState([]); // Students who scanned
  const [expectedStudents, setExpectedStudents] = useState([]); // Master roster
  const [sessionActive, setSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const formatName = (f, l) => {
    if (!f || !l) return "Unknown Student";
    return `${f.charAt(0).toUpperCase()}${f.slice(1).toLowerCase()} ${l.charAt(0).toUpperCase()}${l.slice(1).toLowerCase()}`;
  };

  // 1. FETCH THE MASTER ROSTER (Runs Once)
  useEffect(() => {
    const fetchMasterRoster = async () => {
      const activeSessionString = localStorage.getItem('activeSession');
      const lastSessionString = localStorage.getItem('lastSession');
      const targetSession = activeSessionString ? JSON.parse(activeSessionString) : (lastSessionString ? JSON.parse(lastSessionString) : null);

      if (targetSession) {
        try {
          const course = targetSession.unit.course;
          const semester = targetSession.unit.semester;
          
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/expected-students/${course}/${semester}`);
          const data = await response.json();
          if (Array.isArray(data)) setExpectedStudents(data);
        } catch (err) {
          console.error("Master roster fetch failed:", err);
        }
      }
    };
    fetchMasterRoster();
  }, []);

  // 2. REAL-TIME ATTENDANCE POLLING
  useEffect(() => {
    let pollInterval;

    const fetchRealTimeData = async () => {
      try {
        const activeSessionString = localStorage.getItem('activeSession');
        const lastSessionString = localStorage.getItem('lastSession');
        let targetSession = activeSessionString ? JSON.parse(activeSessionString) : (lastSessionString ? JSON.parse(lastSessionString) : null);

        if (!targetSession) {
          setSessionActive(false);
          setIsLoading(false);
          return;
        }

        setSessionActive(true);
        setIsLive(!!activeSessionString); 

        const code = targetSession.unit.unitCode || targetSession.unit.code;
        const sessionId = targetSession.sessionId;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/lecturer/attendance/${code}/${sessionId}`);
        const data = await response.json();

        if (Array.isArray(data)) {
          setAttendanceData(data);
        }
        setIsLoading(false);

        if (!activeSessionString && pollInterval) clearInterval(pollInterval);
      } catch (err) {
        console.error("Attendance polling failed:", err);
        setIsLoading(false);
      }
    };

    fetchRealTimeData();
    pollInterval = setInterval(fetchRealTimeData, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleDownload = () => {
    if (combinedList.length === 0) {
      alert("No data available to download.");
      return;
    }

    // 1. Setup the CSV Headers
    const headers = ["Registration Number,Name,Status,Time Scanned"];

    // 2. Map the UI data into CSV rows
    const csvData = combinedList.map(student => {
      const status = student.isPresent ? "Present" : "Absent";
      const time = student.time || "N/A";
      return `"${student.regNo}","${student.name}","${status}","${time}"`;
    });

    // 3. Combine headers and rows into one file string
    const csvString = [headers, ...csvData].join("\n");

    // 4. Create a Blob (The actual file)
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    // 5. Generate a smart filename based on the current session
    const activeSessionString = localStorage.getItem('activeSession');
    const lastSessionString = localStorage.getItem('lastSession');
    const targetSession = activeSessionString ? JSON.parse(activeSessionString) : (lastSessionString ? JSON.parse(lastSessionString) : null);
    
    const unitCode = targetSession ? (targetSession.unit.unitCode || targetSession.unit.code) : "Class";
    const date = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const fileName = `${unitCode}_Attendance_${date}.csv`;

    // 6. Trigger the invisible download link
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleToggleAttendance = async (studentId, isCurrentlyPresent) => {
    const activeSessionString = localStorage.getItem('activeSession');
    const lastSessionString = localStorage.getItem('lastSession');
    const targetSession = activeSessionString ? JSON.parse(activeSessionString) : (lastSessionString ? JSON.parse(lastSessionString) : null);

    if (!targetSession) return;

    const action = isCurrentlyPresent ? 'mark_absent' : 'mark_present';
    const payload = {
        studentId,
        sessionId: targetSession.sessionId,
        unitCode: targetSession.unit.unitCode || targetSession.unit.code,
        unitName: targetSession.unit.unitName || targetSession.unit.name,
        unitId: targetSession.unit._id || targetSession.unit.id,
        action
    };

    try {
        // 1. Send the manual toggle to the database
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/lecturer/attendance/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 2. THE FIX: Force the UI to fetch the updated data immediately
        // This ensures the button works even after the session ends!
        const code = targetSession.unit.unitCode || targetSession.unit.code;
        const sessionId = targetSession.sessionId;
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/lecturer/attendance/${code}/${sessionId}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            setAttendanceData(data); // Instantly updates the screen
        }

    } catch (err) {
        console.error("Toggle failed", err);
    }
  };

  // 3. THE MASTER MERGE LOGIC
  const combinedList = expectedStudents.map(student => {
    const attendanceRecord = attendanceData.find(record => record.student?._id === student._id);
    return {
      id: student._id,
      name: formatName(student.firstName, student.lastName),
      regNo: student.regNo,
      isPresent: !!attendanceRecord,
      time: attendanceRecord ? new Date(attendanceRecord.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    };
  }).sort((a, b) => b.isPresent - a.isPresent); // Sort Present to the top

  const filteredData = combinedList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = combinedList.filter(s => s.isPresent).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex justify-between items-center mb-10">
        <button onClick={() => navigate('/lecturer-dashboard')} className="p-3 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 active:scale-95 transition-all shadow-xl hover:bg-white/10">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-black uppercase tracking-widest text-white">Live Roster</h1>
        <button onClick={handleDownload} className="p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-95 hover:bg-blue-500">
          <Download size={24} />
        </button>
      </div>


      {/* STATS TABS (Horizontal Word: Number) */}
      <div className="relative z-10 flex gap-4 mb-8">
        <div className="flex-1 py-4 px-6 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-3xl flex items-center justify-between shadow-lg">
          <span className="text-[15px] font-black uppercase tracking-widest text-blue-300">Enrolled:</span>
          <span className="text-2xl font-black">{expectedStudents.length}</span>
        </div>
        
        <div className="flex-1 py-4 px-6 bg-white/10 border border-emerald-500/30 rounded-2xl backdrop-blur-3xl flex items-center justify-between shadow-lg shadow-emerald-500/5">
          <span className="text-[15px] font-black uppercase tracking-widest text-emerald-400">Present:</span>
          <span className="text-2xl font-black text-emerald-400">{presentCount}</span>
        </div>
        
        <div className="flex-1 py-4 px-6 bg-white/10 border border-rose-500/30 rounded-2xl backdrop-blur-3xl flex items-center justify-between shadow-lg shadow-rose-500/5">
          <span className="text-[15px] font-black uppercase tracking-widest text-rose-400">Absent:</span>
          <span className="text-2xl font-black text-rose-400">{expectedStudents.length - presentCount}</span>
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

      {/* LIVE LIST: VERTICAL COLUMNS LAYOUT */}
      <div className="relative z-10 flex-1 flex flex-col space-y-2.5 overflow-y-auto pr-1 pb-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 size={40} className="text-blue-400 animate-spin mb-4" /></div>
        ) : !sessionActive ? (
          <div className="text-center py-20 bg-white/5 rounded-[28px] border border-white/10 p-10">
            <FileSpreadsheet size={40} className="text-rose-400 mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest">No Active Session</p>
          </div>
        ) : filteredData.map((student) => (
          <div key={student.id} className={`flex items-stretch rounded-2xl border mb-3 h-[68px] overflow-hidden transition-all ${
              student.isPresent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="w-[180px] shrink-0 flex items-center justify-center bg-black/40">
              <span className="text-[15px] font-bold text-white font-mono uppercase">{student.regNo}</span>
            </div>

            <div className="w-px bg-white/10" /><div className="w-6" />

            <div className="flex-1 flex items-center pr-6 justify-between overflow-hidden">
              <span className="text-sm font-medium text-white/80 uppercase truncate">{student.name}</span>
              <div className="flex flex-col items-end shrink-0">
                {student.isPresent ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <p className="text-[10px] font-bold text-emerald-400/60 mt-0.5">{student.time || "MANUAL"}</p>
                  </>
                ) : (
                  <span className="text-[11px] font-bold uppercase text-white/20 tracking-[0.2em]">Absent</span>
                )}
              </div>
            </div>

            <div className="w-px bg-white/10" />

            <div className="w-20 shrink-0 flex items-center justify-center bg-black/20">
               <button 
                 onClick={() => handleToggleAttendance(student.id, student.isPresent)} 
                 className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all ${
                   student.isPresent ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                 }`}
               >
                 {student.isPresent ? <UserMinus size={18} /> : <UserPlus size={18} />}
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LecturerReports;