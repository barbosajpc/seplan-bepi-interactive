import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";

interface YearSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRange(
  start: number,
  end: number,
  min: number,
  max: number
): [number, number] {
  const safeMaxStart = max - 1;

  let s = clamp(start, min, safeMaxStart);
  let e = clamp(end, s + 1, max);

  if (s >= e) e = clamp(s + 1, s + 1, max);

  return [s, e];
}

export function YearSlider({ min, max, value, onChange }: YearSliderProps) {
  const [startText, setStartText] = useState(String(value[0]));
  const [endText, setEndText] = useState(String(value[1]));


  useEffect(() => {
    setStartText(String(value[0]));
    setEndText(String(value[1]));
  }, [value]);

  function commitStart() {
    const parsed = Number(startText);

    if (!Number.isFinite(parsed)) {
      setStartText(String(value[0]));
      return;
    }

    const [s, e] = normalizeRange(parsed, value[1], min, max);
    onChange([s, e]);
  }

  function commitEnd() {
    const parsed = Number(endText);

    if (!Number.isFinite(parsed)) {
      setEndText(String(value[1]));
      return;
    }

    const [s, e] = normalizeRange(value[0], parsed, min, max);
    onChange([s, e]);
  }

  return (
    <div className="flex items-center gap-4 min-w-[320px]">
      {/* INÍCIO */}
      <input
        type="number"
        value={startText}
        min={min}
        max={max - 1}
        onChange={(e) => setStartText(e.target.value)}
        onBlur={commitStart}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-20 text-sm font-semibold text-primary font-heading bg-secondary px-2 py-0.5 rounded outline-none"
      />

      {/* SLIDER (com animação suave via CSS) */}
      <Slider
        min={min}
        max={max}
        step={1}
        value={value}
        onValueChange={(v) => {
          const [s, e] = normalizeRange(
            (v as [number, number])[0],
            (v as [number, number])[1],
            min,
            max
          );
          onChange([s, e]);
        }}
        className="
          flex-1
          [&_[data-radix-slider-range]]:transition-all
          [&_[data-radix-slider-range]]:duration-200
          [&_[data-radix-slider-range]]:ease-out
          [&_[data-radix-slider-thumb]]:transition-transform
          [&_[data-radix-slider-thumb]]:duration-150
          [&_[data-radix-slider-thumb]]:ease-out
        "
      />

      {/* FIM */}
      <input
        type="number"
        value={endText}
        min={min + 1}
        max={max}
        onChange={(e) => setEndText(e.target.value)}
        onBlur={commitEnd}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-20 text-sm font-semibold text-primary font-heading bg-secondary px-2 py-0.5 rounded outline-none"
      />
    </div>
  );
}
