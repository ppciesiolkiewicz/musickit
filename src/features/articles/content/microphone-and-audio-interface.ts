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
    { type: "p", text: "Your laptop's or phone's mic is enough to practice pitch on attunr. A real mic and an interface give you a cleaner sound and let you hear yourself in headphones. There are plenty of good options; these two are a safe start. Nobody paid us to name them." },

    { type: "h2", text: "The microphone: Shure SM58" },
    { type: "figure", src: "/images/learn/shure-sm58.jpg", width: 1200, height: 900, alt: "A black Shure SM58 microphone with a round silver mesh grille",
      caption: "The Shure SM58: you sing into the round grille.",
      credit: { by: "Laineema", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:SHURE_SM58_(5290214000).jpg" } },
    { type: "p", text: "Probably the most popular vocal mic there is, and that's the point: it's in almost every rehearsal room, so what you learn on it at home works anywhere." },
    { type: "list", items: [
      "It hears what's in front of it, not the room: handy at home.",
      "It's famously tough.",
      "It needs an XLR cable (round, three pins) and no phantom power.",
      "Sing about two fingers' width from the grille.",
    ] },

    { type: "h2", text: "The audio interface: Focusrite Scarlett Solo or 2i2" },
    { type: "p", text: "The box between the mic and your computer: mic and headphones in, USB to the computer." },
    { type: "figure", src: "/images/learn/focusrite-scarlett-2i2.jpg", width: 1200, height: 675, alt: "A red Focusrite Scarlett 2i2 audio interface on a desk, with two microphone cables plugged into its front",
      caption: "A Scarlett 2i2 with two mics plugged in. The Direct Monitor button is on the right. The Solo looks the same with one mic input.",
      credit: { by: "Peter Placzek", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Focusrite_Scarlett_Solo_3rd_Gen.jpg" } },
    { type: "list", items: [
      "**Scarlett Solo** if it's just you and the mic.",
      "**Scarlett 2i2** if you want to plug in more than one thing at once, like a mic and a guitar.",
    ] },
    { type: "p", text: "The 4th generation was the newest we could find when we wrote this. An older one works fine too." },

    { type: "h2", text: "Why direct monitoring matters" },
    { type: "p", text: "Press **Direct Monitor** and you hear your voice in your headphones with no delay. Without it, your voice comes back from the computer a moment late, and singing against that tiny echo makes your pitch wobble. With it, you hear exactly where your note lands." },
    { type: "p", text: "Use closed headphones, so the mic hears you and not the drone." },

    { type: "h2", text: "Plug it together" },
    { type: "list", items: [
      "SM58 into the first input, interface into the computer, headphones into the interface.",
      "Turn on Direct Monitor.",
      "Sing a steady note and turn the gain up until its light shows green, never red.",
    ] },
    { type: "p", text: "Then try the [pitch matching exercises](/learn/pitch-matching-exercises), after a quick [warm-up](/learn/vocal-warm-ups)." },
  ],
};
