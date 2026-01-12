import React from 'react';
import Visualizer from './Visualizer';
import { Track } from '../types';
import { Loader2 } from 'lucide-react';

interface DisplayProps {
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  error?: boolean;
  isLoading?: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTitle = (title: string) => {
    return title.replace(/_/g, ' ');
};

const Display: React.FC<DisplayProps> = ({ currentTrack, currentTime, duration, analyser, isPlaying, error, isLoading }) => {
  return (
    <div className="w-full h-full relative font-['Space_Mono'] text-white">
        {/* Background Visualizer */}
        <div className="absolute inset-0 z-0">
             <Visualizer analyser={analyser} isPlaying={isPlaying} />
        </div>

        {/* Scanline Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
        
        {/* Content Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col p-4">
            
            {/* Middle: Track Info */}
            <div className="flex flex-col items-center justify-center text-center mix-blend-difference flex-1">
                 {isLoading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">READING DISK...</h2>
                    </div>
                 ) : error ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <h2 className="text-3xl font-bold bg-red-600 text-black px-2 mb-1">DISK ERROR</h2>
                        <span className="text-sm font-bold text-red-400">CHECK SOURCE</span>
                    </div>
                 ) : currentTrack ? (
                     <>
                        <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tight text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                            {formatTitle(currentTrack.title)}
                        </h2>
                        <p className="text-sm md:text-lg text-pink-400 uppercase font-bold bg-black/50 px-2 mt-1">
                            {currentTrack.artist}
                        </p>
                     </>
                 ) : (
                     <span className="text-xl text-neutral-500 animate-pulse">INSERT DISK</span>
                 )}
            </div>

            {/* Bottom: Time */}
            <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between text-xs font-bold font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-2 bg-neutral-800 border border-neutral-600">
                    <div 
                        className={`h-full ${error ? 'bg-red-500' : 'bg-pink-500'}`}
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    ></div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Display;