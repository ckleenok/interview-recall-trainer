const RATIOS = [0, 20, 40, 60, 80, 100];

interface BlankRatioSelectorProps {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

export function BlankRatioSelector({
  value,
  onChange,
  compact = false,
}: BlankRatioSelectorProps) {
  return (
    <fieldset className={compact ? "ratioSelector compact" : "ratioSelector"}>
      <legend>답변 표시</legend>
      <div className="ratioOptions">
        {RATIOS.map((ratio) => (
          <button
            className={ratio === value ? "ratioButton active" : "ratioButton"}
            key={ratio}
            type="button"
            aria-pressed={ratio === value}
            onClick={() => onChange(ratio)}
          >
            {ratio}%
          </button>
        ))}
      </div>
    </fieldset>
  );
}
