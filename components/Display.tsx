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
    <div className="w-full h-56 bg-black flex flex-col font-['Space_Mono'] relative">
      
      {/* Track Marquee Area */}
      <div className="h-16 bg-yellow-400 border-b-4 border-black flex items-center overflow-hidden whitespace-nowrap px-2 relative">
          <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhZWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-10 pointer-events-none"></div>
          {currentTrack ? (
             <div className="text-4xl font-bold text-black uppercase animate-marquee inline-block w-full">
               {currentTrack.artist} /// {currentTrack.title} /// {currentTrack.artist} /// {currentTrack.title}
             </div>
          ) : (
            <div className="text-4xl font-bold text-black uppercase">INSERT_DISK</div>
          )}
      </div>

      <div className="flex-1 flex relative">
          {/* Time Display */}
          <div className="w-32 bg-white border-r-4 border-black flex flex-col justify-center items-center p-2 z-10">
              <span className="text-xs font-bold bg-black text-white px-1 mb-1">ELAPSED</span>
              <div className="text-3xl font-bold tracking-tighter">
                {formatTime(currentTime)}
              </div>
              <div className="w-full h-2 bg-neutral-200 mt-2 border-2 border-black overflow-hidden">
                   <div 
                      className="h-full bg-pink-500" 
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                   ></div>
              </div>
          </div>

          {/* Visualizer Area */}
          <div className="flex-1 bg-black relative">
              <Visualizer analyser={analyser} isPlaying={isPlaying} />
              
              {/* Status Overlay */}
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {isPlaying && (
                      <div className="bg-green-500 border-2 border-black text-black text-xs font-bold px-2 py-0.5 animate-pulse">
                          PLAYING
                      </div>
                  )}
                  {currentTrack?.url.startsWith('blob') && (
                      <div className="bg-blue-400 border-2 border-black text-white text-xs font-bold px-2 py-0.5">
                          LOCAL
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Display;