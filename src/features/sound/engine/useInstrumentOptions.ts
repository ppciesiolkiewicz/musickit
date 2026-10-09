"use client";

import { useEffect, useState } from "react";
import { allInstrumentOptions } from "./instruments";
import { subscribeRuntimeInstruments } from "./runtime";

/** The instrument choices for a picker: the built-in ones, the sampler's, and the oscillator. Updates when the sampler changes. */
export function useInstrumentOptions(): { label: string; value: string }[] {
  const [options, setOptions] = useState(allInstrumentOptions);
  useEffect(() => {
    const refresh = () => setOptions(allInstrumentOptions());
    refresh();
    return subscribeRuntimeInstruments(refresh);
  }, []);
  return options;
}
