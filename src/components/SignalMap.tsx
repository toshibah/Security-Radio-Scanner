import React from 'react';
import { motion } from 'motion/react';
import { Navigation, MapPin, Radio } from 'lucide-react';

interface SignalMapProps {
  bearing: number;
  distance: number;
  locationName: string;
}

export const SignalMap: React.FC<SignalMapProps> = ({ bearing, distance, locationName }) => {
  // Convert bearing to radians for calculation
  const bearingRad = (bearing * Math.PI) / 180;
  
  // Normalize distance for visualization (max 50km in the service)
  // We'll scale it so 50km is near the edge of our 100x100 coordinate system
  const maxVisualDistance = 50;
  const normalizedDistance = Math.min((distance / maxVisualDistance) * 45, 45);
  
  // Calculate relative position (center is 50, 50)
  const targetX = 50 + normalizedDistance * Math.sin(bearingRad);
  const targetY = 50 - normalizedDistance * Math.cos(bearingRad);

  return (
    <div className="relative w-full aspect-square bg-black/40 rounded-xl border border-white/5 overflow-hidden group">
      {/* Radar Rings */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="scannerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Abstract Map Features (Terrain/Buildings) */}
        <g opacity="0.03">
          <path d="M 10 20 L 30 15 L 40 30 L 20 40 Z" fill="white" />
          <path d="M 70 10 L 90 20 L 80 40 L 60 30 Z" fill="white" />
          <path d="M 15 70 L 35 80 L 25 95 L 5 85 Z" fill="white" />
          <path d="M 75 75 L 95 65 L 85 85 L 65 90 Z" fill="white" />
          <circle cx="20" cy="20" r="5" fill="white" />
          <circle cx="80" cy="80" r="8" fill="white" />
        </g>

        {/* Grid lines */}
        <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
        
        {/* Concentric rings */}
        <circle cx="50" cy="50" r="15" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
        
        {/* Signal Beam (Wedge) */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.05, 0.25, 0.05],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          d={`M 50 50 
             L ${50 + 60 * Math.sin(bearingRad - 0.2)} ${50 - 60 * Math.cos(bearingRad - 0.2)} 
             A 60 60 0 0 1 ${50 + 60 * Math.sin(bearingRad + 0.2)} ${50 - 60 * Math.cos(bearingRad + 0.2)} 
             Z`}
          fill="#f59e0b"
        />

        {/* Radar Sweep Line */}
        <motion.line
          x1="50" y1="50"
          x2="50" y2="0"
          stroke="#06b6d4"
          strokeWidth="0.5"
          strokeOpacity="0.3"
          style={{ originX: '50px', originY: '50px' }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Distance Labels */}
        <text x="52" y="35" fontSize="3" fill="white" fillOpacity="0.2" className="font-mono">15km</text>
        <text x="52" y="20" fontSize="3" fill="white" fillOpacity="0.2" className="font-mono">30km</text>
        <text x="52" y="5" fontSize="3" fill="white" fillOpacity="0.2" className="font-mono">45km</text>

        {/* Scanner Location (Center) */}
        <circle cx="50" cy="50" r="8" fill="url(#scannerGradient)" />
        <circle cx="50" cy="50" r="1.5" fill="#06b6d4" />
        
        {/* Signal Path */}
        <motion.line 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity: [0.1, 0.4, 0.2, 0.5, 0.1] 
          }}
          transition={{
            opacity: {
              duration: 0.5,
              repeat: Infinity,
              repeatType: "mirror"
            }
          }}
          x1="50" y1="50" x2={targetX} y2={targetY} 
          stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 1"
        />

        {/* Target Location */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          {/* Signal Heatmap Glow */}
          <motion.circle 
            cx={targetX} cy={targetY} r="14" 
            fill="#f59e0b" 
            initial={{ opacity: 0.05, scale: 0.8 }}
            animate={{ 
              opacity: [0.05, 0.15, 0.05],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.circle 
            cx={targetX} cy={targetY} r="8" 
            fill="#f59e0b" 
            initial={{ opacity: 0.1, scale: 0.9 }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scale: [0.9, 1.1, 0.9]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Crosshair */}
          <line x1={targetX - 3} y1={targetY} x2={targetX + 3} y2={targetY} stroke="#f59e0b" strokeWidth="0.2" strokeOpacity="0.5" />
          <line x1={targetX} y1={targetY - 3} x2={targetX} y2={targetY + 3} stroke="#f59e0b" strokeWidth="0.2" strokeOpacity="0.5" />
          
          <circle cx={targetX} cy={targetY} r="2" fill="#f59e0b" />
          <circle cx={targetX} cy={targetY} r="6" fill="#f59e0b" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '1.5s' }} />
          <circle cx={targetX} cy={targetY} r="10" fill="#f59e0b" fillOpacity="0.1" className="animate-ping" style={{ animationDuration: '3s' }} />
          
          {/* Bearing Indicator */}
          <line 
            x1={targetX} y1={targetY} 
            x2={targetX + 4 * Math.sin(bearingRad)} 
            y2={targetY - 4 * Math.cos(bearingRad)} 
            stroke="#f59e0b" strokeWidth="1" 
          />
        </motion.g>
      </svg>

      {/* Overlay Info */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
          <Navigation size={10} className="text-cyan-500" />
          <span className="text-[8px] font-mono text-white/60 uppercase tracking-widest">Scanner Location</span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
          <div className="w-4 h-0.5 bg-white/40" />
          <span className="text-[6px] font-mono text-white/40 uppercase">10km</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 bg-amber-500/10 backdrop-blur-md px-2 py-1 rounded border border-amber-500/20">
          <Radio size={10} className="text-amber-500" />
          <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest">{locationName}</span>
        </div>
        <span className="text-[10px] font-mono text-white/40">{distance.toFixed(1)}km @ {bearing}°</span>
      </div>

      {/* Compass Labels */}
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/20">N</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/20">S</span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-white/20">W</span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-white/20">E</span>
    </div>
  );
};
