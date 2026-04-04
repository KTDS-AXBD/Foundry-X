/**
 * F312: ShapingTriggerPanel — 발굴 완료 후 형상화 트리거 패널
 */
import { useState } from "react";

interface Props {
  pipelineRunId: string;
  bizItemId: string;
  onTrigger: (options: { mode: "hitl" | "auto"; maxIterations: number }) => Promise<void>;
  isTriggering?: boolean;
}

export function ShapingTriggerPanel({ pipelineRunId: _pipelineRunId, bizItemId: _bizItemId, onTrigger, isTriggering = false }: Props) {
  const [mode, setMode] = useState<"hitl" | "auto">("auto");
  const [maxIterations, setMaxIterations] = useState(3);

  const handleTrigger = async () => {
    await onTrigger({ mode, maxIterations });
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-emerald-800">
          Discovery Complete — Ready for Shaping
        </h3>
      </div>

      <p className="text-xs text-emerald-700">
        All discovery stages (2-0 ~ 2-10) have been completed. You can now trigger the shaping pipeline (Phase A ~ F).
      </p>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            name="shaping-mode"
            value="auto"
            checked={mode === "auto"}
            onChange={() => setMode("auto")}
            className="text-emerald-600"
          />
          <span>Auto (Phase A~F sequential)</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            name="shaping-mode"
            value="hitl"
            checked={mode === "hitl"}
            onChange={() => setMode("hitl")}
            className="text-emerald-600"
          />
          <span>HITL (pause at each phase)</span>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-emerald-700">Max iterations:</label>
        <select
          value={maxIterations}
          onChange={(e) => setMaxIterations(Number(e.target.value))}
          className="text-xs border rounded px-2 py-1"
        >
          {[1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleTrigger}
        disabled={isTriggering}
        className="w-full py-2 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isTriggering ? "Triggering Shaping..." : "Start Shaping Pipeline"}
      </button>
    </div>
  );
}
