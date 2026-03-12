import React from 'react';
import { motion } from 'motion/react';

interface DialProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  label: string;
}

export const Dial: React.FC<DialProps> = ({ value, onChange, min, max, label }) => {
  const rotation = ((value - min) / (max - min)) * 270 - 135;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16 rounded-full bg-[#1a1d23] knob-shadow border border-white/5 flex items-center justify-center cursor-pointer group">
        <motion.div 
          className="absolute w-1 h-6 bg-cyan-500 rounded-full top-2 origin-bottom"
          style={{ rotate: rotation }}
        />
        <div className="w-12 h-12 rounded-full bg-[#0f1115] border border-white/10 shadow-inner" />
      </div>
      <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">{label}</span>
    </div>
  );
};
