import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
  SearchX
} from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState('All'); 

  // Simulation: Replace with your actual database fetch later
  const [logs, setLogs] = useState([
    { id: 1, code: 'SIT 301', name: 'Network Security', date: '2026-03-10T10:00:00', status: 'Present' },
    { id: 2, code: 'SIT 305', name: 'Distributed Systems', date: '2026-03-08T14:30:00', status: 'Present' },
    { id: 3, code: 'SMA 302', name: 'Principles of Management', date: '2026-02-28T08:00:00', status: 'Absent' },
    { id: 4, code: 'SIT 310', name: 'Knowledge-Based Systems', date: '2026-03-01T11:00:00', status: 'Present' },
  ]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const logDate = new Date(log.date);
    const now = new Date();
    const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);

    if (filter === 'Weekly') return matchesSearch && diffDays <= 7;
    if (filter === 'Monthly') return matchesSearch && diffDays <= 30;
    return matchesSearch;
  });

  const cardStyles = "bg-white/40 backdrop-blur-2xl rounded-[28px] border border-white/30 p-5 mb-4 shadow-lg shadow-indigo-500/5 transition-all active:scale-[0.98]";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#93C5FD] via-[#C7D2FE] to-[#D8B4FE] flex flex-col font-sans overflow-hidden p-5">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-center mb-8 pt-1">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-2.5 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 text-indigo-950 active:scale-95 transition-all shadow-sm"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Attendance History</h1>
        <div className="w-11"></div>
      </div>

      {/* 2. SEARCH BAR */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl -m-[1px] opacity-40" /> 
        <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl py-3.5 pl-12 pr-4 flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-900/40" size={18} />
            <input 
              type="text" 
              placeholder="Search units..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-indigo-950 placeholder:text-indigo-900/30 focus:outline-none"
            />
        </div>
      </div>

      {/* 3. FILTER TABS */}
      <div className="bg-white/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/40 flex mb-8">
        {['All', 'Weekly', 'Monthly'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === tab ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-900/40'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. LOGS LIST / EMPTY STATES */}
      <div className="flex-1 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          /* CASE 1: NO RECORDS AT ALL IN DATABASE */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-700">
            <div className="bg-white/20 p-6 rounded-full mb-4 backdrop-blur-lg">
              <ClipboardList size={48} className="text-indigo-900/40" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-indigo-950">No logs yet</h3>
            <p className="text-xs font-semibold text-indigo-900/50 mt-1 max-w-[180px]">
              Your history will appear here once you scan a class QR code.
            </p>
          </div>
        ) : filteredLogs.length > 0 ? (
          /* CASE 2: LOGS EXIST AND MATCH FILTER/SEARCH */
          filteredLogs.map((log) => (
            <div key={log.id} className={cardStyles}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-indigo-900/50 font-black uppercase tracking-widest mb-0.5">{log.code}</p>
                  <h3 className="text-slate-900 font-black text-sm tracking-tight leading-tight">{log.name}</h3>
                </div>
                <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase tracking-tighter ${log.status === 'Present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {log.status === 'Present' ? <CheckCircle2 size={13} strokeWidth={3} /> : <XCircle size={13} strokeWidth={3} />}
                  <span>{log.status}</span>
                </div>
              </div>

              <div className="flex items-center gap-5 text-slate-500 border-t border-white/10 pt-3">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-700/60" />
                  <span className="text-[11px] font-bold text-indigo-950/70">{new Date(log.date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-700/60" />
                  <span className="text-[11px] font-bold text-indigo-950/70">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* CASE 3: LOGS EXIST BUT DON'T MATCH SEARCH/FILTER */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
            <SearchX size={40} className="text-indigo-900/20 mb-3" />
            <p className="text-xs font-black uppercase tracking-widest text-indigo-900/40">No matching results</p>
          </div>
        )}
      </div>

      <div className="h-10"></div>
    </div>
  );
};

export default History;