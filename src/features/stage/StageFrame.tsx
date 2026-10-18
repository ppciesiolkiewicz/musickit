"use client";

import type { ReactNode } from "react";
import type { Layer, Stage, StageAction } from "./model/layers";

/**
 * The 16:9 frame: exactly what a recording shows. Each visible layer is placed from its rect, a fraction of the frame,
 * so the frame can be any size. Nothing outside this element is ever recorded (`data-stage-frame` is the capture target).
 */
export default function StageFrame({ stage, renderLayer, onAction }: { stage: Stage; renderLayer: (l: Layer) => ReactNode; onAction: (a: StageAction) => void }) {
  return (
    <div
      data-stage-frame
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-800"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onAction({ type: "select", id: null });
      }}
    >
      {stage.layers
        .filter((l) => l.visible)
        .map((l) => (
          <div
            key={l.id}
            data-layer={l.id}
            className="absolute"
            style={{ left: `${l.rect.x * 100}%`, top: `${l.rect.y * 100}%`, width: `${l.rect.w * 100}%`, height: `${l.rect.h * 100}%` }}
          >
            {renderLayer(l)}
          </div>
        ))}
    </div>
  );
}
