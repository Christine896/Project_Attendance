import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Download, Search, CheckCircle2, 
  User, Users, FileSpreadsheet, Loader2 
} from 'lucide-react';

const LecturerReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // REAL-TIME DATA POLLING
  const [isLive, setIsLive] = useState(false); // NEW: Tracks if we should pulse the UI

  // REAL-TIME DATA POLLING
  useEffect(() => {
    let pollInterval;

    const fetchRealTimeData = async () => {
      try {
        const activeSessionString = localStorage.getItem('activeSession');
        const lastSessionString = localStorage.getItem('lastSession');
        
        let targetSession = null;
        let currentlyActive = false;

        // 1. Decide which session to show
        if (activeSessionString) {
          targetSession = JSON.parse(activeSessionString);
          currentlyActive = true;
        } else if (lastSessionString) {
          targetSession = JSON.parse(lastSessionString);
          currentlyActive = false; // The session ended, but we still have the data!
        }

        if (!targetSession) {
          setSessionActive(false);
          setIsLoading(false);
          return;
        }

        setSessionActive(true);
        setIsLive(currentlyActive); 

        const code = targetSession.unit.unitCode || targetSession.unit.code;
        const sessionId = targetSession.sessionId;

        // 2. Fetch the data
        const response = await fetch(`http://localhost:5000/api/auth/lecturer/attendance/${code}/${sessionId}`);
        const data = await response.json();

        if (Array.isArray(data)) {
          const formattedData = data.map(record => ({
            id: record._id,
            name: record.student?.fullName || "Unknown Student",
            regNo: record.student?.regNo || "N/A",
            time: new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          
          setAttendanceData(formattedData);
        }
        setIsLoading(false);

        // 3. If the session ended, stop asking the database every 3 seconds
        if (!currentlyActive && pollInterval) {
          clearInterval(pollInterval);
        }

      } catch (err) {
        console.error("Failed to fetch class list:", err);
        setIsLoading(false);
      }
    };

    fetchRealTimeData();
    pollInterval = setInterval(fetchRealTimeData, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleDownload = () => {
    alert("CSV download placeholder - To be implemented in Phase 5!");
  };

  const filteredData = attendanceData.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2563EB] via-[#111827] to-[#020617] text-white flex flex-col font-sans p-6 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* 1. HEADER */}
      <div className="relative z-10 flex justify-between items-center mb-10">
        <button 
          onClick={() => navigate('/lecturer-dashboard')} 
          className="p-3 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 text-white active:scale-95 transition-all shadow-xl hover:bg-white/10"
        >
          <ChevronLeft size={24} />
        </button>
        
        <h1 className="text-3xl font-black uppercase tracking-widest text-white">
          Class List
        </h1>

        <button 
          onClick={handleDownload}
          className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-500"
        >
          <Download size={24} />
        </button>
      </div>

      {/* 2. TOP TWO TABS */}
      <div className="relative z-10 flex flex-col md:flex-row gap-4 mb-10 w-full md:h-20">
        <div className="w-full md:w-1/2 h-20 bg-white/10 border border-white/20 px-6 rounded-[28px] backdrop-blur-3xl flex items-center justify-start gap-4 shadow-2xl">
          <Users className="text-blue-400 shrink-0" size={28} /> 
          <p className="text-[18px] font-black text-white whitespace-nowrap tracking-tight">
            Present: <span className="text-blue-300 ml-1">{attendanceData.length}</span>
          </p>
        </div>

        <div className="relative w-full md:w-1/2 h-20">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70" size={24} />
          <input 
            type="text" 
            placeholder="Search for student..." 
            className="w-full h-full bg-white/10 border border-white/20 backdrop-blur-3xl rounded-[28px] pl-16 pr-4 text-[18px] font-bold text-white placeholder:text-white/40 outline-none focus:border-blue-400 transition-all shadow-2xl"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. LIST AREA */}
      <div className="relative z-10 flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-white/50">Syncing live data...</p>
          </div>
        ) : !sessionActive ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-[28px] border border-white/10 p-10">
            <FileSpreadsheet size={40} className="text-rose-400 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-white">No Active Session</p>
            <p className="text-xs text-white/40 mt-2">Generate a QR code first to see live attendance.</p>
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((student) => (
            <div 
              key={student.id} 
              className="flex items-center justify-between p-5 bg-white/10 backdrop-blur-[24px] rounded-[28px] border border-white/20 shadow-xl animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-300 border border-white/10">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-white tracking-tight leading-tight">
                    {student.name}
                  </p>
                  <p className="text-[13px] text-blue-200/60 font-medium uppercase tracking-widest mt-0.5">
                    {student.regNo}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <CheckCircle2 size={18} className="text-emerald-400" strokeWidth={2.5} />
                <p className="text-[10px] text-white/30 font-bold uppercase">{student.time}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileSpreadsheet size={40} className="text-white/10 mb-2" />
            <p className="text-xs font-black uppercase tracking-widest text-white/20">No students scanned yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerReports;