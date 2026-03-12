import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface WaterfallProps {
  frequency: number;
  isScanning: boolean;
  hasSignal?: boolean;
}

export const Waterfall: React.FC<WaterfallProps> = ({ frequency, isScanning, hasSignal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[][]>([]);
  const rows = 100;
  const cols = 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    // Initialize data
    if (dataRef.current.length === 0) {
      dataRef.current = Array.from({ length: rows }, () => 
        Array.from({ length: cols }, () => Math.random() * 20)
      );
    }

    const colorScale = d3.scaleSequential(d3.interpolateInferno).domain([0, 100]);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Shift data down
      const newRow = Array.from({ length: cols }, (_, i) => {
        const dist = Math.abs(i - cols / 2);
        let signal = Math.random() * 20;
        
        if (isScanning) {
          signal = Math.random() * 30;
        } else if (hasSignal) {
          signal = dist < 8 ? 80 + Math.random() * 20 : Math.random() * 20;
        } else {
          signal = dist < 3 ? 40 + Math.random() * 20 : Math.random() * 20;
        }
        
        return signal;
      });

      dataRef.current.unshift(newRow);
      if (dataRef.current.length > rows) {
        dataRef.current.pop();
      }

      // Draw Waterfall
      dataRef.current.forEach((row, y) => {
        row.forEach((val, x) => {
          ctx.fillStyle = colorScale(val);
          ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        });
      });

      // Draw Band Markers
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = 'rgba(0, 242, 255, 0.5)';

      const span = 10; // 10MHz span
      const startFreq = frequency - span / 2;
      
      // Marker for 300MHz (VHF/UHF boundary)
      const boundary = 300;
      if (boundary > startFreq && boundary < startFreq + span) {
        const x = ((boundary - startFreq) / span) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillText('VHF | UHF', x + 5, 15);
      }

      // Center Marker
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.fillText(`${frequency.toFixed(3)} MHz`, width / 2 + 5, height - 10);

      ctx.restore();
    };

    const interval = setInterval(render, 100);
    return () => clearInterval(interval);
  }, [isScanning, hasSignal]);

  return (
    <div className="relative w-full h-full lcd-display rounded-lg overflow-hidden border border-white/5">
      <div className="scan-line animate-scan" />
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={400} 
        className="w-full h-full opacity-80"
      />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="w-full h-full grid grid-cols-10 grid-rows-10 opacity-10">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-white/20" />
          ))}
        </div>
      </div>
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-cyan-500'}`} />
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
          {isScanning ? 'Scanning...' : 'Locked'}
        </span>
      </div>
    </div>
  );
};
