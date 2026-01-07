import React, { useState, useEffect, useRef, useCallback } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const Knob: React.FC<KnobProps> = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100,
  size = 'md'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const knobRef = useRef<HTMLDivElement>(null);

  // Calculate rotation based on value (mapping min-max to -135deg to +135deg)
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    document.body.style.cursor = 'ns-resize';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY; // Drag up to increase
    const range = max - min;
    const sensitivity = 0.5; // Pixels per unit
    
    let newValue = startValue + (deltaY * sensitivity * (range / 100));
    newValue = Math.min(Math.max(newValue, min), max);
    
    onChange(newValue);
  }, [isDragging, startY, startValue, min, max, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };

  const dotSize = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none group">
      <div 
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className={`${sizeClasses[size]} relative rounded-full bg-gradient-to-br from-neutral-200 to-neutral-400 shadow-[4px_4px_8px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.9)] cursor-ns-resize flex items-center justify-center border border-neutral-300 ring-1 ring-neutral-400/50 active:scale-95 transition-transform`}
        style={{ transform: `rotate(${rotation}deg)` }}
        title={`${label}: ${Math.round(value)}`}
      >
        {/* Inner concentric circles for texture */}
        <div className="absolute inset-1 rounded-full border border-neutral-300 opacity-50"></div>
        <div className="absolute inset-3 rounded-full border border-neutral-300 opacity-40"></div>
        
        {/* Indicator Line/Dot */}
        <div className="absolute top-2 w-1.5 h-1/2 origin-bottom flex flex-col items-center justify-start">
             <div className={`w-1.5 h-4 bg-orange-600 rounded-full shadow-[0_0_2px_rgba(234,88,12,0.8)]`}></div>
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-neutral-600 font-[Orbitron]">{label}</span>
    </div>
  );
};

export default Knob;
