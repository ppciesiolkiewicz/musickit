import type { Shape } from "./shapes";

const N = null;

/**
 * Open-position chords: each is one chord, not a movable shape.
 * `f` holds offsets from the root fret like every other shape, and `at` is that root fret, so `at + f` is the real fret (0 = open string).
 * `stage` is the course stage that teaches the chord; chords without one are extra voicings outside the course.
 */
export const OPEN_SHAPES: Shape[] = [
  // ---------- stage 1: the first eight chords ----------
  {rs:6,suf:'m',   fam:'minor',   ext:'triad',at:0,stage:1,f:[0,2,2,0,0,0],      tags:['open','pop','rock'],exp:[0,3,7],note:'Usually the very first chord: two fingers.'},
  {rs:5,suf:'m',   fam:'minor',   ext:'triad',at:0,stage:1,f:[N,0,2,2,1,0],      tags:['open','pop','rock'],exp:[0,3,7]},
  {rs:5,suf:'',    fam:'major',   ext:'triad',at:3,stage:1,f:[N,0,-1,-3,-2,-3],  tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:4,suf:'',    fam:'major',   ext:'triad',at:0,stage:1,f:[N,N,0,2,3,2],      tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:6,suf:'',    fam:'major',   ext:'triad',at:3,stage:1,f:[0,-1,-3,-3,-3,0],  tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:6,suf:'',    fam:'major',   ext:'triad',at:0,stage:1,f:[0,2,2,1,0,0],      tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:5,suf:'',    fam:'major',   ext:'triad',at:0,stage:1,f:[N,0,2,2,2,0],      tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:4,suf:'m',   fam:'minor',   ext:'triad',at:0,stage:1,f:[N,N,0,2,3,1],      tags:['open','pop','rock'],exp:[0,3,7]},

  // ---------- stage 2: more open chords ----------
  {rs:4,suf:'maj7',fam:'major',   ext:'7',    at:3,stage:2,f:[N,N,0,-1,-2,-3],   tags:['open','pop'],exp:[0,4,7,11],note:'The easy F: no barre needed.'},
  {rs:5,suf:'7',   fam:'dominant',ext:'7',    at:2,stage:2,f:[N,0,-1,0,-2,0],    tags:['open','blues','rock'],exp:[0,4,7,10],note:'The V7 that pulls back to E minor.'},
  {rs:6,suf:'7',   fam:'dominant',ext:'7',    at:0,stage:2,f:[0,2,0,1,0,0],      tags:['open','blues','rock'],exp:[0,4,7,10]},
  {rs:5,suf:'7',   fam:'dominant',ext:'7',    at:0,stage:2,f:[N,0,2,0,2,0],      tags:['open','blues','rock'],exp:[0,4,7,10]},
  {rs:4,suf:'7',   fam:'dominant',ext:'7',    at:0,stage:2,f:[N,N,0,2,1,2],      tags:['open','blues','rock'],exp:[0,4,7,10]},
  {rs:5,suf:'7',   fam:'dominant',ext:'7',    at:3,stage:2,f:[N,0,-1,0,-2,-3],   tags:['open','blues'],exp:[0,4,10]},
  {rs:6,suf:'7',   fam:'dominant',ext:'7',    at:3,stage:2,f:[0,-1,-3,-3,-3,-2], tags:['open','blues'],exp:[0,4,7,10]},
  {rs:6,suf:'m7',  fam:'minor',   ext:'7',    at:0,stage:2,f:[0,2,2,0,3,0],      tags:['open','pop'],exp:[0,3,7,10]},
  {rs:5,suf:'m7',  fam:'minor',   ext:'7',    at:0,stage:2,f:[N,0,2,0,1,0],      tags:['open','pop'],exp:[0,3,7,10]},
  {rs:5,suf:'add9',fam:'major',   ext:'9',    at:3,stage:2,f:[N,0,-1,-3,0,0],    tags:['open','pop'],exp:[0,2,4,7],n:{2:'9'}},
  {rs:5,suf:'sus2',fam:'sus',     ext:'triad',at:0,stage:2,f:[N,0,2,2,0,0],      tags:['open','pop','sus'],exp:[0,2,7],n:{2:'2'}},
  {rs:4,suf:'sus2',fam:'sus',     ext:'triad',at:0,stage:2,f:[N,N,0,2,3,0],      tags:['open','pop','sus'],exp:[0,2,7],n:{2:'2'}},
  {rs:4,suf:'sus4',fam:'sus',     ext:'triad',at:0,stage:2,f:[N,N,0,2,3,3],      tags:['open','pop','sus'],exp:[0,5,7],n:{5:'4'}},
  {rs:6,suf:'sus4',fam:'sus',     ext:'triad',at:0,stage:2,f:[0,2,2,2,0,0],      tags:['open','pop','sus'],exp:[0,5,7],n:{5:'4'}},

  // ---------- not in the course: open voicings that keep notes ringing between chords ----------
  {rs:5,suf:'maj7',fam:'major',   ext:'7',    at:3,f:[N,0,-1,-3,-3,-3],  tags:['open','pop'],exp:[0,4,7,11],note:'C with the top three strings left open.'},
  {rs:6,suf:'maj7',fam:'major',   ext:'7',    at:3,f:[0,-1,-3,-3,-3,-1], tags:['open','pop'],exp:[0,4,7,11]},
  {rs:5,suf:'maj7',fam:'major',   ext:'7',    at:0,f:[N,0,2,1,2,0],      tags:['open','pop'],exp:[0,4,7,11]},
  {rs:4,suf:'maj7',fam:'major',   ext:'7',    at:0,f:[N,N,0,2,2,2],      tags:['open','pop'],exp:[0,4,7,11]},
  {rs:4,suf:'m7',  fam:'minor',   ext:'7',    at:0,f:[N,N,0,2,1,1],      tags:['open','pop'],exp:[0,3,7,10]},
  {rs:5,suf:'m7',  fam:'minor',   ext:'7',    at:2,f:[N,0,-2,0,-2,0],    tags:['open','pop'],exp:[0,3,7,10]},
  {rs:6,suf:'m(add9)',fam:'minor',ext:'9',    at:0,f:[0,2,2,0,0,2],      tags:['open','pop'],exp:[0,2,3,7],n:{2:'9'}},
];
