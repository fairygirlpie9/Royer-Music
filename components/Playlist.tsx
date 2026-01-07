import React from 'react';
import { Track } from '../types';
import { Music, Trash2, ArrowRight } from 'lucide-react';

interface PlaylistProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onSelect: (track: Track, index: number) => void;
  onRemove: (index: number) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ tracks, currentTrackId, isPlaying, onSelect, onRemove }) => {
  return (
    <div className="bg-white h-72 overflow-y-auto p-4">
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-neutral-400 font-bold border-2 border-dashed border-neutral-300">
             <span>NO_DATA</span>
        </div>
      ) : (
        <ul className="space-y-3">
          {tracks.map((track, idx) => {
            const isActive = track.id === currentTrackId;
            return (
              <li 
                key={track.id + idx}
                className={`
                    group flex items-center justify-between p-3 cursor-pointer transition-all border-2
                    ${isActive 
                        ? 'bg-pink-500 border-black neo-shadow-sm -translate-y-1' 
                        : 'bg-neutral-100 border-black hover:bg-yellow-200'
                    }
                `}
                onClick={() => onSelect(track, idx)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className={`font-mono text-sm font-bold ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                      {(idx + 1).toString().padStart(2, '0')}
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-bold uppercase truncate ${isActive ? 'text-white' : 'text-black'}`}>
                        {track.title}
                      </span>
                   </div>
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                  className={`
                    p-2 border-2 border-black transition-opacity
                    ${isActive ? 'bg-white text-black hover:bg-neutral-200' : 'bg-red-400 text-white opacity-0 group-hover:opacity-100'}
                  `}
                  title="Delete"
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