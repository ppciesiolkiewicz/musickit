"use client";

import { useEffect } from "react";
import { sanitiseProject } from "./model/project";
import { getStore } from "./store/idb";
import { syncInstruments } from "./sync";

/** Put on every page: loads the saved sampler instruments so every instrument picker in the app offers them. Renders nothing. */
export default function SamplerSync() {
  useEffect(() => {
    const store = getStore();
    store
      .loadProject()
      .then((raw) => syncInstruments(sanitiseProject(raw), store))
      .catch(() => undefined);
  }, []);
  return null;
}
