import React from 'react';
import Visualizer from './Visualizer';
import { Track } from '../types';

interface DisplayProps {
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Display: React.FC<DisplayProps> = ({ currentTrack, currentTime, duration, analyser, isPlaying }) => {
  return (
    <div className="relative w-full h-48 bg-black rounded-sm border-4 border-neutral-700 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden flex flex-col p-4 font-['VT323']">
      {/* Glass Reflection overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-20"></div>
      
      {/* Main Info Area */}
      <div className="flex justify-between items-start z-10 mb-2">
        <div className="flex flex-col">
           <span className="text-teal-500/70 text-sm uppercase tracking-widest animate-pulse">Stereo Receiver</span>
           <div className="h-6 overflow-hidden w-64">
             <h2 className="text-2xl text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)] whitespace-nowrap">
               {currentTrack ? `${currentTrack.artist} - ${currentTrack.title}` : "NO DISC INSERTED"}
             </h2>
           </div>
        </div>
        <div className="text-right">
          <div className="text-3xl text-amber-500 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-amber-700/80 uppercase">
             Total: {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div className="flex gap-4 mb-2 z-10">
        <div className={`px-2 py-0.5 rounded border border-teal-900 ${isPlaying ? 'bg-teal-900/50 text-teal-300 shadow-[0_0_5px_rgba(45,212,191,0.5)]' : 'text-teal-900'}`}>
            PLAY
        </div>
        <div className={`px-2 py-0.5 rounded border border-red-900 ${!isPlaying && currentTrack ? 'bg-red-900/50 text-red-400 shadow-[0_0_5px_rgba(248,113,113,0.5)]' : 'text-red-900'}`}>
            PAUSE
        </div>
        <div className={`px-2 py-0.5 rounded border border-amber-900 ${currentTrack?.url.startsWith('blob') ? 'bg-amber-900/50 text-amber-400' : 'text-amber-900'}`}>
            TAPE
        </div>
        <div className="flex-1"></div>
        <div className="text-teal-800 text-sm">KHZ 44.1</div>
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 relative z-10 w-full bg-black/50 rounded border border-neutral-800/50">
        <Visualizer analyser={analyser} isPlaying={isPlaying} />
        {/* Grid overlay for retro feel */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,148,136,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,0.1)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>
      </div>
    </div>
  );
};

export default Display;
