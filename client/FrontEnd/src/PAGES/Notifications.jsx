import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  BellRing,
  MailCheck
} from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Unread');

  const [notifications, setNotifications] = useState([
    {
      id: 1, 
      title: 'Attendance Verified',
      message: 'Your presence in Network Security has been successfully logged.',
      time: '10:45 AM',
      icon: <CheckCircle2 size={20} />,
      iconBg: 'bg-emerald-500',
      status: 'read'
    },
    {
      id: 2,
      title: 'Low Attendance Alert',
      message: 'Your attendance for Network Security is currently 72%. Maintain 75% for exams.',
      time: '09:12 AM',
      icon: <AlertTriangle size={20} />,
      iconBg: 'bg-rose-500',
      status: 'unread'
    },
  ]);

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, status: 'read' }));
    setNotifications(updated);
  };

  const filteredNotifications = notifications.filter(n => 
    activeTab === 'All' || n.status === 'unread'
  );

  const mainCardStyles = "bg-white/50 backdrop-blur-xl rounded-[28px] border border-white/40 shadow-sm p-5 mb-4 transition-all active:scale-[0.98]";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#93C5FD] via-[#C7D2FE] to-[#D8B4FE] flex flex-col font-sans overflow-hidden p-5 text-left">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-center mb-6 pt-1">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-2.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 text-indigo-950 active:scale-95 shadow-sm"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Alerts</h1>
        
        <button 
          onClick={handleMarkAllRead}
          className="p-2.5 text-indigo-800 active:scale-90 transition-all"
        >
          <MailCheck size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* 2. TAB SWITCHER */}
      <div className="bg-white/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/40 flex mb-8">
        {['Unread', 'All'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-900/50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. LIST */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((alert) => (
            <div key={alert.id} className={`${mainCardStyles} ${alert.status === 'unread' ? 'border-l-4 border-l-indigo-500' : ''}`}>
              <div className="flex gap-4">
                <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-md ${alert.iconBg}`}>
                  {alert.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-slate-900 text-sm tracking-tight">{alert.title}</h3>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{alert.time}</span>
                  </div>
                  {/* REMOVED ITALIC - NOW NORMAL FONT */}
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center mt-20 text-center animate-in fade-in zoom-in duration-700">
            <div className="bg-white/20 p-6 rounded-full mb-4">
              <BellRing size={48} className="text-indigo-900/30" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-indigo-950/80 uppercase tracking-tighter">No new alerts</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/40 mt-1">
              You're all caught up
            </p>
          </div>
        )}
      </div>

      <div className="h-20"></div>
    </div>
  );
};

export default Notifications;