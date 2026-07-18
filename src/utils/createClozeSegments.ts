export type ClozeSegment =
  | { type: "text"; text: string; key: string }
  | { type: "blank"; keyword: string; key: string; occurrence: number };

export interface ClozeTarget {
  text: string;
  start: number;
  end: number;
}

const SENTENCE_OR_PHRASE_PATTERN = /[^\s.!?。！？]+(?:[^\S\r\n]+[^\s.!?。！？]+)*[.!?。！？]?/gu;
const WORD_PATTERN = /\S+/gu;
const TRAILING_VISIBLE_PUNCTUATION = /[.!?。！？]+$/u;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWords(value: string): number {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

export function countHiddenWords(total: number, ratio: number): number {
  if (total <= 0 || ratio <= 0) return 0;
  if (ratio >= 100) return total;
  return Math.max(1, Math.round(total * (ratio / 100)));
}

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function overlaps(target: ClozeTarget, selected: ClozeTarget[]): boolean {
  return selected.some((item) => target.start < item.end && item.start < target.end);
}

function keepTrailingPunctuationVisible(target: ClozeTarget): ClozeTarget | null {
  const punctuation = target.text.match(TRAILING_VISIBLE_PUNCTUATION)?.[0] ?? "";
  const text = punctuation ? target.text.slice(0, -punctuation.length) : target.text;
  if (!text.trim()) return null;
  return {
    text,
    start: target.start,
    end: target.start + text.length,
  };
}

function getWordTargets(answer: string): ClozeTarget[] {
  return Array.from(answer.matchAll(WORD_PATTERN), (match) =>
    keepTrailingPunctuationVisible({
      text: match[0],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }),
  ).filter((target): target is ClozeTarget => Boolean(target));
}

function getKeywordTargets(answer: string, keywords: string[]): ClozeTarget[] {
  const clean = Array.from(new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );

  const targets: ClozeTarget[] = [];
  for (const keyword of clean) {
    const expression = new RegExp(escapeRegExp(keyword), "gu");
    for (const match of answer.matchAll(expression)) {
      const start = match.index ?? 0;
      const target = keepTrailingPunctuationVisible({ text: match[0], start, end: start + match[0].length });
      if (target) targets.push(target);
    }
  }

  return targets;
}

export function pickHiddenAnswerTargets(answer: string, keywords: string[], ratio: number): ClozeTarget[] {
  const wordTargets = getWordTargets(answer);
  const targetWordCount = countHiddenWords(wordTargets.length, ratio);
  if (targetWordCount === 0) return [];
  if (ratio >= 100) return wordTargets;

  const selected: ClozeTarget[] = [];
  const coveredWordIndexes = new Set<number>();

  function markCoveredWords(target: ClozeTarget) {
    wordTargets.forEach((word, index) => {
      if (word.start < target.end && target.start < word.end) {
        coveredWordIndexes.add(index);
      }
    });
  }

  for (const target of shuffleItems(getKeywordTargets(answer, keywords))) {
    const wordCount = countWords(target.text);
    if (wordCount === 0 || overlaps(target, selected)) continue;
    if (coveredWordIndexes.size > 0 && coveredWordIndexes.size + wordCount > targetWordCount + 1) continue;
    selected.push(target);
    markCoveredWords(target);
    if (coveredWordIndexes.size >= targetWordCount) return selected;
  }

  for (const target of shuffleItems(wordTargets)) {
    if (coveredWordIndexes.size >= targetWordCount) break;
    if (overlaps(target, selected)) continue;
    selected.push(target);
    markCoveredWords(target);
  }

  return selected;
}

function createFullAnswerBlankSegments(answer: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;
  let segmentIndex = 0;

  for (const match of answer.matchAll(SENTENCE_OR_PHRASE_PATTERN)) {
    const target = keepTrailingPunctuationVisible({
      text: match[0],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
    if (!target) continue;
    const keyword = target.text;
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", text: answer.slice(lastIndex, index), key: `text-${segmentIndex}` });
      segmentIndex += 1;
    }

    segments.push({ type: "blank", keyword, occurrence: segmentIndex, key: `full-blank-${segmentIndex}-${index}` });
    segmentIndex += 1;
    lastIndex = target.end;
  }

  if (lastIndex < answer.length) {
    segments.push({ type: "text", text: answer.slice(lastIndex), key: `text-${segmentIndex}` });
  }

  return segments.length > 0 ? segments : [{ type: "text", text: answer, key: "text-0" }];
}

export function createClozeSegments(answer: string, hiddenTargets: ClozeTarget[], ratio: number): ClozeSegment[] {
  if (ratio >= 100) {
    return createFullAnswerBlankSegments(answer);
  }

  if (hiddenTargets.length === 0) {
    return [{ type: "text", text: answer, key: "text-0" }];
  }

  const segments: ClozeSegment[] = [];
  let lastIndex = 0;
  let segmentIndex = 0;

  const targets = hiddenTargets
    .map(keepTrailingPunctuationVisible)
    .filter((target): target is ClozeTarget => Boolean(target))
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((target, index, sorted) => index === 0 || target.start >= sorted[index - 1].end);

  for (const target of targets) {
    if (target.start > lastIndex) {
      segments.push({ type: "text", text: answer.slice(lastIndex, target.start), key: `text-${segmentIndex}` });
      segmentIndex += 1;
    }

    segments.push({
      type: "blank",
      keyword: target.text,
      occurrence: segmentIndex,
      key: `blank-${segmentIndex}-${target.start}-${target.end}`,
    });
    segmentIndex += 1;
    lastIndex = target.end;
  }

  if (lastIndex < answer.length) {
    segments.push({ type: "text", text: answer.slice(lastIndex), key: `text-${segmentIndex}` });
  }

  return segments;
}
