import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeScannerComponent from "react-qr-barcode-scanner"; 
import { ChevronLeft, ShieldCheck, VideoOff, Loader2, XCircle } from 'lucide-react';
import SuccessOverlay from '../components/SuccessOverlay';
import { logAttendance } from '../services/api'; 

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

const Scanner = () => {
  const navigate = useNavigate();
  const [stopStream, setStopStream] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [scanStatus, setScanStatus] = useState("success"); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // <--- ADDED to catch "Too Far" messages

  const [overlayInfo, setOverlayInfo] = useState({ name: "", code: "" });

  //alert("Raw QR text: "+ result.text);
  const handleScan = async (err, result) => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (result?.text && !stopStream && !isProcessing) {
    setIsProcessing(true);

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const rawText = result.text.trim();
        const data = JSON.parse(rawText);
        
        // 1. Store locally immediately so we don't wait for state
        const scannedUnitCode = data.code || data.unitCode || "Unknown Code";
        const scannedUnitName = data.name || data.unitName || "Unknown Unit";

        const lLat = Number(data.lat);
        const lLng = Number(data.lng);
        const sLat = position.coords.latitude;
        const sLng = position.coords.longitude;

        // 2. Location Guard - Check if QR even has lat/lng
        if (!lLat || !lLng) {
          throw new Error("Invalid QR: No location data found.");
        }
        
        const distance = getDistance(lLat, lLng, sLat, sLng);
        
        // 3. Geofence Guard
        if (distance > 50) {
          setScanStatus("error");
          setErrorMessage(`Too Far! You are ${Math.round(distance)}m away.`);
          // Still set data so the overlay shows WHICH unit you are too far from
          setScannedData({ unitName: scannedUnitName, unitCode: scannedUnitCode });
          setStopStream(true);
          setIsProcessing(false);
          return; 
        }

        // 4. API Attendance Log
        await logAttendance({
          studentId: user._id,
          unitCode: scannedUnitCode,  
          unitName: scannedUnitName,
          unitId: data.unitId,
          distance: distance,
          studentLat: sLat,
          studentLng: sLng
        });

        // 5. Finalize Success
        setScannedData({ unitName: scannedUnitName, unitCode: scannedUnitCode });
        setScanStatus("success");
        setStopStream(true);
        setIsProcessing(false);

      } catch (e) {
        console.error("Scan Error:", e);
        setScanStatus("error");
        setErrorMessage(e.response?.data?.message || e.message); 
        setStopStream(true); 
        setIsProcessing(false); 
      }
    }, (geoErr) => {
      setScanStatus("error");
      setErrorMessage("GPS Error: Could not determine your location.");
      setIsProcessing(false);
      setStopStream(true);
    }, { 
      enableHighAccuracy: true, // For mobile phones, this is better for geofencing
      timeout: 10000,
      maximumAge: 0 
    });
  }
};
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#7DD3FC] via-[#CBD5E1] to-[#A5B4FC] flex flex-col font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="relative z-20 flex justify-between items-start p-6 pt-8">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-2.5 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 text-indigo-950 active:scale-95 transition-all shadow-sm"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        <div className="flex flex-col items-end">
          <span className="text-xl font-black text-slate-800 tracking-tighter italic">
            Proxi<span className="text-indigo-600">.</span>
          </span>
          <div className="w-8 h-1 bg-indigo-600/20 rounded-full mt-1" />
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
        
        <div className="relative w-full aspect-square max-w-[345px] -mt-24">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-[2.5px] border-l-[2.5px] border-[#6366F1] rounded-tl-3xl z-30 pointer-events-none shadow-[-2px_-2px_8px_rgba(99,102,241,0.3)]" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-[2.5px] border-r-[2.5px] border-[#6366F1] rounded-tr-3xl z-30 pointer-events-none shadow-[2px_-2px_8px_rgba(99,102,241,0.3)]" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[2.5px] border-l-[2.5px] border-[#6366F1] rounded-bl-3xl z-30 pointer-events-none shadow-[-2px_2px_8px_rgba(99,102,241,0.3)]" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[2.5px] border-r-[2.5px] border-[#6366F1] rounded-br-3xl z-30 pointer-events-none shadow-[2px_2px_10px_rgba(99,102,241,0.3)]" />

          <div className="absolute inset-4 bg-black rounded-[32px] border border-white/40 overflow-hidden shadow-2xl flex items-center justify-center">
             {!stopStream ? (
                <div className="relative w-full h-full">
                  <BarcodeScannerComponent
                    width="100%"
                    height="100%"
                    onUpdate={handleScan}
                    onError={() => setHasError(true)}
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-all">
                      <Loader2 size={40} className="text-cyan-400 animate-spin mb-3" />
                      <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Verifying Location...</p>
                    </div>
                  )}
                </div>
             ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center text-white transition-all duration-500 ${scanStatus === 'success' ? 'bg-cyan-500' : 'bg-rose-500'}`}>
                  {scanStatus === 'success' ? <ShieldCheck size={54} /> : <XCircle size={54} />}
                  <p className="font-black text-xs uppercase tracking-widest mt-2">
                    {scanStatus === 'success' ? 'Captured' : 'Failed'}
                  </p>
                </div>
             )}

             {!stopStream && !hasError && !isProcessing && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_20px_white] animate-scan-line z-10" />
             )}
          </div>
        </div>

        <div className="mt-20 text-center px-6">
          <p className="text-indigo-950/60 text-base font-medium leading-relaxed">
            {isProcessing 
              ? "Calculating distance..." 
              : stopStream 
                ? (scanStatus === 'success' ? "Success!" : errorMessage) // <--- CHANGED to show real error
                : "Align the QR code within the frame"}
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="pb-6 flex flex-col items-center gap-1.5 opacity-40">
        <div className="flex items-center gap-2">
          <ShieldCheck size={12} className="text-indigo-950" />
          <span className="text-indigo-950 text-[9px] font-black uppercase tracking-[0.3em]">GPS Geofence Active</span>
        </div>
      </div>

      {/* OVERLAY COMPONENT */}
      {/* OVERLAY COMPONENT */}
      {stopStream && (
        <SuccessOverlay 
          unitName={scannedData?.unitName} 
          unitCode={scannedData?.unitCode} 
          status={scanStatus}
          message={errorMessage} 
          onComplete={() => navigate('/dashboard')} 
        />
      )}

      <style>
        {`
          @keyframes scan-line {
            0% { top: 0%; opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-scan-line {
            animation: scan-line 3.5s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};

export default Scanner;