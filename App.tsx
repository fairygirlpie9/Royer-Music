import React, { useState, useRef, useEffect, useCallback } from 'react';
import { INITIAL_TRACKS } from './constants';
import { Track } from './types';
import Knob from './components/Knob';
import Display from './components/Display';
import Playlist from './components/Playlist';
import { Play, Pause, SkipBack, SkipForward, Upload, Power, Disc, Music, Zap } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [playbackRate, setPlaybackRate] = useState(1.0); // 1.0 is normal speed
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [poweredOn, setPoweredOn] = useState(true);
  
  // Refs for audio handling
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Initialize Audio Context
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128; // Lower resolution for blockier look
      
      const gainNode = ctx.createGain();
      
      if (audioRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(ctx.destination);
        
        sourceNodeRef.current = source;
        analyserRef.current = analyser;
        gainNodeRef.current = gainNode;
        audioContextRef.current = ctx;
        
        // Sync initial values
        gainNode.gain.value = volume / 100;
        audioRef.current.playbackRate = playbackRate;
      }
    } catch (e) {
      console.error("Audio Context Init Failed", e);
    }
  }, [volume, playbackRate]);

  // Bind Audio Element Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (currentTrackIndex < tracks.length - 1) {
          playTrack(currentTrackIndex + 1);
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleTimeUpdate);

    // Apply initial playback rate
    audio.playbackRate = playbackRate;

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [tracks, currentTrackIndex]);

  // Controls
  const togglePlay = async () => {
    if (!poweredOn) return;
    if (!audioRef.current) return;
    
    if (!audioContextRef.current) {
        initAudioContext();
    }
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!audioRef.current.src && !tracks[currentTrackIndex]) return;
      try {
        await audioRef.current.play();
      } catch (e) {
        console.error("Playback failed:", e);
      }
    }
  };

  const playTrack = (index: number) => {
    if (!poweredOn) return;
    if (index < 0 || index >= tracks.length) return;
    setCurrentTrackIndex(index);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const track = tracks[currentTrackIndex];
    if (track) {
        // Only change src if it's different to avoid reloading same track
        const currentSrc = audio.getAttribute('src');
        if (currentSrc !== track.url) {
            audio.src = track.url;
            audio.load();
            if (isPlaying && poweredOn) {
                audio.play().catch(e => console.log("Auto-play prevented", e));
            }
        }
    } else {
        audio.removeAttribute('src');
        audio.load();
    }
  }, [currentTrackIndex, tracks, poweredOn]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newVol / 100;
    } else if (audioRef.current) {
        audioRef.current.volume = newVol / 100;
    }
  };

  // Map 0-100 knob value to 0.8x - 1.2x speed
  const handleTuneChange = (val: number) => {
      // center is 50. 
      // 0 -> 0.8
      // 50 -> 1.0
      // 100 -> 1.2
      const rate = 0.8 + ((val / 100) * 0.4);
      setPlaybackRate(rate);
      if (audioRef.current) {
          audioRef.current.playbackRate = rate;
      }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
      artist: 'UPLOAD', 
      url: URL.createObjectURL(file),
      file: file
    }));

    setTracks(prev => [...prev, ...newTracks]);
    if (tracks.length === 0 && newTracks.length > 0) setCurrentTrackIndex(0);
  };

  const handleRemoveTrack = (index: number) => {
      const newTracks = [...tracks];
      if (newTracks[index].url.startsWith('blob:')) {
          URL.revokeObjectURL(newTracks[index].url);
      }
      newTracks.splice(index, 1);
      setTracks(newTracks);
      
      if (currentTrackIndex >= index) {
          if (newTracks.length === 0) setCurrentTrackIndex(0);
          else if (currentTrackIndex > 0) setCurrentTrackIndex(currentTrackIndex - 1);
          else {
              const audio = audioRef.current;
              if (audio) { audio.src = newTracks[0].url; audio.load(); }
          }
      }
  };

  const togglePower = () => {
      if (poweredOn) {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
      }
      setPoweredOn(!poweredOn);
  };

  const btnClass = `
    h-14 bg-white border-2 border-black neo-shadow-sm 
    flex items-center justify-center 
    text-black hover:bg-yellow-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none 
    transition-all active:bg-black active:text-white select-none
  `;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 bg-pink-400 pattern-dots">
      <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />

      {/* Main Container */}
      <div className={`relative w-full max-w-5xl bg-yellow-100 border-4 border-black neo-shadow-lg p-2 transition-all duration-300 ${poweredOn ? '' : 'grayscale brightness-90'}`}>
        
        {/* Header Bar */}
        <div className="bg-black text-white p-4 mb-4 flex justify-between items-center border-b-4 border-black">
             <div className="flex items-center gap-3">
                <Zap className={`${isPlaying ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-500'}`} />
                <h1 className="text-4xl font-['Archivo_Black'] uppercase tracking-tighter leading-none">
                    AUDIO<span className="text-pink-500">DECK</span>
                </h1>
             </div>
             <div className="flex items-center gap-4">
                 <span className="hidden md:inline font-bold bg-white text-black px-2 py-1 transform -rotate-2 border-2 border-black">
                    V.9000
                 </span>
                 <button 
                    onClick={togglePower}
                    className={`w-12 h-12 border-4 border-white flex items-center justify-center transition-colors ${poweredOn ? 'bg-green-500 text-black animate-pulse' : 'bg-red-500 text-white'}`}
                    title="Power"
                 >
                    <Power size={24} strokeWidth={3} />
                 </button>
             </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 h-full">
            
            {/* Left Column: Visuals & Transport */}
            <div className="flex-1 flex flex-col gap-4">
                
                {/* Display Unit */}
                <div className="bg-white border-4 border-black p-4 neo-shadow relative overflow-hidden flex flex-col">
                    <Display 
                        currentTrack={tracks[currentTrackIndex] || null}
                        currentTime={currentTime}
                        duration={duration}
                        analyser={analyserRef.current}
                        isPlaying={isPlaying}
                    />
                    {/* Decorative bolts */}
                    <div className="absolute top-2 left-2 w-3 h-3 bg-black rounded-full"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 bg-black rounded-full"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 bg-black rounded-full"></div>
                    <div className="absolute bottom-2 right-2 w-3 h-3 bg-black rounded-full"></div>
                </div>

                {/* Transport Controls */}
                <div className="bg-purple-400 border-4 border-black p-6 neo-shadow">
                    <div className="grid grid-cols-5 gap-4">
                        <button className={`${btnClass} col-span-1`} onClick={() => playTrack(currentTrackIndex - 1)}>
                            <SkipBack size={28} strokeWidth={3} />
                        </button>
                        
                        <button className={`${btnClass} col-span-2 ${isPlaying ? 'bg-yellow-300' : ''}`} onClick={togglePlay}>
                            {isPlaying ? <Pause size={32} strokeWidth={3} fill="black" /> : <Play size={32} strokeWidth={3} fill="black" />}
                        </button>
                        
                        <button className={`${btnClass} col-span-1`} onClick={() => playTrack(currentTrackIndex + 1)}>
                            <SkipForward size={28} strokeWidth={3} />
                        </button>

                        <label className={`${btnClass} col-span-1 cursor-pointer bg-blue-400 text-white hover:bg-blue-500`}>
                             <input type="file" multiple accept="audio/*" onChange={handleFileUpload} className="hidden" />
                             <Upload size={24} strokeWidth={3} />
                        </label>
                    </div>
                </div>

            </div>

            {/* Right Column: Playlist & Knobs */}
            <div className="w-full lg:w-96 flex flex-col gap-4">
                
                {/* Knobs Panel */}
                <div className="bg-orange-300 border-4 border-black p-6 neo-shadow flex justify-around items-end pb-8">
                     <Knob label="GAIN" value={volume} onChange={handleVolumeChange} size="lg" />
                     {/* Map 0-100 range to internal playback rate logic */}
                     <Knob label="TUNE" value={(playbackRate - 0.8) / 0.4 * 100} onChange={handleTuneChange} size="md" />
                </div>

                {/* Playlist */}
                <div className="flex-1 bg-white border-4 border-black p-0 neo-shadow min-h-[300px]">
                     <div className="bg-black text-white p-2 font-bold text-center border-b-4 border-black font-['Archivo_Black'] tracking-widest text-xl">
                        TRACK_LIST
                     </div>
                     <Playlist 
                        tracks={tracks} 
                        currentTrackId={tracks[currentTrackIndex]?.id}
                        isPlaying={isPlaying}
                        onSelect={(t, i) => playTrack(i)}
                        onRemove={handleRemoveTrack}
                     />
                </div>
            </div>
        </div>
        
        <div className="mt-4 text-center font-bold text-xs uppercase tracking-[0.5em] opacity-50">
            Design by RetroFi Corp.
        </div>

      </div>
    </div>
  );
};

export default App;