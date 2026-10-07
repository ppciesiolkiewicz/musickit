/**
 * Movable guitar chord shapes.
 *
 * `f` holds fret offsets from the root fret, low E to high e (null = muted).
 * `rs` is the string the root sits on (6 = low E ... 1 = high e).
 * `exp` is the expected set of semitones above the root; it is only used by the tests
 * to verify that the fingering really produces those intervals.
 */
export type ShapeFamily = "major" | "minor" | "dominant" | "altered" | "sus";
export type RootString = 6 | 5 | 4 | 3 | 1;

export interface Shape {
  rs: RootString;
  suf: string;
  v?: string;
  fam: ShapeFamily;
  ext: string;
  f: (number | null)[];
  tags: string[];
  exp: number[];
  n?: Record<number, string>;
  note?: string;
}

const N = null;

export const SHAPES: Shape[] = [
  // ---------- root on the 6th string (low E) ----------
  {rs:6,suf:'',   fam:'major',   ext:'triad',f:[0,2,2,1,0,0],  tags:['rock','pop','barre'],            exp:[0,4,7],      note:'The classic E-shape barre chord.'},
  {rs:6,suf:'m',  fam:'minor',   ext:'triad',f:[0,2,2,0,0,0],  tags:['rock','pop','barre'],            exp:[0,3,7],      note:'The classic Em-shape barre chord.'},
  {rs:6,suf:'7',  fam:'dominant',ext:'7',    f:[0,2,0,1,0,0],  tags:['blues','rock','funk','barre'],   exp:[0,4,7,10],   note:'Blues and rock-and-roll workhorse.'},
  {rs:6,suf:'maj7',fam:'major', ext:'7',     f:[0,2,1,1,0,0],  tags:['jazz','bossa','pop','soul','barre'],     exp:[0,4,7,11]},
  {rs:6,suf:'m7', fam:'minor',  ext:'7',     f:[0,2,0,0,0,0],  tags:['soul','funk','jazz','bossa','barre'],    exp:[0,3,7,10]},
  {rs:6,suf:'7',  v:'shell',fam:'dominant',ext:'7',f:[0,N,0,1,N,N],tags:['jazz','bossa','shell','compact'],    exp:[0,4,10],     note:'Root, 7th, 3rd: the jazz comping essential.'},
  {rs:6,suf:'maj7',v:'shell',fam:'major',ext:'7',f:[0,N,1,1,N,N],tags:['jazz','bossa','shell','compact'],      exp:[0,4,11]},
  {rs:6,suf:'m7', v:'shell',fam:'minor',ext:'7',f:[0,N,0,0,N,N],tags:['jazz','bossa','soul','shell','compact'],exp:[0,3,10]},
  {rs:6,suf:'9',  fam:'dominant',ext:'9',    f:[0,-1,0,-1,N,N],tags:['funk','soul','jazz','compact'],  exp:[0,2,4,10],   n:{2:'9'},  note:'The funk and soul staple: 9th on top.'},
  {rs:6,suf:'maj9',fam:'major', ext:'9',     f:[0,-1,1,-1,N,N],tags:['jazz','bossa','soul','compact'],         exp:[0,2,4,11],   n:{2:'9'}},
  {rs:6,suf:'m9', fam:'minor',  ext:'9',     f:[0,-2,0,-1,N,N],tags:['soul','jazz','bossa','compact'],         exp:[0,2,3,10],   n:{2:'9'}},
  {rs:6,suf:'m11',fam:'minor',  ext:'11',    f:[0,N,0,0,-2,N], tags:['soul','funk','compact'],         exp:[0,3,5,10],   n:{5:'11'},note:'Open, floating minor colour.'},
  {rs:6,suf:'13', fam:'dominant',ext:'13',   f:[0,N,0,1,2,N],  tags:['jazz','bossa','funk','compact'],         exp:[0,4,9,10],   n:{9:'13'},note:'Big-band and funk horn-section sound.'},
  {rs:6,suf:'7sus4',fam:'sus',  ext:'7',     f:[0,2,0,2,0,0],  tags:['funk','soul','rock','sus','barre'],exp:[0,5,7,10], n:{5:'4'}},
  {rs:6,suf:'7♯5',fam:'altered',ext:'7',     f:[0,N,0,1,1,N],  tags:['jazz','funk','altered','compact'],exp:[0,4,8,10]},
  {rs:6,suf:'7♯9',fam:'dominant',ext:'9',    f:[0,-1,0,0,N,N], tags:['funk','rock','blues','altered','compact'],exp:[0,3,4,10],n:{3:'♯9'},note:'The "Hendrix chord".'},
  {rs:6,suf:'m7♭5',fam:'altered',ext:'7',    f:[0,N,0,0,-1,N], tags:['jazz','bossa','compact'],                exp:[0,3,6,10],   n:{6:'♭5'}},

  // ---------- root on the 5th string (A) ----------
  {rs:5,suf:'',   fam:'major',   ext:'triad',f:[N,0,2,2,2,0],  tags:['rock','pop','barre'],            exp:[0,4,7],      note:'The classic A-shape barre chord.'},
  {rs:5,suf:'m',  fam:'minor',   ext:'triad',f:[N,0,2,2,1,0],  tags:['rock','pop','barre'],            exp:[0,3,7]},
  {rs:5,suf:'7',  fam:'dominant',ext:'7',    f:[N,0,2,0,2,0],  tags:['blues','rock','funk','barre'],   exp:[0,4,7,10]},
  {rs:5,suf:'maj7',fam:'major', ext:'7',     f:[N,0,2,1,2,0],  tags:['jazz','bossa','pop','soul','barre'],     exp:[0,4,7,11]},
  {rs:5,suf:'m7', fam:'minor',  ext:'7',     f:[N,0,2,0,1,0],  tags:['soul','funk','jazz','bossa','barre'],    exp:[0,3,7,10]},
  {rs:5,suf:'7',  v:'shell',fam:'dominant',ext:'7',f:[N,0,N,0,2,N],tags:['jazz','bossa','shell','compact'],    exp:[0,4,10]},
  {rs:5,suf:'maj7',v:'shell',fam:'major',ext:'7',f:[N,0,N,1,2,N],tags:['jazz','bossa','shell','compact'],      exp:[0,4,11]},
  {rs:5,suf:'m7', v:'shell',fam:'minor',ext:'7',f:[N,0,N,0,1,N],tags:['jazz','bossa','soul','shell','compact'],exp:[0,3,10]},
  {rs:5,suf:'9',  fam:'dominant',ext:'9',    f:[N,0,-1,0,0,N], tags:['funk','soul','jazz','compact'],  exp:[0,2,4,10],   n:{2:'9'},  note:'Compact 4-string 9th; great for rhythm chops.'},
  {rs:5,suf:'maj9',fam:'major', ext:'9',     f:[N,0,-1,1,0,N], tags:['jazz','bossa','soul','compact'],         exp:[0,2,4,11],   n:{2:'9'}},
  {rs:5,suf:'m9', fam:'minor',  ext:'9',     f:[N,0,-2,0,0,N], tags:['soul','jazz','bossa','compact'],         exp:[0,2,3,10],   n:{2:'9'}},
  {rs:5,suf:'m11',fam:'minor',  ext:'11',    f:[N,0,-2,0,N,-2],tags:['soul','funk','compact'],         exp:[0,3,5,10],   n:{5:'11'}},
  {rs:5,suf:'13', fam:'dominant',ext:'13',   f:[N,0,-1,0,N,2], tags:['jazz','bossa','funk','compact'],         exp:[0,4,9,10],   n:{9:'13'}},
  {rs:5,suf:'7sus4',fam:'sus',  ext:'7',     f:[N,0,2,0,3,0],  tags:['funk','soul','rock','sus','barre'],exp:[0,5,7,10], n:{5:'4'}},
  {rs:5,suf:'aug',fam:'altered',ext:'triad', f:[N,0,-1,-2,-2,N],tags:['jazz','altered','compact'],     exp:[0,4,8]},
  {rs:5,suf:'dim7',fam:'altered',ext:'7',     f:[N,0,1,-1,1,N], tags:['jazz','bossa','gospel','altered','compact'],exp:[0,3,6,9], n:{6:'♭5',9:'♭♭7'}},
  {rs:5,suf:'m7♭5',fam:'altered',ext:'7',    f:[N,0,1,0,1,N],  tags:['jazz','bossa','compact'],                exp:[0,3,6,10],   n:{6:'♭5'}},
  {rs:5,suf:'7♯9',fam:'dominant',ext:'9',    f:[N,0,-1,0,1,N], tags:['funk','rock','blues','altered','compact'],exp:[0,3,4,10],n:{3:'♯9'},note:'Same "Hendrix chord" shape, one string group over.'},
  {rs:5,suf:'7♭9',fam:'dominant',ext:'9',    f:[N,0,-1,0,-1,N],tags:['jazz','bossa','altered','compact'],      exp:[0,1,4,10],   n:{1:'♭9'}},

  // ---------- root on the 4th string (D) ----------
  {rs:4,suf:'',   fam:'major',   ext:'triad',f:[N,N,0,2,3,2],  tags:['rock','pop','compact'],          exp:[0,4,7]},
  {rs:4,suf:'m',  fam:'minor',   ext:'triad',f:[N,N,0,2,3,1],  tags:['rock','pop','compact'],          exp:[0,3,7]},
  {rs:4,suf:'7',  fam:'dominant',ext:'7',    f:[N,N,0,2,1,2],  tags:['blues','funk','rock','compact'], exp:[0,4,7,10]},
  {rs:4,suf:'maj7',fam:'major', ext:'7',     f:[N,N,0,2,2,2],  tags:['jazz','bossa','pop','compact'],          exp:[0,4,7,11]},
  {rs:4,suf:'m7', fam:'minor',  ext:'7',     f:[N,N,0,2,1,1],  tags:['soul','funk','jazz','bossa','compact'],  exp:[0,3,7,10]},
  {rs:4,suf:'9',  fam:'dominant',ext:'9',    f:[N,N,0,-1,1,0], tags:['funk','soul','jazz','compact'],  exp:[0,2,4,10],   n:{2:'9'}},
  {rs:4,suf:'maj9',fam:'major', ext:'9',     f:[N,N,0,-1,2,0], tags:['jazz','bossa','soul','compact'],         exp:[0,2,4,11],   n:{2:'9'}},
  {rs:4,suf:'m9', fam:'minor',  ext:'9',     f:[N,N,0,-2,1,0], tags:['soul','jazz','bossa','compact'],         exp:[0,2,3,10],   n:{2:'9'}},
  {rs:4,suf:'7sus4',fam:'sus',  ext:'7',     f:[N,N,0,2,1,3],  tags:['funk','soul','sus','compact'],   exp:[0,5,7,10],   n:{5:'4'}},
  {rs:4,suf:'aug',fam:'altered',ext:'triad', f:[N,N,0,3,3,2],  tags:['jazz','altered','compact'],      exp:[0,4,8]},
  {rs:4,suf:'dim7',fam:'altered',ext:'7',     f:[N,N,0,1,0,1],  tags:['jazz','bossa','gospel','altered','compact'],exp:[0,3,6,9], n:{6:'♭5',9:'♭♭7'}},
  {rs:4,suf:'m7♭5',fam:'altered',ext:'7',    f:[N,N,0,1,1,1],  tags:['jazz','bossa','compact'],                exp:[0,3,6,10],   n:{6:'♭5'}},
  {rs:4,suf:'7♯9',fam:'dominant',ext:'9',    f:[N,N,0,-1,1,1], tags:['funk','rock','altered','compact'],exp:[0,3,4,10],  n:{3:'♯9'}},

  // ---------- root on the 3rd string (G): small triads and shells up top ----------
  {rs:3,suf:'',   v:'triad',fam:'major',ext:'triad',f:[N,N,N,0,0,-2],tags:['pop','soul','funk','compact'],exp:[0,4,7],      note:'Tight, high triad for funk and soul comping.'},
  {rs:3,suf:'m',  v:'triad',fam:'minor',ext:'triad',f:[N,N,N,0,-1,-2],tags:['pop','soul','funk','compact'],exp:[0,3,7]},
  {rs:3,suf:'aug',v:'triad',fam:'altered',ext:'triad',f:[N,N,N,0,0,-1],tags:['jazz','altered','compact'],exp:[0,4,8]},
  {rs:3,suf:'dim',v:'triad',fam:'altered',ext:'triad',f:[N,N,N,0,-1,-3],tags:['jazz','altered','compact'],exp:[0,3,6],n:{6:'♭5'}},
  {rs:3,suf:'7',  v:'shell',fam:'dominant',ext:'7',f:[N,N,N,0,0,1],tags:['jazz','bossa','funk','shell','compact'],exp:[0,4,10]},
  {rs:3,suf:'maj7',v:'shell',fam:'major',ext:'7',f:[N,N,N,0,0,2],tags:['jazz','bossa','shell','compact'],exp:[0,4,11]},
  {rs:3,suf:'m7', v:'shell',fam:'minor',ext:'7',f:[N,N,N,0,-1,1],tags:['jazz','bossa','soul','shell','compact'],exp:[0,3,10]},

  // ---------- more common funk / jazz / bossa voicings ----------
  {rs:6,suf:'6',  fam:'major',ext:'6',f:[0,2,2,1,2,0],tags:['jazz','bossa','pop','barre'],exp:[0,4,7,9],n:{9:'6'}},
  {rs:6,suf:'m6', fam:'minor',ext:'6',f:[0,2,2,0,2,0],tags:['bossa','jazz','barre'],exp:[0,3,7,9],n:{9:'6'},note:'The bossa nova minor tonic.'},
  {rs:6,suf:'sus4',fam:'sus',ext:'triad',f:[0,2,2,2,0,0],tags:['rock','pop','sus','barre'],exp:[0,5,7],n:{5:'4'}},
  {rs:6,suf:'sus2',fam:'sus',ext:'triad',f:[0,2,4,4,0,0],tags:['rock','pop','sus','barre'],exp:[0,2,7],n:{2:'2'}},
  {rs:6,suf:'m(maj7)',fam:'minor',ext:'7',f:[0,2,1,0,0,0],tags:['jazz','bossa','barre'],exp:[0,3,7,11],note:'Dark minor-major colour.'},
  {rs:6,suf:'maj7',v:'drop 3',fam:'major',ext:'7',f:[0,N,1,1,0,N],tags:['jazz','bossa','compact'],exp:[0,4,7,11]},
  {rs:6,suf:'7',v:'drop 3',fam:'dominant',ext:'7',f:[0,N,0,1,0,N],tags:['jazz','bossa','funk','compact'],exp:[0,4,7,10]},
  {rs:6,suf:'m7',v:'drop 3',fam:'minor',ext:'7',f:[0,N,0,0,0,N],tags:['jazz','bossa','soul','compact'],exp:[0,3,7,10]},
  {rs:6,suf:'7♭9',fam:'dominant',ext:'9',f:[0,-1,0,-2,N,N],tags:['jazz','bossa','altered','compact'],exp:[0,1,4,10],n:{1:'♭9'}},

  {rs:5,suf:'6',  fam:'major',ext:'6',f:[N,0,2,2,2,2],tags:['jazz','bossa','pop','barre'],exp:[0,4,7,9],n:{9:'6'}},
  {rs:5,suf:'m6', fam:'minor',ext:'6',f:[N,0,2,2,1,2],tags:['bossa','jazz','barre'],exp:[0,3,7,9],n:{9:'6'}},
  {rs:5,suf:'6/9',fam:'major',ext:'6',f:[N,0,-1,-1,0,0],tags:['jazz','bossa','soul','compact'],exp:[0,2,4,7,9],n:{2:'9',9:'6'},note:'Classic final chord in jazz and bossa.'},
  {rs:5,suf:'sus4',fam:'sus',ext:'triad',f:[N,0,2,2,3,0],tags:['rock','pop','sus','barre'],exp:[0,5,7],n:{5:'4'}},
  {rs:5,suf:'sus2',fam:'sus',ext:'triad',f:[N,0,2,2,0,0],tags:['rock','pop','sus','barre'],exp:[0,2,7],n:{2:'2'}},
  {rs:5,suf:'9sus4',fam:'sus',ext:'9',f:[N,0,0,0,0,N],tags:['funk','soul','sus','compact'],exp:[0,2,5,10],n:{2:'9',5:'4'},note:'The x-3-3-3-3-x funk shape.'},
  {rs:5,suf:'maj7♯11',fam:'major',ext:'7',f:[N,0,-1,1,N,-1],tags:['jazz','bossa','compact'],exp:[0,4,6,11],n:{6:'♯11'},note:'Lydian colour on a major chord.'},
  {rs:5,suf:'7♯11',fam:'dominant',ext:'7',f:[N,0,-1,0,N,-1],tags:['jazz','bossa','compact'],exp:[0,4,6,10],n:{6:'♯11'}},
  {rs:5,suf:'13♭9',fam:'dominant',ext:'13',f:[N,0,-1,0,-1,2],tags:['jazz','bossa','altered','compact'],exp:[0,1,4,9,10],n:{1:'♭9',9:'13'}},
  {rs:5,suf:'m(maj7)',fam:'minor',ext:'7',f:[N,0,2,1,1,N],tags:['jazz','bossa','compact'],exp:[0,3,7,11]},
  {rs:5,suf:'maj7',v:'drop 3',fam:'major',ext:'7',f:[N,0,2,1,2,N],tags:['jazz','bossa','compact'],exp:[0,4,7,11]},
  {rs:5,suf:'7',v:'drop 3',fam:'dominant',ext:'7',f:[N,0,2,0,2,N],tags:['jazz','bossa','funk','compact'],exp:[0,4,7,10]},
  {rs:5,suf:'m7',v:'drop 3',fam:'minor',ext:'7',f:[N,0,2,0,1,N],tags:['jazz','bossa','soul','compact'],exp:[0,3,7,10]},

  {rs:4,suf:'sus2',fam:'sus',ext:'triad',f:[N,N,0,2,3,0],tags:['rock','pop','sus','compact'],exp:[0,2,7],n:{2:'2'}},
  {rs:4,suf:'sus4',fam:'sus',ext:'triad',f:[N,N,0,2,3,3],tags:['rock','pop','sus','compact'],exp:[0,5,7],n:{5:'4'}},
  {rs:4,suf:'6',  fam:'major',ext:'6',f:[N,N,0,2,0,2],tags:['jazz','bossa','pop','compact'],exp:[0,4,7,9],n:{9:'6'}},
  {rs:4,suf:'m6', fam:'minor',ext:'6',f:[N,N,0,2,0,1],tags:['bossa','jazz','compact'],exp:[0,3,7,9],n:{9:'6'}},
  {rs:4,suf:'m11',fam:'minor',ext:'11',f:[N,N,0,0,1,1],tags:['soul','funk','jazz','compact'],exp:[0,3,5,10],n:{5:'11'}},
  {rs:4,suf:'dim',fam:'altered',ext:'triad',f:[N,N,0,1,3,1],tags:['jazz','altered','compact'],exp:[0,3,6],n:{6:'♭5'}},

  // top four strings, root on the high e: the funk and soul stabs
  {rs:1,suf:'',   v:'triad',fam:'major',ext:'triad',f:[N,N,N,1,0,0],tags:['funk','soul','pop','compact'],exp:[0,4,7]},
  {rs:1,suf:'m',  v:'triad',fam:'minor',ext:'triad',f:[N,N,N,0,0,0],tags:['funk','soul','pop','compact'],exp:[0,3,7]},
  {rs:1,suf:'7',  v:'top 4',fam:'dominant',ext:'7',f:[N,N,0,1,0,0],tags:['funk','blues','soul','compact'],exp:[0,4,7,10],note:'Tight top-string stab.'},
  {rs:1,suf:'m7', v:'top 4',fam:'minor',ext:'7',f:[N,N,0,0,0,0],tags:['funk','soul','jazz','compact'],exp:[0,3,7,10],note:'Four-string barre, a funk staple.'},
  {rs:1,suf:'maj7',v:'top 4',fam:'major',ext:'7',f:[N,N,1,1,0,0],tags:['soul','jazz','pop','compact'],exp:[0,4,7,11]},
  {rs:1,suf:'m7♭5',v:'top 4',fam:'altered',ext:'7',f:[N,N,0,0,-1,0],tags:['jazz','compact'],exp:[0,3,6,10],n:{6:'♭5'}},
];
