"use client";

import { useSyncExternalStore } from "react";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { detectRoot } from "./model/detectRoot";
import * as P from "./model/project";
import type { SampleMeta, SampleSource } from "./model/types";
import { forgetSample } from "./sampleUrls";
import { getStore } from "./store/idb";

/** The sample library: one per browser (IndexedDB), shared by every panel on the page. */
interface LibraryState { samples: SampleMeta[]; ready: boolean; error: string | null }

let project = P.emptyProject();
let state: LibraryState = { samples: [], ready: false, error: null };
const listeners = new Set<() => void>();
const SERVER: LibraryState = { samples: [], ready: false, error: null };

const emit = (patch: Partial<LibraryState> = {}) => {
  state = { ...state, samples: project.samples, ...patch };
  listeners.forEach((l) => l());
};

let loading: Promise<void> | null = null;
const load = () =>
  (loading ??= getStore()
    .loadProject()
    .then((raw) => {
      project = P.sanitiseProject(raw);
      emit({ ready: true });
    })
    .catch(() => emit({ ready: true, error: "Could not open saved samples." })));

const commit = (next: typeof project) => {
  project = next;
  emit();
  getStore().saveProject(next).catch(() => emit({ error: "Could not save." }));
};

const decode = async (blob: Blob): Promise<AudioBuffer> => getAudioContext().decodeAudioData(await blob.arrayBuffer());

export const sampleLibrary = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    void load();
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,
  async addAudio(blob: Blob, name: string, source: SampleSource, prompt?: string): Promise<SampleMeta> {
    await load();
    const id = P.uniqueId("s", project.samples.map((s) => s.id));
    const meta: SampleMeta = { id, name: name.replace(/\.[^.]+$/, "").slice(0, 60) || "Sample", source, prompt, mime: blob.type || "audio/mpeg", bytes: blob.size, createdAt: Date.now() };
    await getStore().putAudio(id, blob);
    commit(P.addSample(project, meta));
    return meta;
  },
  /** A dropped or uploaded file. Throws a message to show when the browser cannot play it; then nothing is stored. */
  async addFile(file: File): Promise<SampleMeta> {
    try {
      await decode(file);
    } catch {
      throw new Error(`${file.name} is not audio this browser can play.`);
    }
    return sampleLibrary.addAudio(file, file.name, "upload");
  },
  /** Audio first, then the list: instruments that rebuild on the change find the sample gone. */
  async remove(id: string) {
    await getStore().deleteAudio(id);
    forgetSample(id);
    commit(P.removeSample(project, id));
  },
  rename: (id: string, name: string) => commit(P.renameSample(project, id, name)),
  clearError: () => emit({ error: null }),
};

export function useSampleLibrary(): LibraryState {
  return useSyncExternalStore(sampleLibrary.subscribe, sampleLibrary.get, () => SERVER);
}

/** Play a stored sample once on the app's output. */
export async function previewSample(id: string): Promise<void> {
  const blob = await getStore().getAudio(id);
  if (!blob) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = await decode(blob);
  src.connect(getOutputBus());
  src.start();
}

/** The note a stored sample sounds at (see detectRoot), or null. */
export async function detectSampleRoot(id: string): Promise<number | null> {
  const blob = await getStore().getAudio(id);
  if (!blob) return null;
  const buf = await decode(blob);
  return detectRoot(buf.getChannelData(0), buf.sampleRate);
}
