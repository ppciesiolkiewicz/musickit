import Piano from "@/components/Piano";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
      <h1 className="mb-8 text-2xl font-light tracking-widest text-slate-400">
        MUSIC KIT
      </h1>
      <Piano />
    </div>
  );
}
