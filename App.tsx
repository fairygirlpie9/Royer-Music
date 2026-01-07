import React, { useState, useRef, useEffect, useCallback } from 'react';
import { INITIAL_TRACKS } from './constants';
import { Track } from './types';
import Knob from './components/Knob';
import Display from './components/Display';
import Playlist from './components/Playlist';
import { Play, Pause, SkipBack, SkipForward, Upload, Power, Zap, RotateCcw } from 'lucide-react';

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
      // Auto-advance
      if (currentTrackIndex < tracks.length - 1) {
          playTrack(currentTrackIndex + 1);
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    // Ensure playback rate is maintained if the browser resets it
    const handleRateChange = () => {
       if (Math.abs(audio.playbackRate - playbackRate) > 0.01) {
           // If the audio element drifted from our state (e.g. on new source load), reset it
           audio.playbackRate = playbackRate;
       }
    }

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleTimeUpdate);
    audio.addEventListener('ratechange', handleRateChange);

    // Initial sync
    audio.playbackRate = playbackRate;

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleTimeUpdate);
      audio.removeEventListener('ratechange', handleRateChange);
    };
  }, [tracks, currentTrackIndex, playbackRate]);

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

  // Handle Track Changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const track = tracks[currentTrackIndex];
    if (track) {
        const currentSrc = audio.getAttribute('src');
        if (currentSrc !== track.url) {
            audio.src = track.url;
            audio.load();
            
            // CRITICAL: Re-apply playback rate immediately after loading new source
            audio.playbackRate = playbackRate;
            
            if (isPlaying && poweredOn) {
                audio.play().catch(e => console.log("Auto-play prevented", e));
            }
        }
    } else {
        audio.removeAttribute('src');
        audio.load();
    }
  }, [currentTrackIndex, tracks, poweredOn]); // We read playbackRate from closure or state if needed, but specifically setting it on load is key.

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = newVol / 100;
    } else if (audioRef.current) {
        audioRef.current.volume = newVol / 100;
    }
  };

  const handleTuneChange = (val: number) => {
      // Map 0-100 to 0.8x - 1.2x
      const rate = 0.8 + ((val / 100) * 0.4);
      setPlaybackRate(rate);
      if (audioRef.current) {
          audioRef.current.playbackRate = rate;
      }
  };

  const handleResetControls = () => {
      handleVolumeChange(70);
      handleTuneChange(50); // Maps to 1.0 playback rate
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => ({
      id: crypto.randomUUID(),
      // Replace underscores with spaces and remove extension
      title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase(),
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
    h-16 bg-white border-4 border-black neo-shadow-sm 
    flex items-center justify-center 
    text-black hover:bg-yellow-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none 
    transition-all active:bg-black active:text-white select-none w-full
  `;

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-pink-400 pattern-dots font-['Space_Mono']">
      <audio ref={audioRef} crossOrigin="anonymous" preload="metadata" />

      {/* Main Container - The "Deck" */}
      <div className={`relative w-full max-w-4xl bg-yellow-100 border-4 border-black neo-shadow-lg transition-all duration-300 ${poweredOn ? '' : 'grayscale brightness-90'}`}>
        
        {/* Header Bar */}
        <div className="bg-black text-white p-3 flex justify-between items-center border-b-4 border-black">
             <div className="flex items-center gap-3">
                <Zap className={`${isPlaying ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-500'}`} />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-['Archivo_Black'] uppercase tracking-tighter leading-none">
                    ROYER'S<span className="text-pink-500">MUSIC</span>
                </h1>
             </div>
             <div className="flex items-center gap-4">
                 <span className="hidden sm:inline font-bold bg-white text-black px-2 py-1 transform -rotate-2 border-2 border-black text-sm">
                    V.9000
                 </span>
                 <button 
                    onClick={togglePower}
                    className={`w-10 h-10 border-2 border-white flex items-center justify-center transition-colors ${poweredOn ? 'bg-green-500 text-black shadow-[0_0_10px_#4ade80]' : 'bg-red-500 text-white'}`}
                    title="Power"
                 >
                    <Power size={20} strokeWidth={3} />
                 </button>
             </div>
        </div>

        {/* Screen Area (Visualizer + Info) */}
        <div className="bg-white border-b-4 border-black p-2 sm:p-4 relative">
             {/* Decorative Screws */}
             <div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>
             <div className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>
             
             {/* The Black Screen */}
             <div className="w-full bg-black border-4 border-black h-40 sm:h-56 md:h-64 relative overflow-hidden">
                <Display 
                    currentTrack={tracks[currentTrackIndex] || null}
                    currentTime={currentTime}
                    duration={duration}
                    analyser={analyserRef.current}
                    isPlaying={isPlaying}
                />
             </div>
        </div>

        {/* Transport Bar */}
        <div className="bg-[#C084FC] border-b-4 border-black p-4">
            <div className="flex gap-4 justify-between">
                <button className={`${btnClass} flex-1`} onClick={() => playTrack(currentTrackIndex - 1)}>
                    <SkipBack size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </button>
                
                <button className={`${btnClass} flex-[2]`} onClick={togglePlay}>
                    {isPlaying ? <Pause size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} fill="black" /> : <Play size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} fill="black" />}
                </button>
                
                <button className={`${btnClass} flex-1`} onClick={() => playTrack(currentTrackIndex + 1)}>
                    <SkipForward size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </button>

                <label className={`${btnClass} flex-1 cursor-pointer bg-white`}>
                     <input type="file" multiple accept="audio/*" onChange={handleFileUpload} className="hidden" />
                     <Upload size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </label>
            </div>
        </div>

        {/* Lower Control Section (Knobs & Playlist) */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-yellow-100">
            {/* Knobs Area */}
            <div className="relative md:col-span-1 bg-orange-300 border-4 border-black p-4 neo-shadow flex flex-col items-center justify-center gap-4">
                {/* Reset Button - Moved to absolute position top right */}
                <button 
                    onClick={handleResetControls}
                    className="absolute top-2 right-2 p-1.5 bg-white border-2 border-black hover:bg-red-400 hover:text-white transition-all neo-shadow-sm active:translate-y-[1px] active:shadow-none"
                    title="Reset Controls"
                >
                    <RotateCcw size={14} />
                </button>

                <Knob label="GAIN" value={volume} onChange={handleVolumeChange} size="md" />
                <Knob label="TUNE" value={(playbackRate - 0.8) / 0.4 * 100} onChange={handleTuneChange} size="md" />
            </div>

            {/* Playlist Area */}
            <div className="md:col-span-2 bg-white border-4 border-black p-0 neo-shadow h-56 md:h-64 flex flex-col">
                <div className="bg-black text-white p-2 font-bold text-center border-b-4 border-black font-['Archivo_Black'] tracking-widest text-lg">
                    TRACK LIST
                </div>
                <div className="flex-1 overflow-hidden">
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

        {/* Footer */}
        <div className="pb-4 text-center font-bold text-[10px] uppercase tracking-[0.4em] opacity-60">
             <a href="mailto:danielle.royer@hotmail.com" className="hover:opacity-100 transition-opacity">
                DESIGNED BY D ROYER
             </a>
        </div>

      </div>
    </div>
  );
};

export default App;