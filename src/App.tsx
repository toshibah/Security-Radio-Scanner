/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  Activity, 
  Zap, 
  Volume2, 
  Settings, 
  Search, 
  Save, 
  History,
  Menu,
  ChevronRight,
  ChevronLeft,
  Power,
  Mic2,
  Signal,
  Info,
  MapPin,
  Navigation,
  Square,
  Compass,
  Map,
  Trash2,
  Clock,
  Timer
} from 'lucide-react';
import { Waterfall } from './components/Waterfall';
import { Dial } from './components/Dial';
import { SignalMap } from './components/SignalMap';
import { getFrequencyIntelligence, FrequencyInfo } from './services/rfIntelligence';

export default function App() {
  const [frequency, setFrequency] = useState(144.000);
  const [frequencyB, setFrequencyB] = useState(440.000);
  const [activeVFO, setActiveVFO] = useState<'A' | 'B'>('A');
  const [isDualWatch, setIsDualWatch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [volume, setVolume] = useState(65);
  const [squelch, setSquelch] = useState(30);
  const [intelligence, setIntelligence] = useState<FrequencyInfo | null>(null);
  const [intelligenceB, setIntelligenceB] = useState<FrequencyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<FrequencyInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'info'>('scanner');
  const [historyTab, setHistoryTab] = useState<'saved' | 'log'>('log');
  const [callLog, setCallLog] = useState<{freq: number, service: string, origin: string, time: string}[]>([]);
  const [scanLog, setScanLog] = useState<{freq: number, time: string}[]>([]);
  const [logType, setLogType] = useState<'activity' | 'scan'>('activity');
  const [isIntervalMode, setIsIntervalMode] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(2.5);
  const [timeUntilNextScan, setTimeUntilNextScan] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Get User Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  // Automated Scanning Logic
  useEffect(() => {
    let scanInterval: NodeJS.Timeout;
    if (isScanning) {
      scanInterval = setInterval(() => {
        const setFreq = activeVFO === 'A' ? setFrequency : setFrequencyB;
        setFreq(prev => {
          const next = Number((prev + 0.025).toFixed(3));
          if (next > 3000) return 30;
          
          // Log the scanned frequency
          setScanLog(prevLog => [{
            freq: next,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }, ...prevLog.slice(0, 49)]);

          // Randomly "detect" a signal (1% chance per step)
          if (Math.random() > 0.99) {
            setIsScanning(false);
            return next;
          }
          return next;
        });
      }, 50);
    }
    return () => clearInterval(scanInterval);
  }, [isScanning, activeVFO]);

  // Interval Scanning Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isIntervalMode && !isScanning) {
      if (timeUntilNextScan === 0) setTimeUntilNextScan(intervalMinutes * 60);
      
      timer = setInterval(() => {
        setTimeUntilNextScan(prev => {
          if (prev <= 1) {
            setIsScanning(true);
            return intervalMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isIntervalMode, isScanning, intervalMinutes, timeUntilNextScan]);

  // Dual Watch Logic: Alternate between VFO A and B
  useEffect(() => {
    let dualInterval: NodeJS.Timeout;
    if (isDualWatch && !isScanning) {
      dualInterval = setInterval(() => {
        setActiveVFO(prev => prev === 'A' ? 'B' : 'A');
      }, 3000); // Switch every 3 seconds
    } else if (!isDualWatch) {
      setActiveVFO('A');
    }
    return () => clearInterval(dualInterval);
  }, [isDualWatch, isScanning]);

  // Log detected calls
  useEffect(() => {
    const currentFreq = activeVFO === 'A' ? frequency : frequencyB;
    const currentIntel = activeVFO === 'A' ? intelligence : intelligenceB;

    if (currentIntel && !isScanning) {
      const exists = callLog.some(log => log.freq === currentFreq);
      if (!exists && currentIntel.isLikelyActive) {
        const newEntry = {
          freq: currentFreq,
          service: currentIntel.service,
          origin: currentIntel.origin,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setCallLog(prev => [newEntry, ...prev.slice(0, 9)]);
        setScanLog(prev => [newEntry, ...prev.slice(0, 49)]);
      }
    }
  }, [intelligence, intelligenceB, isScanning, frequency, frequencyB, activeVFO, callLog]);

  const fetchIntelligence = useCallback(async (freq: number, vfo: 'A' | 'B') => {
    setIsLoading(true);
    const data = await getFrequencyIntelligence(freq);
    if (vfo === 'A') setIntelligence(data);
    else setIntelligenceB(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isScanning) {
      const timer = setTimeout(() => {
        fetchIntelligence(activeVFO === 'A' ? frequency : frequencyB, activeVFO);
      }, 2000); // Increased to 2s to reduce API pressure
      return () => clearTimeout(timer);
    }
  }, [frequency, frequencyB, activeVFO, isScanning, fetchIntelligence]);

  const toggleScan = () => {
    setIsScanning(!isScanning);
  };

  const saveToHistory = () => {
    const currentIntel = activeVFO === 'A' ? intelligence : intelligenceB;
    if (currentIntel) {
      setHistory(prev => [currentIntel, ...prev.slice(0, 19)]);
    }
  };

  const adjustFrequency = (delta: number) => {
    const setFreq = activeVFO === 'A' ? setFrequency : setFrequencyB;
    setFreq(prev => Math.max(30, Math.min(3000, Number((prev + delta).toFixed(3)))));
  };

  if (!isPowerOn) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <button 
          onClick={() => setIsPowerOn(true)}
          className="p-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-cyan-500 transition-colors"
        >
          <Power size={48} />
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#0f1115] text-white font-sans overflow-hidden">
      {/* Side Rail */}
      <div className="w-16 border-r border-white/5 flex flex-col items-center py-6 gap-8 bg-[#0a0c10]">
        <div className="text-cyan-500">
          <Radio size={24} />
        </div>
        <div className="flex flex-col gap-6 mt-12">
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'scanner' ? 'bg-cyan-500/10 text-cyan-500' : 'text-white/30 hover:text-white'}`}
          >
            <Activity size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-cyan-500/10 text-cyan-500' : 'text-white/30 hover:text-white'}`}
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'info' ? 'bg-cyan-500/10 text-cyan-500' : 'text-white/30 hover:text-white'}`}
          >
            <Info size={20} />
          </button>
        </div>
        <div className="mt-auto">
          <button 
            onClick={() => setIsPowerOn(false)}
            className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
          >
            <Power size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              SPECTRAL <span className="text-cyan-500">RF-X1</span>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-white/40 uppercase tracking-widest">v2.5 PRO</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {userLocation && (
              <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
                <MapPin size={14} className="text-cyan-500" />
                <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">
                  {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <Signal size={14} className="text-cyan-500" />
              <span className="text-xs font-mono text-white/60">RSSI: -84 dBm</span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Display Section */}
        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Left: Main Display */}
          <div className="col-span-8 flex flex-col gap-6 min-h-0">
            {/* Frequency Display */}
            <div className="lcd-display rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group">
              <div className="scan-line animate-scan" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-4">
                  {/* VFO A */}
                  <div 
                    onClick={() => setActiveVFO('A')}
                    className={`flex flex-col cursor-pointer transition-all ${activeVFO === 'A' ? 'opacity-100 scale-100' : 'opacity-40 scale-95 hover:opacity-60'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.2em]">VFO A</span>
                      {activeVFO === 'A' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-7xl font-mono font-bold tracking-tighter text-white">
                        {frequency.toFixed(3)}
                      </span>
                      <span className="text-2xl font-mono text-cyan-500/60 font-medium">MHz</span>
                    </div>
                  </div>

                  {/* VFO B */}
                  <div 
                    onClick={() => setActiveVFO('B')}
                    className={`flex flex-col cursor-pointer transition-all ${activeVFO === 'B' ? 'opacity-100 scale-100' : 'opacity-40 scale-95 hover:opacity-60'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.2em]">VFO B</span>
                      {activeVFO === 'B' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-mono font-bold tracking-tighter text-white">
                        {frequencyB.toFixed(3)}
                      </span>
                      <span className="text-xl font-mono text-cyan-500/60 font-medium">MHz</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsDualWatch(!isDualWatch); }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${isDualWatch ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                    >
                      DUAL WATCH
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); (activeVFO === 'A' ? setFrequency : setFrequencyB)(144.000); }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${(activeVFO === 'A' ? frequency : frequencyB) < 300 ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                    >
                      VHF
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); (activeVFO === 'A' ? setFrequency : setFrequencyB)(440.000); }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${(activeVFO === 'A' ? frequency : frequencyB) >= 300 ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                    >
                      UHF
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className={`w-1.5 h-6 rounded-sm ${i <= 5 ? 'bg-cyan-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-white/30 uppercase">Signal Strength</span>
                </div>
              </div>

              <div className="flex gap-4 mt-8 relative z-10">
                <button 
                  onClick={() => adjustFrequency(-1.0)}
                  className="flex-1 py-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => adjustFrequency(-0.001)}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-xs font-mono"
                >
                  -1k
                </button>
                <button 
                  onClick={toggleScan}
                  className={`flex-[2] py-3 rounded-lg border font-bold uppercase tracking-widest text-sm transition-all ${isScanning ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-cyan-500 border-cyan-400 text-black'}`}
                >
                  {isScanning ? 'Stop Scan' : 'Start Scan'}
                </button>
                <button 
                  onClick={() => adjustFrequency(0.001)}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-xs font-mono"
                >
                  +1k
                </button>
                <button 
                  onClick={() => adjustFrequency(1.0)}
                  className="flex-1 py-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Waterfall Display */}
            <div className="flex-1 min-h-0">
              <Waterfall 
                frequency={activeVFO === 'A' ? frequency : frequencyB} 
                isScanning={isScanning} 
                hasSignal={activeVFO === 'A' ? intelligence?.isLikelyActive : intelligenceB?.isLikelyActive}
              />
            </div>
          </div>

          {/* Right: Intelligence & Controls */}
          <div className="col-span-4 flex flex-col gap-6">
            {/* Intelligence Card */}
            <div className="bg-[#1a1d23] rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" />
                  Frequency Intelligence
                  {(activeVFO === 'A' ? intelligence : intelligenceB)?.isFallback && (
                    <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">OFFLINE</span>
                  )}
                </h3>
                <button 
                  onClick={saveToHistory}
                  disabled={!(activeVFO === 'A' ? intelligence : intelligenceB)}
                  className="text-cyan-500 hover:text-cyan-400 disabled:opacity-30"
                >
                  <Save size={16} />
                </button>
              </div>

              <div className="min-h-[180px] flex flex-col justify-center">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    <span className="text-[10px] font-mono text-white/30 uppercase animate-pulse">Analyzing Spectrum...</span>
                  </div>
                ) : (activeVFO === 'A' ? intelligence : intelligenceB) ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Service</span>
                      <p className="text-lg font-semibold">{(activeVFO === 'A' ? intelligence : intelligenceB)!.service}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Description</span>
                      <p className="text-sm text-white/60 leading-relaxed">{(activeVFO === 'A' ? intelligence : intelligenceB)!.description}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Modulation</span>
                        <p className="text-xs font-mono bg-white/5 px-2 py-1 rounded mt-1">{(activeVFO === 'A' ? intelligence : intelligenceB)!.modulation}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Status</span>
                        <p className={`text-xs font-mono px-2 py-1 rounded mt-1 ${(activeVFO === 'A' ? intelligence : intelligenceB)!.isLikelyActive ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/30'}`}>
                          {(activeVFO === 'A' ? intelligence : intelligenceB)!.isLikelyActive ? 'ACTIVE' : 'IDLE'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Signal Origin</span>
                        <div className="flex items-center gap-2">
                          <Map size={10} className="text-cyan-500/50" />
                          <span className="text-xs font-medium text-white/80">{(activeVFO === 'A' ? intelligence : intelligenceB)!.origin}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Location</span>
                        <span className="text-xs font-medium text-cyan-500/80 italic">{(activeVFO === 'A' ? intelligence : intelligenceB)!.locationName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Proximity</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Compass size={10} className="text-amber-500" style={{ transform: `rotate(${(activeVFO === 'A' ? intelligence : intelligenceB)!.bearing}deg)` }} />
                            <span className="text-[10px] font-mono text-white/40">{(activeVFO === 'A' ? intelligence : intelligenceB)!.bearing}°</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Navigation size={10} className="text-cyan-500 animate-pulse" />
                            <span className="text-xs font-mono text-cyan-500">{(activeVFO === 'A' ? intelligence : intelligenceB)!.estimatedDistanceKm.toFixed(1)} km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5">
                      <SignalMap 
                        bearing={(activeVFO === 'A' ? intelligence : intelligenceB)!.bearing}
                        distance={(activeVFO === 'A' ? intelligence : intelligenceB)!.estimatedDistanceKm}
                        locationName={(activeVFO === 'A' ? intelligence : intelligenceB)!.locationName}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-white/20 italic">Tune to a frequency to begin analysis</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-[#1a1d23] rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Mic2 size={14} className="text-cyan-500" />
                  Spectrum Monitor
                </h3>
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                  <button 
                    onClick={() => setLogType('activity')}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${logType === 'activity' ? 'bg-cyan-500 text-black' : 'text-white/30 hover:text-white'}`}
                  >
                    ACTIVITY
                  </button>
                  <button 
                    onClick={() => setLogType('scan')}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${logType === 'scan' ? 'bg-amber-500 text-black' : 'text-white/30 hover:text-white'}`}
                  >
                    SCAN LOG
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                {logType === 'activity' ? (
                  callLog.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-[10px] text-white/20 italic uppercase tracking-widest">Monitoring Spectrum...</p>
                    </div>
                  ) : (
                    callLog.map((call, i) => (
                      <motion.div 
                        key={`call-${call.freq}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5"
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-cyan-500">{call.freq.toFixed(3)} MHz</span>
                            <span className="text-[9px] font-mono text-white/20">{call.time}</span>
                          </div>
                          <span className="text-[9px] text-white/60 font-medium truncate">{call.service}</span>
                          <span className="text-[8px] text-cyan-500/40 uppercase tracking-tighter truncate italic">{call.origin}</span>
                        </div>
                      </motion.div>
                    ))
                  )
                ) : (
                  scanLog.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-[10px] text-white/20 italic uppercase tracking-widest">No scan data...</p>
                    </div>
                  ) : (
                    scanLog.map((scan, i) => (
                      <motion.div 
                        key={`scan-${scan.freq}-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 border-l-amber-500/50 border-l-2"
                      >
                        <span className="text-[10px] font-mono text-amber-500/80">{scan.freq.toFixed(3)} MHz</span>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-amber-500/20 animate-pulse" />
                          <span className="text-[9px] font-mono text-white/20">{scan.time}</span>
                        </div>
                      </motion.div>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Hardware Controls */}
            <div className="bg-[#1a1d23] rounded-2xl p-6 border border-white/5 flex flex-col gap-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Menu size={14} />
                Analog Controls
              </h3>
              
              <div className="grid grid-cols-2 gap-8 items-start">
                <Dial 
                  label="Volume" 
                  value={volume} 
                  onChange={setVolume} 
                  min={0} 
                  max={100} 
                />
                <div className="flex flex-col items-center gap-4">
                  <Dial 
                    label="Squelch" 
                    value={squelch} 
                    onChange={setSquelch} 
                    min={0} 
                    max={100} 
                  />
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-full justify-center">
                    <Signal size={12} className="text-cyan-500" />
                    <span className="text-[10px] font-mono text-white/60 uppercase tracking-tighter">Signal: -84 dBm</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-white/30">
                  <span>Band Select</span>
                  <span className="text-cyan-500">{(activeVFO === 'A' ? frequency : frequencyB) < 300 ? 'VHF' : 'UHF'}</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-500">NFM</button>
                  <button className="flex-1 py-2 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-white/30">AM</button>
                  <button className="flex-1 py-2 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-white/30">WFM</button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-auto flex flex-col gap-4">
              {/* Interval Scan Control */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className={isIntervalMode ? "text-amber-500" : "text-white/20"} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Interval Scan</span>
                  </div>
                  <button 
                    onClick={() => setIsIntervalMode(!isIntervalMode)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isIntervalMode ? 'bg-amber-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isIntervalMode ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                
                {isIntervalMode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex flex-col gap-3 pt-2 border-t border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/40 uppercase tracking-tighter">Repeat Every</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0.5" 
                          max="30" 
                          step="0.5" 
                          value={intervalMinutes}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setIntervalMinutes(val);
                            setTimeUntilNextScan(val * 60);
                          }}
                          className="w-20 accent-amber-500"
                        />
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1">
                          <input 
                            type="number" 
                            min="0.1" 
                            max="60" 
                            step="0.1"
                            value={intervalMinutes}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setIntervalMinutes(val);
                              setTimeUntilNextScan(val * 60);
                            }}
                            className="w-10 bg-transparent text-[10px] font-mono text-amber-500 focus:outline-none text-right"
                          />
                          <span className="text-[8px] text-white/20 font-bold">MIN</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                      <span className="text-[9px] text-amber-500/60 uppercase font-bold">Next Scan In</span>
                      <div className="flex items-center gap-1.5">
                        <Timer size={10} className="text-amber-500 animate-pulse" />
                        <span className="text-xs font-mono text-amber-500 font-bold">
                          {Math.floor(timeUntilNextScan / 60)}:{(timeUntilNextScan % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsScanning(true)}
                  disabled={isScanning}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <Zap size={14} />
                  Start Scan
                </button>
                <button 
                  onClick={() => setIsScanning(false)}
                  disabled={!isScanning}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <Square size={14} />
                  Stop Scan
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-xs font-semibold">
                  <Mic2 size={14} />
                  Record
                </button>
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-xs font-semibold">
                  <Volume2 size={14} />
                  Mute
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Overlay (Conditional) */}
      <AnimatePresence>
        {activeTab === 'history' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-0 h-full w-96 bg-[#0a0c10] border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold tracking-tight">SPECTRUM LOGS</h2>
                <button onClick={() => setActiveTab('scanner')} className="text-white/40 hover:text-white">
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div className="flex justify-between items-center border-b border-white/5 mb-6">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setHistoryTab('log')}
                    className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${historyTab === 'log' ? 'text-cyan-500 border-b border-cyan-500' : 'text-white/20 hover:text-white/40'}`}
                  >
                    Scan Log
                  </button>
                  <button 
                    onClick={() => setHistoryTab('saved')}
                    className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${historyTab === 'saved' ? 'text-cyan-500 border-b border-cyan-500' : 'text-white/20 hover:text-white/40'}`}
                  >
                    Saved History
                  </button>
                </div>
                <button 
                  onClick={() => historyTab === 'log' ? setScanLog([]) : setHistory([])}
                  className="pb-2 text-[10px] font-bold uppercase tracking-widest text-red-500/40 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={10} />
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 flex flex-col gap-4">
              {historyTab === 'saved' ? (
                history.length === 0 ? (
                  <div className="text-center py-20 text-white/20 italic">No frequencies saved yet</div>
                ) : (
                  history.map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-cyan-500 font-mono font-bold">{item.frequency}</span>
                        <span className="text-[10px] font-mono text-white/20">{item.modulation}</span>
                      </div>
                      <p className="text-sm font-medium">{item.service}</p>
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  ))
                )
              ) : (
                scanLog.length === 0 ? (
                  <div className="text-center py-20 text-white/20 italic">No scan activity recorded</div>
                ) : (
                  scanLog.map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-cyan-500 font-mono font-bold">{item.freq.toFixed(3)} MHz</span>
                        <span className="text-[10px] font-mono text-white/20">{item.time}</span>
                      </div>
                      <p className="text-sm font-medium">{item.service}</p>
                      <p className="text-[10px] text-cyan-500/40 uppercase tracking-tighter mt-1">{item.origin}</p>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
