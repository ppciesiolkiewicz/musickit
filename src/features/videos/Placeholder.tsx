import Icon from "@/components/Icon";

const frame = "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center";

/** A placeholder as a reader sees it: a video to come, in the shape a video will take. */
export function VideoComingSoon() {
  return (
    <div className={`${frame} border-slate-700 bg-slate-900/60`}>
      <Icon name="video" size={28} className="text-slate-500" />
      <p className="text-base font-medium text-slate-300">Video coming soon</p>
    </div>
  );
}

/** A placeholder in the creator: pressing it opens the recorder, and the video made there takes its place. */
export function VideoPlaceholderButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`${frame} border-sky-500/50 bg-sky-500/5 text-sky-100 hover:border-sky-400 hover:bg-sky-500/10`}>
      <Icon name="video" size={28} className="text-sky-300" />
      <span className="text-base font-medium">Record this video</span>
      <span className="max-w-sm text-sm text-slate-400">Press to record it or pick one. Until then, people reading the note see “Video coming soon”.</span>
    </button>
  );
}
