import { Slider } from "@/components/ui/slider";

interface YearSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function YearSlider({ min, max, value, onChange }: YearSliderProps) {
  return (
    <div className="flex items-center gap-4 min-w-[280px]">
      <span className="text-sm font-semibold text-primary font-heading bg-secondary px-2 py-0.5 rounded">
        {value[0]}
      </span>
      <Slider
        min={min}
        max={max}
        step={1}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="flex-1"
      />
      <span className="text-sm font-semibold text-primary font-heading bg-secondary px-2 py-0.5 rounded">
        {value[1]}
      </span>
    </div>
  );
}
