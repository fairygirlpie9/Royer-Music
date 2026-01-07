import { Track } from './types';

// Points to raw.githubusercontent.com to stream directly from the repo
const REPO_BASE = 'https://raw.githubusercontent.com/fairygirlpie9/Royer-Music/main';

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'ACROSS YOUR BODY',
    artist: 'LIBRARY',
    url: `${REPO_BASE}/Across%20Your%20Body.mp3`, 
  },
  {
    id: 'track-2',
    title: 'BLACK NIGHT',
    artist: 'LIBRARY',
    url: `${REPO_BASE}/Black%20Night.mp3`,
  },
  {
    id: 'track-3',
    title: 'OBSESSION',
    artist: 'LIBRARY',
    url: `${REPO_BASE}/Obsession.mp3`,
  },
  // Fallback demo track
  {
    id: 'demo-1',
    title: 'TECH HOUSE DEMO',
    artist: 'MIXKIT',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', 
  },
];

export const MAX_VOLUME = 100;