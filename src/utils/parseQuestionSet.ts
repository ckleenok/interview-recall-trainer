import type { InterviewQuestion, ParsedQuestionPreview, QuestionType, StructuredAnswerPart } from "../types/interview";
import {
  createMigratedAnswerParts,
  isStructureCompatible,
  labelsForType,
  normalizeQuestionType,
  QUESTION_STRUCTURES,
  structureCodeForType,
} from "./questionStructure";

type ParsedField =
  | "type"
  | "structure"
  | "category"
  | "question"
  | "keywords"
  | "legacyAnswer"
  | "conclusion"
  | "evidence"
  | "relevance"
  | "definition"
  | "explanationExample"
  | "meaning"
  | "situation"
  | "action"
  | "learning";

const FIELD_PATTERN = /^([^:：]+)\s*[:：]\s*(.*)$/;

const FIELD_ALIASES: Record<string, ParsedField> = {
  "유형": "type",
  "type": "type",
  "question type": "type",
  "구조": "structure",
  "structure": "structure",
  "카테고리": "category",
  "category": "category",
  "질문": "question",
  "question": "question",
  "키워드": "keywords",
  "keyword": "keywords",
  "keywords": "keywords",
  "답변": "legacyAnswer",
  "answer": "legacyAnswer",
  "conclusion": "conclusion",
  "결론": "conclusion",
  "evidence": "evidence",
  "근거": "evidence",
  "example": "evidence",
  "사례": "evidence",
  "relevance": "relevance",
  "관련성": "relevance",
  "연결": "relevance",
  "definition": "definition",
  "정의": "definition",
  "explanation": "explanationExample",
  "explanation/example": "explanationExample",
  "explanation / example": "explanationExample",
  "explanation or example": "explanationExample",
  "설명": "explanationExample",
  "설명/예시": "explanationExample",
  "설명 또는 예시": "explanationExample",
  "예시": "explanationExample",
  "meaning": "meaning",
  "의미": "meaning",
  "situation": "situation",
  "상황": "situation",
  "action": "action",
  "행동": "action",
  "실행": "action",
  "learning": "learning",
  "배움": "learning",
  "느낀점": "learning",
};

const PART_FIELD_BY_TYPE: Record<QuestionType, ParsedField[]> = {
  why: ["conclusion", "evidence", "relevance"],
  what: ["definition", "explanationExample", "meaning"],
  how: ["situation", "action", "learning"],
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseType(value: string | undefined, warnings: string[]): QuestionType {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "why" || normalized === "what" || normalized === "how") return normalized;
  warnings.push("유형이 없거나 인식되지 않아 What으로 처리했습니다.");
  return "what";
}

function createAnswerParts(questionType: QuestionType, fields: Map<ParsedField, string>, warnings: string[]): StructuredAnswerPart[] {
  const labels = labelsForType(questionType);
  const partFields = PART_FIELD_BY_TYPE[questionType];
  const parts = partFields.map((field, index) => ({
    label: labels[index],
    text: fields.get(field)?.trim() ?? "",
  }));

  if (parts.every((part) => !part.text) && fields.get("legacyAnswer")?.trim()) {
    warnings.push("기존 답변 형식을 첫 구조 파트로 옮겼습니다.");
    return createMigratedAnswerParts(questionType, fields.get("legacyAnswer")?.trim() ?? "");
  }

  return parts;
}

function parseBlock(block: string, index: number): ParsedQuestionPreview {
  const fields = new Map<ParsedField, string>();
  let activeField: ParsedField | null = null;

  for (const rawLine of block.split(/\r?\n/)) {
    const match = rawLine.match(FIELD_PATTERN);
    if (match) {
      const alias = FIELD_ALIASES[normalizeLabel(match[1])];
      if (alias) {
        activeField = alias;
        fields.set(activeField, match[2].trim());
        continue;
      }
    }

    if (activeField) {
      const previous = fields.get(activeField) ?? "";
      fields.set(activeField, `${previous}\n${rawLine}`.trim());
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const questionType = parseType(fields.get("type"), warnings);
  const structure = fields.get("structure")?.trim();
  const question = fields.get("question")?.trim() ?? "";
  const keywords = (fields.get("keywords") ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const category = fields.get("category")?.trim() || "일반";
  const answerParts = createAnswerParts(questionType, fields, warnings);

  if (!question) errors.push("질문이 필요합니다.");
  if (!structure) errors.push(`구조 ${structureCodeForType(questionType)}가 필요합니다.`);
  if (!isStructureCompatible(questionType, structure)) {
    errors.push(`유형 ${QUESTION_STRUCTURES[questionType].displayType}에는 구조 ${structureCodeForType(questionType)}가 필요합니다.`);
  }
  answerParts.forEach((part) => {
    if (!part.text.trim()) warnings.push(`${part.label} 내용이 비어 있습니다.`);
  });
  if (keywords.length === 0) warnings.push("키워드가 없습니다. 답변은 모두 표시됩니다.");

  const questionItem: InterviewQuestion = {
    id: createId(`import-${index + 1}`),
    category,
    questionType: normalizeQuestionType(questionType),
    question,
    answerParts,
    keywords,
  };

  return {
    question: questionItem,
    errors,
    warnings,
  };
}

export function parseQuestionSet(input: string): ParsedQuestionPreview[] {
  return input
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseBlock);
}

export function createImportedSetName(): string {
  const date = new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date());
  return `새 면접 세트 ${date}`;
}
