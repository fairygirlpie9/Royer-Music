export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
  file?: File; // Optional original file object
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrackIndex: number;
}
