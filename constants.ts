import { Track } from './types';

// NOTE: To use your own files from GitHub, upload them to an 'assets/music' folder
// relative to where this app is served, and update the URLs below.
// Browsers cannot automatically scan folders, so you must list files here.

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'demo-1',
    title: 'TECH_HOUSE_V1',
    artist: 'SYSTEM_DEFAULT',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', 
  },
  {
    id: 'demo-2',
    title: 'HIP_HOP_BANGER',
    artist: 'SYSTEM_DEFAULT',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  },
  {
    id: 'demo-3',
    title: 'DRIVE_FAST',
    artist: 'SYSTEM_DEFAULT',
    url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  },
  // Tracks based on your list. 
  // IMPORTANT: You must create an 'assets' folder in your public directory
  // and place mp3 files with these exact names inside.
  {
    id: 'local-1',
    title: 'OBSESSION',
    artist: 'LIBRARY',
    url: './assets/obsession.mp3',
  },
  {
    id: 'local-2',
    title: 'LIGHTNING',
    artist: 'LIBRARY',
    url: './assets/lightning.mp3',
  },
  {
    id: 'local-3',
    title: 'ONE_KISS',
    artist: 'LIBRARY',
    url: './assets/one_kiss.mp3',
  },
  {
    id: 'local-4',
    title: 'LEVITATING',
    artist: 'LIBRARY',
    url: './assets/levitating.mp3',
  }
];

export const MAX_VOLUME = 100;