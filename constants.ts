import { Track } from './types';

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'demo-1',
    title: 'Tech House Vibes',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', 
  },
  {
    id: 'demo-2',
    title: 'Hip Hop 02',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  },
  {
    id: 'demo-3',
    title: 'Driving Force',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  }
];

export const MAX_VOLUME = 100;