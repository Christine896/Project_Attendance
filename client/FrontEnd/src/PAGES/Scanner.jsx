import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeScannerComponent from "react-qr-barcode-scanner"; 
import { ChevronLeft, ShieldCheck, Loader2, XCircle, Database } from 'lucide-react';
import SuccessOverlay from '../components/SuccessOverlay';
import { logAttendance } from '../services/api'; 

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
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
  const [errorMessage, setErrorMessage] = useState(""); 
  const [zoomLevel, setZoomLevel] = useState(1); // Default to 1x
  const [permissionDenied, setPermissionDenied] = useState(false);


  // --- UPDATED: MANUAL ZOOM CONTROL ---
  useEffect(() => {
    const applyZoom = async () => {
      try {
        const video = document.querySelector('video');
        if (video && video.srcObject) {
          const track = video.srcObject.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          
          if (capabilities.zoom) {
            const min = capabilities.zoom.min || 1;
            const max = capabilities.zoom.max || 4;
            // Clamp the value between hardware limits
            const clampedZoom = Math.max(min, Math.min(zoomLevel, max));
            await track.applyConstraints({ advanced: [{ zoom: clampedZoom }] });
          }
        }
      } catch (err) {
        console.warn("Zoom not supported on this device/browser");
      }
    };
    applyZoom();
  }, [zoomLevel, stopStream]);

  useEffect(() => {
    if (stopStream && (scanStatus === 'success' || scanStatus === 'offline_success')) {
      const timer = setTimeout(() => {
        navigate('/dashboard'); 
      }, 6000); // 6000 milliseconds = 6 seconds
      return () => clearTimeout(timer);
    }
  }, [stopStream, scanStatus, navigate]);

  // SURGICAL FIX: Early permission check on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { /* GPS is allowed, do nothing */ },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionDenied(true);
            setStopStream(true);
            setScanStatus("error");
            setErrorMessage("Please enable location access in your device settings.");
          }
        }
      );
    }
  }, []);

  const handleScan = async (err, result) => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (result?.text && !stopStream && !isProcessing) {
      // SURGICAL FIX 1: Verify the QR Code BEFORE doing anything else
      let data;
      try {
        const rawText = result.text.trim();
        data = JSON.parse(rawText);
        
        // --- SURGICAL FIX: REPLAY ATTACK (SCREENSHOT) PREVENTION ---
        // Checks if the QR code is older than 13 seconds (13000 ms)
        if (data.nonce) {
          const timeElapsed = Date.now() - data.nonce;
          if (timeElapsed > 13000) { 
            setErrorMessage("Please scan a live code.");
            setScanStatus("error");
            setStopStream(true);
            return;
          }
        }
        
        // SURGICAL FIX: The Offline Course Bouncer
        // Compares scanned course to the student's course in memory
        if (data.course && data.course !== user.course) {
           setErrorMessage(`Invalid Course: This unit belongs to ${data.course}, not ${user.course}.`);
           setScanStatus("error");
           setStopStream(true);
           return;
        } 

        if (!(data.code || data.unitCode) || !data.sessionId) {
          throw new Error("Invalid Format");
        }
      } catch (parseError) {
        setErrorMessage("Invalid QR Code. This is not a recognized Proxi attendance code.");
        setScanStatus("error");
        setStopStream(true);
        return; // Stop immediately, no infinite spinner!
      }
      // If we reach here, the QR code is 100% valid. Now start processing.
      setIsProcessing(true);

      navigator.geolocation.getCurrentPosition(async (position) => {
        let scannedUnitCode, scannedUnitName, distance, sLat, sLng, lLat, lLng;
        
        try {
          // SURGICAL FIX 2: Check GPS Accuracy (Test 8)
          // position.coords.accuracy is measured in meters.
          if (position.coords.accuracy > 100) {
             setErrorMessage("GPS signal too weak. Please move closer to a window or an open area and try again.");
             setScanStatus("error");
             setStopStream(true);
             setIsProcessing(false);
             return;
          }

          scannedUnitCode = data.code || data.unitCode;
          scannedUnitName = data.name || data.unitName;
          lLat = Number(data.lat);
          lLng = Number(data.lng);
          
          setScannedData({
            unitCode: scannedUnitCode,
            unitName: scannedUnitName
          });

          sLat = position.coords.latitude;
          sLng = position.coords.longitude;
          distance = getDistance(lLat, lLng, sLat, sLng);

          // 1. Check Geofence
          if (isNaN(distance) || distance > 150) {
            const distStr = isNaN(distance) ? "Unknown" : Math.round(distance);
            const geoError = new Error(`Too Far! You are ${distStr} m away.`);
            geoError.isGeofence = true; 
            throw geoError;
          }

          // 2. Try to send to the server
          await Promise.race([
            logAttendance({
              studentId: user._id, unitCode: scannedUnitCode, unitName: scannedUnitName,
              unitId: data.unitId, sessionId: data.sessionId, distance: Math.round(distance),
              studentLat: sLat, studentLng: sLng, lecturerLat: lLat, lecturerLng: lLng
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
          ]);

          setScanStatus("success");
          setStopStream(true);
          setIsProcessing(false);

        } catch (e) {
          // SURGICAL FIX: Bulletproof string match to absolutely prevent offline saving of frauds
          if (
            e.isGeofence || 
            (e.message && e.message.includes("Too Far")) || 
            (e.response && (e.response.status === 403 || e.response.status === 400))
          ) {
             setErrorMessage(e.response?.data?.message || e.message);
             setScanStatus("error");
             setStopStream(true);
             setIsProcessing(false);
             return; // STOP EXECUTION! Do not save offline.
          }

          // 3. OFFLINE FALLBACK
          if (!navigator.onLine || e.message === "Timeout" || !e.response) {
            const pending = JSON.parse(localStorage.getItem('pending_scans') || '[]');
            
            pending.push({
              studentId: user._id, unitCode: scannedUnitCode, unitName: scannedUnitName,
              unitId: data.unitId, sessionId: data.sessionId, distance: Math.round(distance),
              studentLat: sLat, studentLng: sLng, lecturerLat: lLat, lecturerLng: lLng,
              offline: true, date: new Date()
            });

            localStorage.setItem('pending_scans', JSON.stringify(pending));
            setScanStatus("offline_success");
            setStopStream(true);
            setIsProcessing(false);
            return;
          }

          setErrorMessage(e.response?.data?.message || e.message);
          setScanStatus("error");
          setStopStream(true);
          setIsProcessing(false); // Make sure spinner stops on API error
        }
      }, (geoErr) => {
        setIsProcessing(false);
        setScanStatus("error");
        setErrorMessage("Location Required: Please enable GPS and try again.");
        setStopStream(true);
      }, { 
        enableHighAccuracy: true, 
        timeout: 8000,      
        maximumAge: 600000 
      });
    }
  };

  // Helper function to safely render the text below the scanner
  const getHelperText = () => {
    if (isProcessing) return "Calculating distance...";
    if (stopStream && scanStatus === 'success') return "Success!";
    return "Align the QR code within the frame";
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
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-20">
        
        {/* THE FRAME: Lifted and Centered */}
        <div className="relative w-full aspect-square max-w-[345px] -mt-24">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-[2.5px] border-l-[2.5px] border-[#6366F1] rounded-tl-3xl z-30 pointer-events-none" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-[2.5px] border-r-[2.5px] border-[#6366F1] rounded-tr-3xl z-30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[2.5px] border-l-[2.5px] border-[#6366F1] rounded-bl-3xl z-30 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[2.5px] border-r-[2.5px] border-[#6366F1] rounded-br-3xl z-30 pointer-events-none" />

          <div className="absolute inset-4 bg-black rounded-[32px] border border-white/40 overflow-hidden shadow-2xl flex items-center justify-center">
             {!stopStream ? (
                <div className="relative w-full h-full">
                  <BarcodeScannerComponent
                    width="100%"
                    height="100%"
                    videoConstraints={{ 
                      facingMode: 'environment', 
                      width: { ideal: 1920 }, 
                      height: { ideal: 1080 } 
                    }}
                    onUpdate={handleScan}
                    // SURGICAL FIX: Catch the specific NotAllowedError
                    onError={(err) => {
                      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission denied")) {
                        setPermissionDenied(true);
                        setStopStream(true);
                        setScanStatus("error");
                        setErrorMessage("Please enable camera permission in your device settings.");
                      } else {
                        setHasError(true);
                      }
                    }}
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-all">
                      <Loader2 size={40} className="text-cyan-400 animate-spin mb-3" />
                      <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Verifying Location...</p>
                    </div>
                  )}
                </div>
             ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-500 ${scanStatus === 'success' ? 'bg-cyan-500 text-white' : 'bg-transparent'}`}>
                  {scanStatus === 'success' && (
                    <>
                      <ShieldCheck size={54} />
                      <p className="font-black text-xs uppercase tracking-widest mt-2"></p>
                    </>
                  )}
                </div>
             )}

             {!stopStream && !hasError && !isProcessing && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_20px_white] animate-scan-line z-10" />
             )}
          </div>
        </div>

        {/* ZOOM SLIDER: In the space below the frame */}
        {!stopStream && !isProcessing && (
          <div className="mt-12 w-full max-w-[280px] flex flex-col items-center gap-6 relative z-50">
            <div className="w-full flex items-center gap-4 bg-white/20 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/30 shadow-xl">
              <span className="text-[10px] font-black text-indigo-950/60">1x</span>
              <input 
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-indigo-950/10 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] font-black text-indigo-900">{zoomLevel}x</span>
            </div>
            <p className="text-indigo-950/60 text-base font-medium">{getHelperText()}</p>
          </div>
        )}
      </div> {/* Closes Main Content Container */}

      {/* OVERLAYS & FOOTER */}
      {stopStream && scanStatus === 'success' && (
        <SuccessOverlay unitName={scannedData?.unitName} unitCode={scannedData?.unitCode} status={scanStatus} onComplete={() => navigate('/dashboard')} />
      )}

      {/* GLASSMORPHIC OFFLINE OVERLAY */}
      {stopStream && scanStatus === 'offline_success' && (
        <div className="fixed inset-0 z-[100] bg-indigo-950/40 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="w-full max-w-[320px] bg-amber-500/25 backdrop-blur-2xl border border-amber-400/50 rounded-[3rem] p-10 flex flex-col items-center shadow-2xl">
            
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 border border-amber-500/20 shadow-inner">
              <Database size={44} className="text-amber-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Saved Offline</h2>
            
            <p className="text-center text-amber-100/60 font-medium text-sm mb-10 leading-relaxed px-2">
              <span className="text-amber-400 font-bold">{scannedData?.unitCode}</span><br/>
              Please sync when you reconnect to Wi-Fi.
            </p>

            <button 
              onClick={() => navigate('/dashboard')} 
              className="w-full py-4 bg-amber-500/90 text-indigo-950 font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl hover:bg-amber-400 active:scale-95 transition-all"
            >Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* SURGICAL FIX: Updated Error Screen with explicit action button and larger font */}
      {stopStream && scanStatus === 'error' && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#7DD3FC] via-[#CBD5E1] to-[#A5B4FC] flex flex-col items-center justify-center p-10 animate-in fade-in">
          
          <div className="w-16 h-16 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-rose-500/20">
            <XCircle size={32} />
          </div>

          {/* INCREASED FONT SIZE: Changed text-xl to text-3xl */}
          <p className="text-3xl font-black text-center text-indigo-950 leading-snug mb-10">
            {errorMessage}
          </p>

          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full max-w-[300px] flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all"
          >
            Return to Dashboard
          </button>

        </div>
      )}

      <div className="pb-8 mt-auto flex flex-col items-center gap-1.5 opacity-40 relative z-20">
        <div className="flex items-center gap-2">
          <ShieldCheck size={12} className="text-indigo-950" />
          <span className="text-indigo-950 text-[9px] font-black uppercase tracking-[0.3em]">Geofencing Active</span>
        </div>
      </div>

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
    </div> // Closes the Main Wrapper
  );
};

export default Scanner;