import { DEGREE, GOLD, INK } from "./card";

/* The drawings on the public pages' link previews (card.tsx), one per page, each a 460×460 SVG. A little silly on
   purpose: a mouth in a scarf for voice care, a puzzled pick for the FAQ, a guitar taking off for the founding partners. */

const DARK = "#0f1115";
const WOOD = "#8a5a3b";
const RED = DEGREE[0];
const ORANGE = DEGREE[1];
const GREEN = DEGREE[3];
const BLUE = DEGREE[4];
const VIOLET = DEGREE[6];

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="460" height="460" viewBox="0 0 460 460" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
);

/** an eighth note, its head at (x, y) */
const note = ({ x, y, c, s = 1, r = 0 }: { x: number; y: number; c: string; s?: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <ellipse cx="0" cy="0" rx="13" ry="10" transform="rotate(-20)" fill={c} />
    <rect x="9" y="-56" width="5" height="56" fill={c} />
    <path d="M14 -56 C 22 -44, 36 -40, 32 -20 C 30 -32, 22 -36, 14 -38 Z" fill={c} />
  </g>
);

/** a quarter note, its head at (x, y) */
const quarter = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="0" rx="12" ry="9" transform="rotate(-20)" fill={c} />
    <rect x="8" y="-48" width="4" height="48" fill={c} />
  </g>
);

/** a question mark drawn in one stroke, about 50 tall at scale 1 */
const question = ({ x, y, c, s = 1, r = 0 }: { x: number; y: number; c: string; s?: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M-15 -18 C -15 -42, 18 -42, 18 -20 C 18 -6, 2 -4, 2 10" stroke={c} strokeWidth="9" strokeLinecap="round" fill="none" />
    <circle cx="2" cy="28" r="6" fill={c} />
  </g>
);

/** a four-pointed sparkle */
const star = ({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -14 C 2 -3, 3 -2, 14 0 C 3 2, 2 3, 0 14 C -2 3, -3 2, -14 0 C -3 -2, -2 -3, 0 -14 Z" fill={c} />
);

/** /learn: an open book in reading glasses, notes flying out of it */
export const BookArt = () => (
  <Svg>
    {note({ x: 120, y: 190, c: RED, s: 0.9, r: -15 })}
    {note({ x: 200, y: 120, c: ORANGE, s: 1.1, r: 8 })}
    {note({ x: 290, y: 80, c: GOLD, s: 0.8, r: -10 })}
    {note({ x: 340, y: 170, c: BLUE, s: 1, r: 12 })}
    {note({ x: 250, y: 215, c: GREEN, s: 0.7 })}
    {note({ x: 400, y: 110, c: VIOLET, s: 0.6, r: 20 })}
    {/* the cover, peeking out under the pages */}
    <path d="M230 300 C 170 268, 90 268, 22 292 L 22 432 C 90 410, 170 412, 230 444 C 290 412, 370 410, 438 432 L 438 292 C 370 268, 290 268, 230 300 Z" fill={BLUE} />
    <path d="M230 292 C 180 262, 104 260, 40 282 L 40 418 C 104 398, 180 400, 230 428 Z" fill={INK} />
    <path d="M230 292 C 280 262, 356 260, 420 282 L 420 418 C 356 398, 280 400, 230 428 Z" fill="#e4e0d8" />
    {/* lines of text */}
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <path d={`M70 ${392 + i * 9} C 120 ${380 + i * 9}, 170 ${382 + i * 9}, 210 ${400 + i * 9}`} stroke="#b9b4aa" strokeWidth="3" fill="none" />
        <path d={`M250 ${400 + i * 9} C 290 ${382 + i * 9}, 340 ${380 + i * 9}, 390 ${392 + i * 9}`} stroke="#b9b4aa" strokeWidth="3" fill="none" />
      </g>
    ))}
    {/* the glasses and the eyes behind them */}
    <circle cx="160" cy="336" r="34" fill="#ffffff" stroke={DARK} strokeWidth="7" />
    <circle cx="300" cy="336" r="34" fill="#ffffff" stroke={DARK} strokeWidth="7" />
    <path d="M194 330 C 210 318, 250 318, 266 330" stroke={DARK} strokeWidth="7" fill="none" />
    <circle cx="170" cy="326" r="11" fill={DARK} />
    <circle cx="310" cy="326" r="11" fill={DARK} />
    <circle cx="174" cy="322" r="4" fill="#ffffff" />
    <circle cx="314" cy="322" r="4" fill="#ffffff" />
  </Svg>
);

