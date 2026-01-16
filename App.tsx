import React, { useState, useRef, useEffect, useCallback } from 'react';
import { INITIAL_TRACKS } from './constants';
import { Track } from './types';
import Knob from './components/Knob';
import Display from './components/Display';
import Playlist from './components/Playlist';
import { Play, Pause, SkipBack, SkipForward, Mail, Power, Zap, RotateCcw, Repeat } from 'lucide-react';

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
  const [error, setError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Default AutoPlay to TRUE per user request
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  
  // Refs for audio handling
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Fetch Tracks from GitHub
  useEffect(() => {
    const fetchGitHubTracks = async () => {
        setIsLoading(true);
        try {
            // 1. Get repo info to find default branch
            const repoResponse = await fetch('https://api.github.com/repos/fairygirlpie9/all-my-music');
            if (!repoResponse.ok) throw new Error('Failed to fetch repo info');
            const repoData = await repoResponse.json();
            const defaultBranch = repoData.default_branch || 'main';

            // 2. Try to fetch songs.json
            let metadata: Record<string, { title?: string, genre?: string }> = {};
            try {
                const metaUrl = `https://raw.githubusercontent.com/fairygirlpie9/all-my-music/${defaultBranch}/songs.json`;
                const metaResponse = await fetch(metaUrl);
                if (metaResponse.ok) {
                    metadata = await metaResponse.json();
                }
            } catch (e) {
                console.log("Metadata load skipped or invalid:", e);
            }

            // 3. Fetch recursive tree to get ALL files in subfolders (Unlimited up to 100k files)
            const treeResponse = await fetch(`https://api.github.com/repos/fairygirlpie9/all-my-music/git/trees/${defaultBranch}?recursive=1`);
            if (!treeResponse.ok) throw new Error('Failed to fetch repo tree');
            const treeData = await treeResponse.json();
            
            // 4. Filter and map tracks
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
            const repoTracks: Track[] = treeData.tree
                .filter((item: any) => item.type === 'blob' && audioExtensions.some(ext => item.path.toLowerCase().endsWith(ext)))
                .map((item: any) => {
                    const fileName = item.path.split('/').pop();
                    
                    // Lookup metadata by full path (preferred) or just filename
                    const meta = metadata[item.path] || metadata[fileName];
                    
                    // Use metadata title or fallback to cleaned filename
                    const title = meta?.title 
                        ? meta.title.toUpperCase() 
                        : fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase();
                    
                    // Use metadata genre or fallback
                    const artist = meta?.genre 
                        ? meta.genre.toUpperCase() 
                        : 'GITHUB REPO';

                    // Safely construct URL for nested paths
                    const pathEncoded = item.path.split('/').map((s: string) => encodeURIComponent(s)).join('/');
                    const rawUrl = `https://raw.githubusercontent.com/fairygirlpie9/all-my-music/${defaultBranch}/${pathEncoded}`;

                    return {
                        id: item.sha,
                        title: title,
                        artist: artist, // Mapped to 'artist' field for display logic
                        url: rawUrl
                    };
                });

            if (repoTracks.length > 0) {
                setTracks(repoTracks);
            }
        } catch (err) {
            console.error("Error loading tracks:", err);
        } finally {
            setIsLoading(false);
        }
    };

    fetchGitHubTracks();
  }, []);

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
      // Auto-advance only if autoplay is on
      if (autoPlay && currentTrackIndex < tracks.length - 1) {
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
  }, [tracks, currentTrackIndex, playbackRate, autoPlay]);

  // Controls
  const togglePlay = async () => {
    if (!poweredOn) return;
    if (!audioRef.current) return;
    if (tracks.length === 0) return;
    
    if (error) {
        // Retry logic if in error state
        if (audioRef.current.error) {
           audioRef.current.load();
        }
    }
    
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
        setError(false);
      } catch (e) {
        console.error("Playback failed:", e);
      }
    }
  };

  const playTrack = (index: number) => {
    if (!poweredOn) return;
    if (index < 0 || index >= tracks.length) return;
    setCurrentTrackIndex(index);
    setError(false);
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
            setError(false);
            
            if (isPlaying && poweredOn) {
                audio.play().catch(e => {
                    console.log("Auto-play prevented or failed", e);
                });
            }
        }
    } else {
        audio.removeAttribute('src');
        audio.load();
    }
  }, [currentTrackIndex, tracks, poweredOn]);

  const handleAudioError = () => {
      console.error("Audio Load Error");
      setIsPlaying(false);
      setError(true);
  };

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
      <audio 
        ref={audioRef} 
        crossOrigin="anonymous" 
        preload="metadata" 
        onError={handleAudioError}
      />

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
                    error={error}
                    isLoading={isLoading}
                />
             </div>
        </div>

        {/* Transport Bar */}
        <div className="bg-[#C084FC] border-b-4 border-black p-4">
            <div className="flex gap-3 md:gap-4 justify-between">
                <button className={`${btnClass} flex-1`} onClick={() => playTrack(currentTrackIndex - 1)} title="Previous">
                    <SkipBack size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </button>
                
                <button className={`${btnClass} flex-[2]`} onClick={togglePlay} title="Play/Pause">
                    {isPlaying ? <Pause size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} fill="black" /> : <Play size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} fill="black" />}
                </button>
                
                <button className={`${btnClass} flex-1`} onClick={() => playTrack(currentTrackIndex + 1)} title="Next">
                    <SkipForward size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </button>

                {/* New Prominent Auto Button */}
                <button 
                    onClick={() => setAutoPlay(!autoPlay)}
                    className={`${btnClass} flex-1 flex flex-col items-center justify-center gap-0.5 md:gap-1 transition-all
                        ${autoPlay ? 'bg-green-400' : 'bg-white'}
                    `}
                    title="Auto Play"
                >
                     <Repeat size={18} strokeWidth={3} className={`transition-all ${autoPlay ? 'rotate-180' : 'text-neutral-400'}`} />
                     <span className={`text-[9px] md:text-[10px] font-bold leading-none ${autoPlay ? 'text-black' : 'text-neutral-400'}`}>AUTO</span>
                </button>

                <a href="mailto:danielle.royer@hotmail.com" className={`${btnClass} flex-1`} aria-label="Contact">
                     <Mail size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </a>
            </div>
        </div>

        {/* Lower Control Section (Knobs & Playlist) */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-yellow-100">
            {/* Knobs Area */}
            <div className="relative md:col-span-1 bg-orange-300 border-4 border-black p-4 neo-shadow flex flex-col items-center justify-center gap-4">
                
                {/* Reset Button */}
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
                    {/* Show explicit track count to confirm unlimited loading */}
                    TRACK LIST <span className="text-pink-500">//</span> {tracks.length}
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