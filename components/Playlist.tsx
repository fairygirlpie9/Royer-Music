import React from 'react';
import { Track } from '../types';
import { Play, Pause, Music, Trash2 } from 'lucide-react';

interface PlaylistProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onSelect: (track: Track, index: number) => void;
  onRemove: (index: number) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ tracks, currentTrackId, isPlaying, onSelect, onRemove }) => {
  return (
    <div className="bg-neutral-800 rounded-lg p-4 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)] border border-neutral-700 h-64 overflow-y-auto font-sans">
      <h3 className="text-neutral-400 text-xs font-bold uppercase mb-3 tracking-widest border-b border-neutral-700 pb-1">Cassette Library</h3>
      {tracks.length === 0 ? (
        <div className="text-neutral-600 text-center mt-10 italic">No tapes loaded...</div>
      ) : (
        <ul className="space-y-1">
          {tracks.map((track, idx) => {
            const isActive = track.id === currentTrackId;
            return (
              <li 
                key={track.id + idx}
                className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                    isActive 
                    ? 'bg-amber-900/20 border border-amber-800/50' 
                    : 'hover:bg-neutral-700/50 border border-transparent'
                }`}
                onClick={() => onSelect(track, idx)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className={`w-6 h-6 flex items-center justify-center rounded-full ${isActive ? 'text-amber-500' : 'text-neutral-500'}`}>
                     {isActive && isPlaying ? <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" /> : <Music size={14} />}
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-medium truncate ${isActive ? 'text-amber-400' : 'text-neutral-300'}`}>
                        {track.title}
                      </span>
                      <span className="text-xs text-neutral-500 truncate">{track.artist}</span>
                   </div>
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-neutral-600 transition-opacity"
                  title="Eject Tape"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Playlist;
