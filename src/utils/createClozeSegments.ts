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
const KOREAN_PARTICLE_SUFFIXES = [
  "으로부터",
  "로부터",
  "에게서",
  "한테서",
  "에서는",
  "으로는",
  "로는",
  "에게",
  "한테",
  "에서",
  "으로",
  "부터",
  "까지",
  "처럼",
  "보다",
  "마다",
  "조차",
  "마저",
  "밖에",
  "에서",
  "이나",
  "나",
  "이라",
  "라",
  "와",
  "과",
  "을",
  "를",
  "은",
  "는",
  "이",
  "가",
  "도",
  "만",
  "의",
  "에",
  "로",
] as const;
const FUNCTION_WORDS = new Set([
  "가장",
  "같은",
  "계속",
  "그",
  "그대로",
  "그렇지만",
  "그리고",
  "그러나",
  "그래서",
  "다만",
  "또한",
  "먼저",
  "모든",
  "반면",
  "바로",
  "빠르게",
  "서로",
  "수도",
  "아니라",
  "아직",
  "어떤",
  "여러",
  "예를",
  "위해",
  "이미",
  "있는",
  "있도록",
  "있지만",
  "있습니다",
  "있었습니다",
  "없거나",
  "없지는",
  "없지",
  "없습니다",
  "없었습니다",
  "없이",
  "이를",
  "이러한",
  "이후",
  "저는",
  "정도",
  "직접",
  "통해",
  "처럼",
  "충분히",
  "크게",
  "특히",
  "항상",
  "함께",
  "하지만",
  "한",
  "한다고",
  "합니다",
  "했습니다",
  "때문",
  "때문에",
  "때문입니다",
  "다른",
  "만들",
  "맞는",
  "실제",
  "중요한",
]);
const FUNCTION_ENDING_PATTERN =
  /(입니다|합니다|했습니다|됩니다|되었습니다|습니다|었습니다|았습니다|있습니다|없습니다|싶습니다|생각합니다|중요합니다|입니다|해야|하게|하며|하고|하는|하면)$/u;

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

function keepTrailingParticleVisible(target: ClozeTarget): ClozeTarget {
  for (const suffix of KOREAN_PARTICLE_SUFFIXES) {
    if (!target.text.endsWith(suffix)) continue;
    const stem = target.text.slice(0, -suffix.length);
    if ([...stem].length < 2) continue;
    return {
      text: stem,
      start: target.start,
      end: target.start + stem.length,
    };
  }
  return target;
}

function keepConceptStemVisible(target: ClozeTarget): ClozeTarget {
  const stemMatch = target.text.match(/^(.{2,}?)(해야|할)$/u);
  if (!stemMatch) return target;
  const stem = stemMatch[1];
  return {
    text: stem,
    start: target.start,
    end: target.start + stem.length,
  };
}

function normalizeCandidate(value: string): string {
  return value.replace(/[()[\]{},:;"'“”‘’]/g, "").trim();
}

function isConceptWordTarget(target: ClozeTarget): boolean {
  const normalized = normalizeCandidate(target.text);
  if ([...normalized].length < 2) return false;
  if (FUNCTION_WORDS.has(normalized)) return false;
  if (FUNCTION_ENDING_PATTERN.test(normalized)) return false;
  if (/^[0-9]+$/u.test(normalized)) return false;
  return /[가-힣A-Za-z]/u.test(normalized);
}

function getWordTargets(answer: string): ClozeTarget[] {
  return Array.from(answer.matchAll(WORD_PATTERN), (match) =>
    keepTrailingPunctuationVisible({
      text: match[0],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }),
  )
    .filter((target): target is ClozeTarget => Boolean(target))
    .map(keepTrailingParticleVisible)
    .map(keepConceptStemVisible)
    .filter(isConceptWordTarget);
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
