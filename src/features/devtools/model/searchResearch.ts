/**
 * Who ranks on Google for what each persona searches (task NEW21 in tasks.txt), for /admin/dev/search. Read from a US-only
 * web search and the free Ahrefs traffic checker by hand; no tool fills it. Change it here when a search is checked again.
 */

export const SEARCH_CHECKED = "2026-11-26";

export type Persona = "Guitarist" | "Singer" | "Teacher";

/** How hard a search looks to rank for, from who holds the first page. */
export type Difficulty = "Very hard" | "Hard" | "Medium" | "Easy";

export interface SearchRow {
  persona: Persona;
  query: string;
  /** the sites on the first page, strongest first */
  ranking: string;
  /** the kind of page that wins */
  wins: string;
  difficulty: Difficulty;
  /** how hard it looks and whether attunr has something the winners don't */
  note: string;
  /** a top-ranking page, to check in the Ahrefs traffic checker */
  page?: string;
}

export const SEARCHES: SearchRow[] = [
  { persona: "Guitarist", query: "what should I practice on guitar each day", ranking: "Fender, Guitar World, MusicRadar, TrueFire, Guitar Tricks, D'Addario, MI", wins: "Long tip lists: warm-up, technique, songs, theory", difficulty: "Very hard", note: "Big brands, many near-identical articles.", page: "https://www.fender.com/articles/techniques/how-much-should-i-practice" },
  { persona: "Guitarist", query: "stuck on guitar / guitar plateau", ranking: "Guitar World, TrueFire (several posts), Musicnotes, Fachords, Pickup Music", wins: "\"Why you're stuck\" lists", difficulty: "Hard", note: "The same set of sites.", page: "https://www.guitarworld.com/lessons/how-to-overcome-plateaus-in-your-guitar-practice" },
  { persona: "Guitarist", query: "how to learn CAGED on the fretboard", ranking: "Guitar World, Premier Guitar, MusicRadar, TrueFire, Gibson, Fender Play, Udemy", wins: "Shape-by-shape text with static diagrams", difficulty: "Hard", note: "A gap: no result lets you play the shapes on a neck.", page: "https://www.guitarworld.com/lessons/learn-the-caged-guitar-system-in-10-minutes" },
  { persona: "Guitarist", query: "which chords go together in a key", ranking: "Guitar Chalk, small blogs, Fender, JustinGuitar, Yousician, MusicRadar", wins: "Short theory explainers on keys and chord numbers", difficulty: "Medium", note: "More small sites rank, so a better page can get in.", page: "https://www.guitarchalk.com/which-guitar-chords-go-together/" },
  { persona: "Singer", query: "how to sing in tune", ranking: "Musical U (about five results), Singing Carrots, StarNow, Mandy, Music Grotto, Berklee", wins: "Tip lists; one says to record yourself and listen back", difficulty: "Medium", note: "Musical U holds most of it, the rest are general sites.", page: "https://www.musical-u.com/learn/how-to-learn-to-sing-in-tune/" },
  { persona: "Singer", query: "pitch trainer that doesn't record me", ranking: "App Store pages only: jAMSKOOL Sing Trainer, OnPitch, SingTrue, PitchMonitorPro", wins: "App pages; jAMSKOOL says it uploads and records nothing", difficulty: "Easy", note: "No article ranks, but at least one app says the same thing." },
  { persona: "Singer", query: "am I tone deaf test", ranking: "Musical U (3 pages), Harvard Health, NIH, Classic FM quiz, Kent Taml vocal academy", wins: "Tests you can take on the page; articles about tests rank lower", difficulty: "Medium", note: "Strong fit: a short same-or-different test is a tool page.", page: "https://www.musical-u.com/learn/tone-deaf-tests-online/" },
  { persona: "Singer", query: "how to find my vocal range", ranking: "MI, MasterClass, Musicnotes, Yousician, School of Rock, Singing Carrots, Omni Calculator", wins: "Step-by-step articles, plus two tools (Singing Carrots' range test, Omni's calculator)", difficulty: "Medium", note: "Strong fit: sing low and high, see the notes. Tools already rank among big brands.", page: "https://yousician.com/blog/vocal-range" },
  { persona: "Singer", query: "pitch matching exercises for singers", ranking: "Dummies, Soundbrenner, an open textbook (pressbooks), Singing Carrots, Musical U", wins: "Lists of exercises with no sound", difficulty: "Easy", note: "Weak field: nobody plays the note and listens back on the page.", page: "https://www.soundbrenner.com/blogs/articles/pitch-training-for-singers-simple-daily-exercises" },
  { persona: "Singer", query: "vocal warm ups for beginners", ranking: "Singing Carrots, School of Rock, Soundfly, Dummies, Singing Success, 30 Day Singer, Udemy", wins: "Lists of exercises, often with a video", difficulty: "Hard", note: "Lots of rivals, but fits /voice-care.", page: "https://www.schoolofrock.com/resources/vocals/9-best-vocal-warm-ups-for-singers" },
  { persona: "Singer", query: "best app to learn to sing in tune", ranking: "App Store pages (SingTrue, Voice Training, Sing Sharp, Pitch Yogi), Musical U's SingTrue page", wins: "App listings, no comparison articles", difficulty: "Medium", note: "A buyer's search: an honest comparison with attunr in it could rank.", page: "https://www.musical-u.com/apps/singtrue" },
  { persona: "Singer", query: "ear training for singers intervals", ranking: "Musical U (about five pages), Backstage, open textbooks, Udemy", wins: "Long guides", difficulty: "Hard", note: "Musical U owns it, though its whole site is ~32K visits a month." },
  { persona: "Teacher", query: "how to get students to practice between lessons", ranking: "Yamaha Hub, MakeMusic, Alfred, tonebase, Connolly, one dev.to post", wins: "Teacher-tips articles, each selling its own product", difficulty: "Medium", note: "Mostly sellers' blogs, few strong ones.", page: "https://www.tonebase.co/guitar-blog-posts/how-to-get-your-students-to-practice" },
  { persona: "Teacher", query: "how to send lesson notes", ranking: "App Store pages (LessonKeeper, Music Lesson NotePad), My Music Staff, a Zapier template", wins: "Product pages", difficulty: "Easy", note: "Hardly any articles, and a buyer's search." },
];

