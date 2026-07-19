import type { QuestionTypeFilter } from "../types/interview";
import { QUESTION_STRUCTURES, QUESTION_TYPE_FILTERS } from "../utils/questionStructure";

interface QuestionTypeSelectorProps {
  value: QuestionTypeFilter;
  onChange: (value: QuestionTypeFilter) => void;
  compact?: boolean;
}

function labelForFilter(filter: QuestionTypeFilter): string {
  if (filter === "all") return "전체";
  return QUESTION_STRUCTURES[filter].displayType;
}

export function QuestionTypeSelector({ value, onChange, compact = false }: QuestionTypeSelectorProps) {
  return (
    <fieldset className={compact ? "typeSelector compact" : "typeSelector"}>
      <legend>질문 유형</legend>
      <div className="typeOptions">
        {QUESTION_TYPE_FILTERS.map((filter) => (
          <button
            className={filter === value ? "typeButton active" : "typeButton"}
            key={filter}
            type="button"
            aria-pressed={filter === value}
            onClick={() => onChange(filter)}
          >
            {labelForFilter(filter)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
