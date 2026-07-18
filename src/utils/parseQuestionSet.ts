import type { InterviewQuestion, ParsedQuestionPreview } from "../types/interview";

const FIELD_LABELS = ["질문", "핵심문장", "답변", "키워드", "카테고리"] as const;
type FieldLabel = (typeof FIELD_LABELS)[number];

const FIELD_PATTERN = /^(질문|핵심문장|답변|키워드|카테고리)\s*:\s*(.*)$/;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseBlock(block: string, index: number): ParsedQuestionPreview {
  const fields = new Map<FieldLabel, string>();
  let activeLabel: FieldLabel | null = null;

  for (const rawLine of block.split(/\r?\n/)) {
    const match = rawLine.match(FIELD_PATTERN);
    if (match) {
      activeLabel = match[1] as FieldLabel;
      fields.set(activeLabel, match[2].trim());
      continue;
    }

    if (activeLabel) {
      const previous = fields.get(activeLabel) ?? "";
      fields.set(activeLabel, `${previous}\n${rawLine}`.trim());
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const question = fields.get("질문")?.trim() ?? "";
  const keySentence = fields.get("핵심문장")?.trim() ?? "";
  const answer = fields.get("답변")?.trim() ?? "";
  const keywords = (fields.get("키워드") ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const category = fields.get("카테고리")?.trim() || "일반";

  if (!question) errors.push("질문이 필요합니다.");
  if (!keySentence) errors.push("핵심문장이 필요합니다.");
  if (!answer) errors.push("답변이 필요합니다.");
  if (keywords.length === 0) warnings.push("키워드가 없습니다. 답변은 모두 표시됩니다.");

  return {
    question: {
      id: createId(`import-${index + 1}`),
      question,
      keySentence,
      answer,
      keywords,
      category,
    },
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