/** /voice-care: a singing mouth wrapped in a scarf, a cup of tea beside it */
export const MouthArt = () => (
  <Svg>
    <defs>
      <clipPath id="inside">
        <path d="M100 205 C 150 168, 310 168, 360 205 C 330 300, 130 300, 100 205 Z" />
      </clipPath>
    </defs>
    {note({ x: 90, y: 110, c: GOLD, s: 0.9, r: -12 })}
    {note({ x: 190, y: 70, c: GREEN, s: 1.1, r: 6 })}
    {note({ x: 310, y: 60, c: BLUE, s: 0.8, r: -8 })}
    {note({ x: 390, y: 120, c: VIOLET, s: 0.7, r: 15 })}
    {/* lips */}
    <path d="M50 205 C 100 120, 190 122, 230 152 C 270 122, 360 120, 410 205 C 370 345, 90 345, 50 205 Z" fill={RED} />
    {/* inside the mouth: tongue and top teeth */}
    <path d="M100 205 C 150 168, 310 168, 360 205 C 330 300, 130 300, 100 205 Z" fill="#3a0d14" />
    <g clipPath="url(#inside)">
      <ellipse cx="230" cy="290" rx="95" ry="45" fill="#f08ca0" />
      <path d="M230 258 L 230 285" stroke="#d76f86" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 170 L 360 170 L 360 200 C 300 190, 160 190, 100 200 Z" fill="#ffffff" />
      <path d="M230 172 L 230 196" stroke="#d8d2c8" strokeWidth="3" />
    </g>
    {/* the shine on the lip */}
    <path d="M120 160 C 140 145, 165 140, 185 142" stroke="#ff8f93" strokeWidth="7" strokeLinecap="round" fill="none" />
    {/* the scarf: a wrap and a hanging end, striped */}
    <path d="M70 330 C 150 365, 310 365, 390 330 L 396 380 C 310 414, 150 414, 64 380 Z" fill={GOLD} />
    {[110, 170, 230, 290, 350].map((x) => (
      <path key={x} d={`M${x} ${340 + (x === 230 ? 12 : x === 170 || x === 290 ? 9 : 2)} l 0 48`} stroke={ORANGE} strokeWidth="14" />
    ))}
    <path d="M110 388 L 90 444 L 134 444 L 150 395 Z" fill={GOLD} />
    <path d="M100 418 L 142 418" stroke={ORANGE} strokeWidth="12" />
    {/* tea */}
    <path d="M356 404 L 436 404 L 430 456 L 362 456 Z" fill={BLUE} />
    <path d="M436 416 C 458 416, 458 444, 432 442" stroke={BLUE} strokeWidth="7" fill="none" />
    <path d="M380 396 C 370 382, 392 376, 382 360" stroke="#d8d2c8" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M408 396 C 398 382, 420 376, 410 360" stroke="#d8d2c8" strokeWidth="5" strokeLinecap="round" fill="none" />
  </Svg>
);

