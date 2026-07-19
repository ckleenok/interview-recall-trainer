const RATIOS = [0, 20, 40, 60, 80, 100];

interface BlankRatioSelectorProps {
  value: number;
  displayMode: "cloze" | "structure";
  onChange: (value: number) => void;
  onStructureOnly: () => void;
  compact?: boolean;
}

export function BlankRatioSelector({
  value,
  displayMode,
  onChange,
  onStructureOnly,
  compact = false,
}: BlankRatioSelectorProps) {
  return (
    <fieldset className={compact ? "ratioSelector compact" : "ratioSelector"}>
      <legend>답변 표시</legend>
      <div className="ratioOptions">
        {RATIOS.map((ratio) => (
          <button
            className={displayMode === "cloze" && ratio === value ? "ratioButton active" : "ratioButton"}
            key={ratio}
            type="button"
            aria-pressed={displayMode === "cloze" && ratio === value}
            onClick={() => onChange(ratio)}
          >
            {ratio}%
          </button>
        ))}
        <button
          className={displayMode === "structure" ? "ratioButton active" : "ratioButton"}
          type="button"
          aria-pressed={displayMode === "structure"}
          onClick={onStructureOnly}
        >
          구조만
        </button>
      </div>
    </fieldset>
  );
}
