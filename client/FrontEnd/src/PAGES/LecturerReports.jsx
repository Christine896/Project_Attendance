import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Download, 
  Search, 
  CheckCircle2, 
  User, 
  Users, 
  FileSpreadsheet 
} from 'lucide-react';

const LecturerReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Mock Data with Names in Sentence Case and exact RegNo format
  const [attendanceData] = useState([
    { id: 1, name: "Brian Omondi", regNo: "SIT211-1245/2022", time: "10:05 AM" },
    { id: 2, name: "Cynthia Wanjiku", regNo: "COM110-3421/2022", time: "10:07 AM" },
    { id: 3, name: "Kevin Mutua", regNo: "BIT202-0982/2022", time: "10:12 AM" },
    { id: 4, name: "Anita Kerubo", regNo: "SIT211-4456/2022", time: "10:14 AM" },
  ]);

  const handleDownload = () => {
    console.log("Downloading CSV via API...");
    alert("CSV download initiated! (Backend integration placeholder)");
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
          className="p-3 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 text-white active:scale-95 transition-all shadow-xl"
        >
          <ChevronLeft size={24} />
        </button>
        
        <h1 className="text-3xl font-black uppercase tracking-widest text-white">
          Class List
        </h1>

        <button 
          onClick={handleDownload}
          className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Download size={24} />
        </button>
      </div>

      {/* 2. TOP TWO TABS (REDUCED HEIGHT & INCREASED TEXT) */}
      <div className="relative z-10 flex gap-4 mb-10 w-full h-20">
        {/* Tab 1: Students Present - Left Aligned & Large Text */}
        <div className="w-1/2 bg-white/10 border border-white/20 px-6 rounded-[28px] backdrop-blur-3xl flex items-center justify-start gap-4 shadow-2xl">
          <Users className="text-blue-400 shrink-0" size={28} /> 
          <p className="text-[18px] font-black text-white whitespace-nowrap tracking-tight">
            Present: <span className="text-blue-300 ml-1">{attendanceData.length}</span>
          </p>
        </div>

        {/* Tab 2: Search with Icon at Left & Large Text */}
        <div className="relative w-1/2">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70" size={24} />
          <input 
            type="text" 
            placeholder="Search for student..." 
            className="w-full h-full bg-white/10 border border-white/20 backdrop-blur-3xl rounded-[28px] pl-16 pr-4 text-[18px] font-bold text-white placeholder:text-white/40 outline-none focus:border-blue-400 transition-all shadow-2xl"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. LIST AREA (Sentence Case Names) */}
      <div className="relative z-10 flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
        {filteredData.length > 0 ? (
          filteredData.map((student) => (
            <div 
              key={student.id} 
              className="flex items-center justify-between p-5 bg-white/10 backdrop-blur-[24px] rounded-[28px] border border-white/20 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-300 border border-white/10">
                  <User size={20} />
                </div>
                <div>
                  {/* Name in Sentence Case (e.g., Brian Omondi) */}
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
            <p className="text-xs font-black uppercase tracking-widest text-white/20">No results</p>
          </div>
        )}
      </div>

      <div className="h-4"></div>
    </div>
  );
};

export default LecturerReports;