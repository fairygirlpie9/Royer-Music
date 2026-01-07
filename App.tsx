import React, { useState, useRef, useEffect, useCallback } from 'react';
import { INITIAL_TRACKS } from './constants';
import { Track } from './types';
import Knob from './components/Knob';
import Display from './components/Display';
import Playlist from './components/Playlist';
import { Play, Pause, SkipBack, SkipForward, Upload, Power, Disc } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [poweredOn, setPoweredOn] = useState(true);
  
  // Refs for audio handling
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Initialize Audio Context on user interaction (to handle autoplay policies)
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      
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
        
        // Sync initial volume
        gainNode.gain.value = volume / 100;
      }
    } catch (e) {
      console.error("Audio Context Init Failed", e);
    }
  }, [volume]);

  // Bind Audio Element Events to React State
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto play next track logic handled separately or here
      if (currentTrackIndex < tracks.length - 1) {
          // We need to call the function from the component scope, or trigger a state change
          // Ideally, we move the auto-advance logic to a separate effect or keep it here
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

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [tracks.length, currentTrackIndex]); // Dependencies for auto-advance context

  // Handle Play/Pause Click
  const togglePlay = async () => {
    if (!poweredOn) return;
    if (!audioRef.current) return;
    
    // Ensure context is running
    if (!audioContextRef.current) {
        initAudioContext();
    }
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Safety check: do we have a source?
      if (!audioRef.current.src && !tracks[currentTrackIndex]) return;

      try {
        await audioRef.current.play();
      } catch (e) {
        console.error("Playback failed:", e);
        // State won't flip because 'play' event won't fire
      }
    }
  };

  // Handle Track Change
  const playTrack = (index: number) => {
    if (!poweredOn) return;
    if (index < 0 || index >= tracks.length) return;
    
    setCurrentTrackIndex(index);
    // The useEffect below will handle loading and playing
  };

  // Effect to update audio source when track index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const track = tracks[currentTrackIndex];
    
    // If we have a track, load it
    if (track) {
        // Only reload if the source is actually different to prevent glitches
        if (audio.src !== track.url) {
            audio.src = track.url;
            audio.load();
            
            if (isPlaying && poweredOn) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Playback prevented during track switch:", error);
                    });
                }
            }
        }
    } else {
        // No track selected
        audio.removeAttribute('src');
        audio.load();
    }
  }, [currentTrackIndex, tracks, poweredOn]); // Removing isPlaying from deps to avoid loop

  // Handle Volume Change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newVol / 100;
    } else if (audioRef.current) {
        audioRef.current.volume = newVol / 100;
    }
  };

  // Auto-advance Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
       if (currentTrackIndex < tracks.length - 1) {
           playTrack(currentTrackIndex + 1);
       }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [currentTrackIndex, tracks]);

  // File Upload Handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      artist: 'Local Tape', 
      url: URL.createObjectURL(file),
      file: file
    }));

    setTracks(prev => [...prev, ...newTracks]);
    
    // If no music was playing, start the first uploaded track
    if (tracks.length === 0 && newTracks.length > 0) {
        setCurrentTrackIndex(0);
    }
  };

  const handleRemoveTrack = (index: number) => {
      const newTracks = [...tracks];
      
      // Revoke URL if it's a blob to save memory
      if (newTracks[index].url.startsWith('blob:')) {
          URL.revokeObjectURL(newTracks[index].url);
      }

      newTracks.splice(index, 1);
      setTracks(newTracks);
      
      // Adjust index if needed
      if (currentTrackIndex >= index) {
          if (newTracks.length === 0) {
              setCurrentTrackIndex(0); // Reset
          } else if (currentTrackIndex > 0) {
              setCurrentTrackIndex(currentTrackIndex - 1);
          } else {
              // We removed the 0th element, and there are still tracks. 
              // The new 0th element is now current. Force reload.
              const audio = audioRef.current;
              if (audio) {
                  audio.src = newTracks[0].url;
                  audio.load();
              }
          }
      }
  };

  // Power Toggle
  const togglePower = () => {
      if (poweredOn) {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
          }
      }
      setPoweredOn(!poweredOn);
  };

  // Button Style helper
  const btnClass = "w-12 h-10 bg-neutral-200 rounded shadow-[0_3px_0_#9ca3af,0_4px_5px_rgba(0,0,0,0.4)] active:shadow-[0_0_0_#9ca3af,inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] transition-all flex items-center justify-center text-neutral-700 hover:bg-neutral-100 relative";
  const woodPanelClass = "hidden lg:block w-12 h-full wood-grain border-l border-black/50 shadow-2xl absolute right-0 top-0 bottom-0 z-0 rounded-r-lg";
  const woodPanelLeftClass = "hidden lg:block w-12 h-full wood-grain border-r border-black/50 shadow-2xl absolute left-0 top-0 bottom-0 z-0 rounded-l-lg";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-10 perspective-1000">
      
      {/* Hidden Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />

      {/* Main Hi-Fi Unit Container */}
      <div className={`relative w-full max-w-4xl bg-neutral-800 rounded-lg shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-700 ${poweredOn ? 'scale-100' : 'scale-[0.99] brightness-75'}`}>
        
        {/* Wood Side Panels */}
        <div className={woodPanelLeftClass}></div>
        <div className={woodPanelClass}></div>

        {/* Content Area (Brushed Metal) */}
        <div className="brushed-metal relative z-10 flex flex-col p-6 lg:p-10 gap-8 h-full border-x-8 border-neutral-900 mx-0 lg:mx-8 rounded-sm">
            
            {/* Header: Branding & Power */}
            <div className="flex justify-between items-center border-b-2 border-neutral-400/30 pb-4 shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                <div className="flex flex-col select-none">
                    <h1 className="text-3xl font-black italic tracking-tighter text-neutral-800 flex items-center gap-2 font-[Orbitron]">
                        <Disc className={`transition-transform duration-[3s] ${isPlaying ? 'animate-spin-slow' : ''}`} /> 
                        RETRO<span className="text-orange-600">FI</span> 
                    </h1>
                    <span className="text-xs font-semibold tracking-[0.3em] text-neutral-500 ml-10">PRO-AUDIO SYSTEM RF-2025</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <button 
                        onClick={togglePower}
                        className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-lg transition-all duration-300 ${poweredOn ? 'border-orange-500 bg-neutral-800 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'border-neutral-600 bg-neutral-700 text-neutral-900'}`}
                        title="Power"
                    >
                        <Power size={20} />
                    </button>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Power</span>
                </div>
            </div>

            {/* Top Section: Display & Knobs */}
            <div className="flex flex-col md:flex-row gap-8">
                {/* Screen */}
                <div className={`flex-1 transition-all duration-1000 ${poweredOn ? 'opacity-100' : 'opacity-10 grayscale'}`}>
                    <Display 
                        currentTrack={tracks[currentTrackIndex] || null}
                        currentTime={currentTime}
                        duration={duration}
                        analyser={analyserRef.current}
                        isPlaying={isPlaying}
                    />
                </div>
                
                {/* Knobs */}
                <div className="flex flex-row md:flex-col justify-center items-center gap-6 p-4 bg-neutral-300 rounded-lg border border-white/60 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1)]">
                    <Knob label="Volume" value={volume} onChange={handleVolumeChange} size="md" />
                    <div className="flex gap-4">
                       <Knob label="Bass" value={60} onChange={() => {}} size="sm" />
                       <Knob label="Treble" value={55} onChange={() => {}} size="sm" />
                    </div>
                </div>
            </div>

            {/* Middle Section: Controls & Playlist */}
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Transport Controls */}
                <div className="flex-1 bg-neutral-300 rounded p-4 shadow-[inset_1px_1px_3px_rgba(255,255,255,1),inset_-2px_-2px_4px_rgba(0,0,0,0.1)] border border-neutral-400 flex flex-col justify-center select-none">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-3 tracking-[0.2em] text-center border-b border-neutral-400/50 pb-1 mx-8">Transport Control</div>
                    <div className="flex justify-center gap-4">
                        <button className={btnClass} onClick={() => playTrack(currentTrackIndex - 1)}>
                            <SkipBack size={20} fill="currentColor" />
                        </button>
                        <button className={`${btnClass} ${isPlaying && poweredOn ? 'bg-orange-100 text-orange-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] translate-y-[2px]' : ''}`} onClick={togglePlay}>
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <button className={btnClass} onClick={() => playTrack(currentTrackIndex + 1)}>
                            <SkipForward size={20} fill="currentColor" />
                        </button>
                        
                        <div className="w-px h-10 bg-neutral-400 mx-2"></div>

                        <label className={`${btnClass} cursor-pointer group`}>
                             <input type="file" multiple accept="audio/*" onChange={handleFileUpload} className="hidden" />
                             <Upload size={20} className="group-hover:text-blue-600 transition-colors" />
                        </label>
                    </div>
                </div>

                {/* Playlist Display */}
                <div className={`flex-1 transition-opacity duration-500 ${poweredOn ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                     <Playlist 
                        tracks={tracks} 
                        currentTrackId={tracks[currentTrackIndex]?.id}
                        isPlaying={isPlaying}
                        onSelect={(t, i) => playTrack(i)}
                        onRemove={handleRemoveTrack}
                     />
                </div>
            </div>
            
            {/* Footer / Branding Plate */}
            <div className="flex justify-center mt-2">
                <div className="bg-black/90 px-8 py-2 rounded text-neutral-400 text-xs font-mono border border-neutral-700 shadow-lg tracking-widest">
                    HIGH FIDELITY STEREO COMPONENT
                </div>
            </div>

        </div>
      </div>
      
      {/* Background ambience visual */}
      <div className="fixed inset-0 -z-10 bg-neutral-900 bg-[radial-gradient(circle_at_center,_#262626_0%,_#000000_100%)]"></div>
    </div>
  );
};

export default App;