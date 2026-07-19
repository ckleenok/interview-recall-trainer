import type { QuestionType, QuestionTypeFilter, StructuredAnswerPart } from "../types/interview";

export const QUESTION_TYPE_FILTERS: QuestionTypeFilter[] = ["all", "why", "what", "how"];

export const QUESTION_STRUCTURES: Record<
  QuestionType,
  {
    displayType: string;
    code: "CER" | "DEM" | "SAL";
    labels: [string, string, string];
  }
> = {
  why: {
    displayType: "Why",
    code: "CER",
    labels: ["Conclusion", "Evidence", "Relevance"],
  },
  what: {
    displayType: "What",
    code: "DEM",
    labels: ["Definition", "Explanation/Example", "Meaning"],
  },
  how: {
    displayType: "How",
    code: "SAL",
    labels: ["Situation", "Action", "Learning"],
  },
};

export function normalizeQuestionType(value: string | undefined): QuestionType {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "why") return "why";
  if (normalized === "how") return "how";
  return "what";
}

export function normalizeQuestionTypeFilter(value: string | undefined): QuestionTypeFilter {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "why" || normalized === "what" || normalized === "how") return normalized;
  return "all";
}

export function structureCodeForType(questionType: QuestionType): string {
  return QUESTION_STRUCTURES[questionType].code;
}

export function labelsForType(questionType: QuestionType): [string, string, string] {
  return QUESTION_STRUCTURES[questionType].labels;
}

export function createEmptyAnswerParts(questionType: QuestionType): StructuredAnswerPart[] {
  return labelsForType(questionType).map((label) => ({ label, text: "" }));
}

export function createMigratedAnswerParts(questionType: QuestionType, answer = ""): StructuredAnswerPart[] {
  return labelsForType(questionType).map((label, index) => ({
    label,
    text: index === 0 ? answer : "",
  }));
}

export function isStructureCompatible(questionType: QuestionType, structure: string | undefined): boolean {
  if (!structure?.trim()) return true;
  return structure.trim().toUpperCase() === structureCodeForType(questionType);
}

export function answerTextFromParts(parts: StructuredAnswerPart[]): string {
  return parts.map((part) => part.text).filter(Boolean).join(" ");
}
