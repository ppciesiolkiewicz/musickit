/**
 * Well-known recordings in a given mode and key, so a scale page can say "you have heard this one". Keyed like ICONIC ("family-mode"),
 * then by tonic pitch class. Keys are the original recordings' (concert pitch); only songs whose key is widely agreed are listed.
 * Pure data. A key with no entry shows nothing.
 */
import type { KeyContext } from "./theory";

export interface SongInKey {
  title: string;
  artist: string;
}

const s = (title: string, artist: string): SongInKey => ({ title, artist });

export const SONGS_IN_KEY: Record<string, Partial<Record<number, SongInKey[]>>> = {
  // major
  "0-0": {
    0: [s("Let It Be", "The Beatles"), s("Imagine", "John Lennon"), s("Lean on Me", "Bill Withers")],
    1: [s("Clair de Lune", "Claude Debussy")],
    2: [s("Canon in D", "Johann Pachelbel"), s("Thinking Out Loud", "Ed Sheeran")],
    3: [s("Your Song", "Elton John")],
    4: [s("Don't Stop Believin'", "Journey")],
    5: [s("Hey Jude", "The Beatles")],
    7: [s("Brown Eyed Girl", "Van Morrison"), s("Good Riddance (Time of Your Life)", "Green Day")],
    8: [s("Viva la Vida", "Coldplay")],
    9: [s("Here Comes the Sun", "The Beatles"), s("Someone Like You", "Adele")],
    11: [s("Sir Duke", "Stevie Wonder")],
  },
  // Dorian
  "0-1": {
    2: [s("So What", "Miles Davis")],
    4: [s("Scarborough Fair", "Simon & Garfunkel")],
    9: [s("Oye Como Va", "Santana")],
  },
  // Mixolydian
  "0-4": {
    2: [s("Sweet Home Alabama", "Lynyrd Skynyrd")],
    4: [s("Norwegian Wood", "The Beatles")],
  },
  // natural minor
  "0-5": {
    0: [s("Symphony No. 5", "Ludwig van Beethoven")],
    1: [s("Moonlight Sonata", "Ludwig van Beethoven"), s("Shape of You", "Ed Sheeran")],
    2: [s("Toccata and Fugue in D minor", "J. S. Bach")],
    3: [s("Superstition", "Stevie Wonder")],
    4: [s("Zombie", "The Cranberries")],
    5: [s("Smells Like Teen Spirit", "Nirvana")],
    7: [s("Symphony No. 40", "W. A. Mozart")],
    9: [s("Stairway to Heaven", "Led Zeppelin"), s("Losing My Religion", "R.E.M.")],
    11: [s("Hotel California", "Eagles")],
  },
};

export const songsFor = (ctx: KeyContext): SongInKey[] => SONGS_IN_KEY[`${ctx.familyIndex}-${ctx.modeIndex}`]?.[ctx.tonic.pc] ?? [];