/** Whole-site visits a month from the free Ahrefs traffic checker: it showed the root domain for every page URL given. */
export interface SiteTraffic {
  site: string;
  visits: string;
  trend: string;
}

export const SITE_TRAFFIC_MONTH = "October 2026";

export const SITE_TRAFFIC: SiteTraffic[] = [
  { site: "fender.com", visits: "2.4M", trend: "Flat, about 2.1–2.8M since May" },
  { site: "guitarworld.com", visits: "799K", trend: "Falling, down from about 1.3M in May" },
  { site: "tonebase.co", visits: "38.6K", trend: "Flat, dipped in October" },
  { site: "musical-u.com", visits: "32.3K", trend: "Falling, down from about 55K in May" },
];

/** Phrases to put into the Ahrefs keyword generator for how many people search them. */
export const PHRASES_TO_CHECK: Record<Persona, string[]> = {
  Guitarist: ["what should I practice on guitar", "guitar plateau", "caged system", "chords in a key"],
  Singer: ["how to sing in tune", "am I tone deaf", "tone deaf test", "vocal range test", "how to find my vocal range", "pitch matching exercises", "pitch training app", "vocal warm ups", "ear training for singers", "singing app free"],
  Teacher: ["how to get students to practice", "music lesson notes app"],
};

export const TOOLS = [
  { label: "Ahrefs traffic checker", url: "https://ahrefs.com/traffic-checker", note: "One site's traffic. Free; it gave the root domain for page URLs." },
  { label: "Ahrefs keyword generator", url: "https://ahrefs.com/keyword-generator", note: "How many people search a phrase. Free." },
  { label: "Google Keyword Planner", url: "https://ads.google.com/home/tools/keyword-planner/", note: "Search ranges for Australia. Free with a Google Ads account." },
  { label: "Keywords Everywhere", url: "https://keywordseverywhere.com/", note: "Browser add-on paid by credits; the cheapest paid option." },
];

export const SITES_CHECKED = "2026-11-26";

/** What a singing app or course publishes, from its sitemap.xml. */
export interface SiteSitemap {
  site: string;
  pages: string;
  what: string;
}

export const SINGING_SITES: SiteSitemap[] = [
  { site: "Singing Carrots", pages: "~80,000+", what: "Almost all built from templates: a page per song's vocal range (~60K), per singer's range, \"learn to sing like <artist>\", \"did they take singing lessons\" (2,700), a range page for each note span (/vocal-range/D2-C#6, 903), exercises in each range and scale (4,400), songs for each voice type, and singing teachers by city (2,500). About 30 free tools: range test, pitch test, pitch monitor (in ~50 languages), song key finder, mic test, spectrogram, sustain training." },
  { site: "Musical U", pages: "1,700", what: "About 220 singing articles under /learn: tone deafness, singing in tune, solfa, perfect pitch, harmony, choir. Free tools: a tone deaf test app, SingTrue, interval exercises, an ear training quiz, a \"learn to sing\" roadmap." },
  { site: "30 Day Singer", pages: "570", what: "370 lesson pages (/tutorial/…), one technique or style each, often split by voice (\"daily intonation practice for high voices\", \"chest voice workout for bass and low baritone\", \"sing like Ella\"). 170 blog posts on voice types, registers, pitch matching, warm-ups." },
  { site: "Singing Success", pages: "200", what: "A coach's blog: voice health, confidence, careers. Little to copy." },
  { site: "Yousician", pages: "420", what: "Singing is thin: ~60 \"new song for … and singing\" posts, plus /blog/vocal-range, /blog/singing-app and /blog/online-singing-lessons." },
  { site: "Simply Sing", pages: "1", what: "One product page." },
];

/** Pages attunr could make for singers, best first, from what the sites above rank with. */
export interface Idea {
  title: string;
  why: string;
}

export const SINGING_IDEAS: Idea[] = [
  { title: "Vocal range test", why: "Sing your lowest and highest note, see the notes and the voice type. Singing Carrots' /range-test and its 900 range pages are its centre. A small tool, and range is a search of its own." },
  { title: "Tone deaf test", why: "A short same-or-different listening test, with a note that most people who sing out of tune aren't tone deaf. Musical U has a whole app and three articles for this one search." },
  { title: "Free pitch monitor or pitch matching page", why: "Sing and see your note live, nothing recorded. Singing Carrots spreads its pitch monitor over ~50 languages. attunr's \"doesn't record you\" fits here." },
  { title: "Exercises for each voice type", why: "\"Pitch matching for high voices\", \"warm-up for low voices\", as 30 Day Singer splits its lessons. Each is an attunr exercise with a short text: a few templated pages, not many articles." },
  { title: "\"How to sing in tune\": one strong article", why: "Links to the three tools above, as Musical U's roadmap does. One article, not 200." },
  { title: "Vowel and warm-up pages next to /voice-care", why: "The gentle-voice topics Singing Carrots and 30 Day Singer rank with." },
];

/** Seen on the sites above and left out, with why. */
export const NOT_TO_COPY: string[] = [
  "Song and artist range pages (Singing Carrots' ~60K): need a song database and raise licensing questions.",
  "Singing teachers by city: needs a teacher directory.",
];
