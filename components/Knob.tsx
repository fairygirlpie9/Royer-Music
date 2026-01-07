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
    const deltaY = startY - e.clientY;
    const range = max - min;
    const sensitivity = 0.8; 
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

  const sizeConfig = {
    sm: { size: 'w-16 h-16', indicator: 'h-6' },
    md: { size: 'w-20 h-20', indicator: 'h-8' },
    lg: { size: 'w-28 h-28', indicator: 'h-10' }
  };

  const currentConfig = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-2 select-none group">
      <div 
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className={`${currentConfig.size} relative rounded-full bg-white border-4 border-black neo-shadow-sm cursor-ns-resize flex items-center justify-center transition-transform active:scale-95`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Decorative center screw */}
        <div className="absolute w-4 h-4 rounded-full border-2 border-black bg-neutral-300 z-10 flex items-center justify-center">
             <div className="w-full h-0.5 bg-black rotate-45"></div>
        </div>

        {/* Indicator Line */}
        <div className="absolute top-0 w-2 h-1/2 origin-bottom flex flex-col items-center justify-start py-1">
             <div className={`w-full ${currentConfig.indicator} bg-black`}></div>
        </div>
      </div>
      <span className="text-sm font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 -rotate-2">{label}</span>
    </div>
  );
};

export default Knob;