/** /faq: a guitar pick, puzzled, under question marks */
export const PickArt = () => (
  <Svg>
    {question({ x: 42, y: 150, c: RED, s: 1.1, r: -15 })}
    {question({ x: 395, y: 90, c: BLUE, s: 1.6, r: 12 })}
    {question({ x: 410, y: 300, c: GREEN, s: 0.9, r: 20 })}
    {question({ x: 50, y: 320, c: VIOLET, s: 0.8, r: -20 })}
    <path d="M230 80 C 340 80, 395 120, 385 200 C 375 290, 290 385, 230 430 C 170 385, 85 290, 75 200 C 65 120, 120 80, 230 80 Z" fill={GOLD} />
    <path d="M140 120 C 170 100, 200 96, 225 98" stroke="#f5d77a" strokeWidth="10" strokeLinecap="round" fill="none" />
    {/* one brow up, one down */}
    <path d="M150 168 C 165 150, 190 146, 205 152" stroke={DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M258 170 C 275 170, 295 174, 312 180" stroke={DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
    {/* eyes looking up and away */}
    <ellipse cx="180" cy="210" rx="28" ry="32" fill="#ffffff" />
    <ellipse cx="282" cy="214" rx="28" ry="32" fill="#ffffff" />
    <circle cx="192" cy="198" r="12" fill={DARK} />
    <circle cx="294" cy="202" r="12" fill={DARK} />
    {/* hmm */}
    <path d="M200 300 C 215 290, 225 310, 240 298 C 252 290, 260 302, 268 296" stroke={DARK} strokeWidth="8" strokeLinecap="round" fill="none" />
  </Svg>
);

/** /schools: a chalkboard with a tune on it, an apple on top, three picks in the front row */
export const ChalkboardArt = () => (
  <Svg>
    <rect x="30" y="60" width="400" height="250" rx="12" fill={WOOD} />
    <rect x="46" y="76" width="368" height="218" rx="6" fill="#1f3b2d" />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M70 ${130 + i * 18} L 390 ${128 + i * 18}`} stroke="#cfd8cf" strokeOpacity="0.7" strokeWidth="3" />
    ))}
    {/* a chalk treble clef, loosely */}
    <path d="M100 222 C 80 214, 82 186, 104 184 C 124 184, 126 210, 106 214 C 90 216, 88 196, 100 196 M104 238 L 104 112 C 104 96, 124 100, 116 126 C 106 150, 80 160, 82 190" stroke="#e9efe9" strokeWidth="4" fill="none" strokeLinecap="round" />
    {quarter({ x: 160, y: 193, c: RED })}
    {quarter({ x: 210, y: 184, c: ORANGE })}
    {quarter({ x: 260, y: 175, c: GOLD })}
    {quarter({ x: 310, y: 166, c: GREEN })}
    {quarter({ x: 360, y: 157, c: BLUE })}
    {/* chalk on the ledge */}
    <rect x="300" y="300" width="40" height="9" rx="4" fill="#ffffff" />
    {/* the apple */}
    <circle cx="372" cy="40" r="26" fill={RED} />
    <circle cx="392" cy="40" r="24" fill={RED} />
    <path d="M382 18 C 382 10, 386 4, 390 0" stroke={WOOD} strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M388 10 C 400 -2, 414 4, 416 8 C 404 16, 394 14, 388 10 Z" fill={GREEN} />
    <path d="M362 28 C 366 22, 372 20, 378 20" stroke="#ff8f93" strokeWidth="5" strokeLinecap="round" fill="none" />
    {/* the front row */}
    {[
      { x: 100, c: VIOLET },
      { x: 230, c: BLUE },
      { x: 360, c: ORANGE },
    ].map(({ x, c }) => (
      <g key={x} transform={`translate(${x} 336)`}>
        <path d="M0 0 C 50 0, 72 18, 68 50 C 62 82, 30 104, 0 118 C -30 104, -62 82, -68 50 C -72 18, -50 0, 0 0 Z" fill={c} />
        <circle cx="-20" cy="40" r="13" fill="#ffffff" />
        <circle cx="20" cy="40" r="13" fill="#ffffff" />
        <circle cx="-18" cy="34" r="6" fill={DARK} />
        <circle cx="22" cy="34" r="6" fill={DARK} />
        <path d="M-12 72 C -4 80, 4 80, 12 72" stroke={DARK} strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
    ))}
  </Svg>
);

/** /kickstarter: a guitar taking off like a rocket */
export const RocketArt = () => (
  <Svg>
    {star({ x: 60, y: 70, c: GOLD, s: 1.2 })}
    {star({ x: 390, y: 60, c: INK, s: 0.8 })}
    {star({ x: 420, y: 250, c: BLUE, s: 1 })}
    {star({ x: 110, y: 230, c: VIOLET, s: 0.7 })}
    {star({ x: 300, y: 420, c: GOLD, s: 0.6 })}
    <circle cx="180" cy="40" r="4" fill={INK} />
    <circle cx="420" cy="380" r="4" fill={INK} />
    <circle cx="40" cy="300" r="3" fill={INK} />
    <g transform="translate(236 236) rotate(40) scale(0.8) translate(-230 -230)">
      {/* flames out of the bottom of the body */}
      <path d="M180 380 C 160 440, 196 480, 230 510 C 264 480, 300 440, 280 380 Z" fill={RED} />
      <path d="M198 380 C 186 430, 210 458, 230 478 C 250 458, 274 430, 262 380 Z" fill={ORANGE} />
      <path d="M212 380 C 206 414, 220 432, 230 446 C 240 432, 254 414, 248 380 Z" fill={GOLD} />
      {/* speed lines */}
      <path d="M140 410 L 140 480" stroke="#6b7180" strokeWidth="6" strokeLinecap="round" />
      <path d="M320 410 L 320 470" stroke="#6b7180" strokeWidth="6" strokeLinecap="round" />
      <path d="M110 360 L 110 410" stroke="#6b7180" strokeWidth="6" strokeLinecap="round" />
      {/* the neck and headstock */}
      <rect x="216" y="40" width="28" height="200" fill={WOOD} />
      {[70, 100, 128, 154, 178, 200, 220].map((y) => (
        <rect key={y} x="216" y={y} width="28" height="3" fill="#d8d2c8" />
      ))}
      <path d="M208 -8 L 252 -8 L 248 44 L 212 44 Z" fill="#5a3a26" />
      {[2, 16, 30].map((y) => (
        <g key={y}>
          <circle cx="200" cy={y} r="7" fill="#d8d2c8" />
          <circle cx="260" cy={y} r="7" fill="#d8d2c8" />
        </g>
      ))}
      {/* the body: two bouts and the soundhole */}
      <ellipse cx="230" cy="260" rx="78" ry="62" fill={ORANGE} />
      <ellipse cx="230" cy="330" rx="98" ry="70" fill={ORANGE} />
      <circle cx="230" cy="285" r="26" fill={DARK} />
      <circle cx="230" cy="285" r="32" stroke={GOLD} strokeWidth="4" fill="none" />
      <rect x="200" y="340" width="60" height="12" rx="4" fill="#5a3a26" />
      {[221, 227, 233, 239].map((x) => (
        <rect key={x} x={x} y="40" width="2" height="306" fill="#ece6da" />
      ))}
    </g>
  </Svg>
);

/** /demo: a week on a calendar page, a dot for each day, a guitar leaning on it */
export const CalendarArt = () => (
  <Svg>
    <rect x="10" y="90" width="320" height="290" rx="20" fill={INK} />
    <path d="M10 110 C 10 99, 19 90, 30 90 L 310 90 C 321 90, 330 99, 330 110 L 330 160 L 10 160 Z" fill={RED} />
    {[90, 250].map((x) => (
      <g key={x}>
        <rect x={x - 9} y="66" width="18" height="50" rx="9" fill="#6b7180" />
        <circle cx={x} cy="125" r="8" fill="#8f1d22" />
      </g>
    ))}
    {DEGREE.map((c, i) => {
      const x = 52 + (i % 4) * 78;
      const y = 215 + Math.floor(i / 4) * 92;
      return (
        <g key={c}>
          <rect x={x - 30} y={y - 30} width="60" height="60" rx="10" fill="#e4e0d8" />
          <circle cx={x} cy={y} r="19" fill={c} />
        </g>
      );
    })}
    {/* the guitar standing beside the page, singing */}
    <g transform="rotate(-8 392 440)">
      <rect x="382" y="150" width="20" height="180" fill={WOOD} />
      {[180, 210, 238, 264, 288, 310].map((y) => (
        <rect key={y} x="382" y={y} width="20" height="3" fill="#d8d2c8" />
      ))}
      <path d="M376 112 L 408 112 L 404 154 L 380 154 Z" fill="#5a3a26" />
      <ellipse cx="392" cy="345" rx="40" ry="34" fill={GOLD} />
      <ellipse cx="392" cy="405" rx="52" ry="44" fill={GOLD} />
      <circle cx="376" cy="342" r="9" fill="#ffffff" />
      <circle cx="408" cy="342" r="9" fill="#ffffff" />
      <circle cx="378" cy="339" r="4.5" fill={DARK} />
      <circle cx="410" cy="339" r="4.5" fill={DARK} />
      <ellipse cx="392" cy="398" rx="16" ry="19" fill={DARK} />
      <path d="M382 406 C 388 412, 396 412, 402 406" stroke="#f08ca0" strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
    {note({ x: 360, y: 80, c: BLUE, s: 0.7, r: 10 })}
    {note({ x: 425, y: 130, c: VIOLET, s: 0.55, r: -10 })}
  </Svg>
);

/** /terms: a scroll of small print, a quill and a seal with a note on it */
export const ScrollArt = () => (
  <Svg>
    <rect x="90" y="70" width="280" height="330" fill="#efe6d2" />
    <rect x="70" y="50" width="320" height="40" rx="20" fill="#d9caa8" />
    <rect x="70" y="380" width="320" height="40" rx="20" fill="#d9caa8" />
    <circle cx="70" cy="70" r="20" fill="#c4b38c" />
    <circle cx="390" cy="400" r="20" fill="#c4b38c" />
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <path key={i} d={`M120 ${120 + i * 26} C 160 ${112 + i * 26}, 200 ${128 + i * 26}, 240 ${120 + i * 26} S 310 ${112 + i * 26}, ${i === 8 ? 260 : 340} ${120 + i * 26}`} stroke="#8c8574" strokeWidth="4" fill="none" strokeLinecap="round" />
    ))}
    {/* the seal */}
    <circle cx="300" cy="330" r="34" fill={RED} />
    <circle cx="300" cy="330" r="26" stroke="#8f1d22" strokeWidth="3" fill="none" />
    {note({ x: 295, y: 345, c: "#8f1d22", s: 0.55 })}
    {/* the quill */}
    <g transform="translate(-34 30) rotate(35 380 160) scale(0.9)">
      <path d="M380 20 C 420 70, 420 170, 384 260 L 376 260 C 350 170, 350 70, 380 20 Z" fill={BLUE} />
      <path d="M380 30 L 380 290" stroke="#d8d2c8" strokeWidth="4" />
      <path d="M376 290 L 384 290 L 380 310 Z" fill={DARK} />
    </g>
  </Svg>
);

/** /privacy: a padlock keeping quiet, a note for its key */
export const PadlockArt = () => (
  <Svg>
    <path d="M140 200 L 140 140 C 140 60, 320 60, 320 140 L 320 200" stroke="#9aa0ab" strokeWidth="34" fill="none" />
    <rect x="80" y="190" width="300" height="240" rx="36" fill={GOLD} />
    <path d="M110 220 L 350 220" stroke="#f5d77a" strokeWidth="8" strokeLinecap="round" />
    {/* eyes closed, a finger to the lips */}
    <path d="M150 290 C 165 304, 185 304, 200 290" stroke={DARK} strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M260 290 C 275 304, 295 304, 310 290" stroke={DARK} strokeWidth="8" strokeLinecap="round" fill="none" />
    <ellipse cx="230" cy="365" rx="34" ry="12" fill={DARK} />
    <rect x="218" y="320" width="24" height="76" rx="12" fill={ORANGE} />
    <path d="M100 340 C 108 348, 120 348, 128 340" stroke={RED} strokeOpacity="0.5" strokeWidth="10" strokeLinecap="round" fill="none" />
    <path d="M332 340 C 340 348, 352 348, 360 340" stroke={RED} strokeOpacity="0.5" strokeWidth="10" strokeLinecap="round" fill="none" />
    {/* the key, a note on a ring */}
    <g transform="rotate(-25 400 80)">
      <circle cx="400" cy="60" r="22" stroke={BLUE} strokeWidth="9" fill="none" />
      <rect x="396" y="80" width="9" height="70" fill={BLUE} />
      <ellipse cx="390" cy="150" rx="18" ry="13" transform="rotate(-20 390 150)" fill={BLUE} />
    </g>
    {star({ x: 60, y: 110, c: VIOLET, s: 0.8 })}
    {star({ x: 420, y: 420, c: GREEN, s: 0.7 })}
  </Svg>
);
