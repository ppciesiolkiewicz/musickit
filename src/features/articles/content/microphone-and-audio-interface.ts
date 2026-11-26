import type { Article } from "../model";

export const microphoneAndAudioInterface: Article = {
  slug: "microphone-and-audio-interface-for-singing",
  title: "A microphone and audio interface for singing practice",
  metaTitle: "Best Beginner Microphone and Audio Interface for Singing Practice · attunr",
  description: "What to buy if you want a better sound for singing practice: a Shure SM58, a Focusrite Scarlett Solo or 2i2, and why direct monitoring matters.",
  intro: "You don't need any of this to start. But if you're wondering what to buy, here's a simple setup that's hard to go wrong with.",
  updated: "2026-11-26",
  sings: false,
  blocks: [
    { type: "p", text: "First, the good news: your laptop's or phone's microphone is enough to practice pitch on attunr. It hears your note, and that's all the exercises need." },
    { type: "p", text: "A real mic and an audio interface are for when you want more: a cleaner sound, hearing yourself in headphones, recording a song. If that's you, this is a setup lots of beginners start with. There are plenty of other good options to explore. These two are just a safe place to start." },
    { type: "p", text: "Nobody paid for this page, and none of the links earn us anything." },

    { type: "h2", text: "The microphone: Shure SM58" },
    { type: "p", text: "The SM58 is probably the most popular vocal mic there is. That's the main reason to pick it: you'll find one in almost every rehearsal room and on most small stages, so what you learn on it at home works the same when you sing anywhere else." },
    { type: "list", items: [
      "It's a dynamic mic, so it hears what's right in front of it and not much of the room. Handy at home, where the room isn't built for recording.",
      "It's famously tough. Drop it, and it usually keeps working.",
      "It needs no phantom power, the extra power some mics take from the interface.",
      "It plugs in with an XLR cable, the round three-pin one. Check one comes in the box, or buy one with it.",
    ] },
    { type: "p", text: "Sing close to it, about two fingers' width from the grille. Further away, it hears much less of you." },

    { type: "h2", text: "The audio interface: Focusrite Scarlett Solo or 2i2" },
    { type: "p", text: "An audio interface is the little box between the mic and your computer. The mic plugs into it, it plugs into your computer over USB, and your headphones plug into it too." },
    { type: "list", items: [
      "**Scarlett Solo** if it's just you and the mic. It has one input for a mic and one for a guitar.",
      "**Scarlett 2i2** if you want to plug in more than one thing at once: a mic and a guitar, say, or two mics for a duet.",
    ] },
    { type: "p", text: "The 4th generation was the newest we could find when we wrote this. An older one works fine too, if you find one second-hand." },

    { type: "h2", text: "Why direct monitoring matters for singing" },
    { type: "p", text: "Both Scarletts have a **Direct Monitor** button. With it on, you hear your own voice in your headphones straight from the interface, with no delay." },
    { type: "p", text: "That matters more for singing than for anything else. Without it, your voice goes into the computer and comes back out a moment late. Even a tiny delay is strangely hard to sing against: you start chasing your own echo, and your pitch wobbles. With direct monitoring you hear yourself the moment you sing, so you can hear exactly where your note lands." },
    { type: "p", text: "One tip: use closed headphones, the kind that cover your ears. Then the mic hears your voice, not the drone or the backing track leaking out of them." },

    { type: "h2", text: "Putting it together" },
    { type: "list", items: [
      "Plug the SM58 into the interface's first input with the XLR cable.",
      "Plug the interface into your computer, and your headphones into the interface.",
      "Turn on Direct Monitor.",
      "Sing a steady note and turn the input's gain knob up until the light around it goes green when you sing, and never red.",
    ] },
    { type: "p", text: "Then put it to work: try the [pitch matching exercises](/learn/pitch-matching-exercises), after a quick [warm-up](/learn/vocal-warm-ups)." },
  ],
};
