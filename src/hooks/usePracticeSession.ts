import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type { AppStorage, PracticeMode, QuestionSet, QuestionTypeFilter } from "../types/interview";
import { type ClozeTarget, pickHiddenAnswerTargets } from "../utils/createClozeSegments";
import { saveLastSession, saveStorage } from "../utils/storage";
import { shuffle } from "../utils/shuffle";
import { getReviewInfo, getStudyCount, isDueForReview } from "../utils/studySchedule";

interface UsePracticeSessionOptions {
  storage: AppStorage;
  setStorage: Dispatch<SetStateAction<AppStorage>>;
  questionSet: QuestionSet;
  mode: PracticeMode;
  start: "resume" | "new";
  questionTypeFilter: QuestionTypeFilter;
}

export function usePracticeSession({
  storage,
  setStorage,
  questionSet,
  mode,
  start,
  questionTypeFilter,
}: UsePracticeSessionOptions) {
  const progress = storage.progress[questionSet.id] ?? { sequentialIndex: 0 };
  const lowReadinessIds = new Set(
    Object.entries(progress.readiness ?? {})
      .filter(([, readiness]) => readiness <= 2)
      .map(([questionId]) => questionId),
  );
  const questions =
    questionTypeFilter === "all"
      ? questionSet.questions
      : questionSet.questions.filter((question) => question.questionType === questionTypeFilter);
  const reviewQuestions = questions.filter(
    (question) =>
      lowReadinessIds.has(question.id) || (getStudyCount(progress, question.id) > 0 && isDueForReview(progress, question.id)),
  );
  const spacedQuestions = questions
    .map((question, originalIndex) => ({
      question,
      originalIndex,
      reviewInfo: getReviewInfo(progress, question.id),
      readiness: progress.readiness?.[question.id] ?? 3,
    }))
    .filter((item) => item.reviewInfo.due)
    .sort((a, b) => {
      const aOverdue = a.reviewInfo.daysSinceLastStudy === null ? -1 : a.reviewInfo.daysSinceLastStudy - a.reviewInfo.intervalDays;
      const bOverdue = b.reviewInfo.daysSinceLastStudy === null ? -1 : b.reviewInfo.daysSinceLastStudy - b.reviewInfo.intervalDays;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      if (a.readiness !== b.readiness) return a.readiness - b.readiness;
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => item.question);
  const questionIds = new Set(questions.map((question) => question.id));

  function getInitialOrder() {
    if (mode === "review") {
      if (start === "resume" && progress.reviewOrder?.length) {
        return progress.reviewOrder.filter((questionId) => questionIds.has(questionId));
      }
      return reviewQuestions.map((question) => question.id);
    }
    if (mode === "spaced") {
      if (start === "resume" && progress.spacedOrder?.length) {
        return progress.spacedOrder.filter((questionId) => questionIds.has(questionId));
      }
      return spacedQuestions.map((question) => question.id);
    }
    if (mode === "sequential") return questions.map((question) => question.id);
    if (
      start === "resume" &&
      progress.randomOrder?.length === questions.length &&
      progress.randomOrder.every((questionId) => questionIds.has(questionId))
    ) {
      return progress.randomOrder;
    }
    return shuffle(questions.map((question) => question.id));
  }

  function getInitialIndex() {
    if (start === "new") return 0;
    const maxIndex = Math.max(getInitialOrder().length - 1, 0);
    if (mode === "review") return Math.min(progress.reviewIndex ?? 0, maxIndex);
    if (mode === "spaced") return Math.min(progress.spacedIndex ?? 0, maxIndex);
    if (mode === "random") return Math.min(progress.randomIndex ?? 0, maxIndex);
    return Math.min(progress.sequentialIndex ?? 0, maxIndex);
  }

  const [order, setOrder] = useState(getInitialOrder);
  const [index, setIndex] = useState(getInitialIndex);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hiddenTargetsByPart, setHiddenTargetsByPart] = useState<ClozeTarget[][]>([]);

  const currentQuestion = questions.find((question) => question.id === order[index]) ?? questions[0];

  useEffect(() => {
    const nextOrder = getInitialOrder();
    setOrder(nextOrder);
    setIndex(Math.min(getInitialIndex(), Math.max(nextOrder.length - 1, 0)));
    setSessionComplete(false);
  }, [mode, questionSet.id, questionTypeFilter]);

  useEffect(() => {
    setHiddenTargetsByPart(
      currentQuestion?.answerParts.map((part) =>
        pickHiddenAnswerTargets(part.text, currentQuestion.keywords, storage.settings.blankRatio),
      ) ?? [],
    );
  }, [currentQuestion?.answerParts, currentQuestion?.id, currentQuestion?.keywords, storage.settings.blankRatio]);

  useEffect(() => {
    if (!currentQuestion) return;
    persistProgress(index, order);
  }, [currentQuestion, index, mode, order, questionSet.id, setStorage]);

  function persistProgress(nextIndex: number, nextOrder: string[]) {
    setStorage((previous) => {
      const nextProgress = {
        ...(previous.progress[questionSet.id] ?? { sequentialIndex: 0 }),
        lastStudiedAt: new Date().toISOString(),
      };

      if (mode === "random") {
        nextProgress.randomOrder = nextOrder;
        nextProgress.randomIndex = nextIndex;
      } else if (mode === "review") {
        nextProgress.reviewOrder = nextOrder;
        nextProgress.reviewIndex = nextIndex;
      } else if (mode === "spaced") {
        nextProgress.spacedOrder = nextOrder;
        nextProgress.spacedIndex = nextIndex;
      } else {
        nextProgress.sequentialIndex = nextIndex;
      }

      const nextStorage = saveLastSession(
        {
          ...previous,
          progress: {
            ...previous.progress,
            [questionSet.id]: nextProgress,
          },
        },
        questionSet.id,
        mode,
      );
      saveStorage(nextStorage);
      return nextStorage;
    });
  }

  function next() {
    if (index >= order.length - 1) {
      setSessionComplete(true);
      return;
    }
    const nextIndex = index + 1;
    persistProgress(nextIndex, order);
    setIndex(nextIndex);
  }

  function previous() {
    const nextIndex = Math.max(0, index - 1);
    persistProgress(nextIndex, order);
    setIndex(nextIndex);
  }

  function restartRandom() {
    const nextOrder = shuffle(questions.map((question) => question.id));
    persistProgress(0, nextOrder);
    setOrder(nextOrder);
    setIndex(0);
    setSessionComplete(false);
  }

  function restartSequential() {
    const nextOrder = questions.map((question) => question.id);
    persistProgress(0, nextOrder);
    setOrder(nextOrder);
    setIndex(0);
    setSessionComplete(false);
  }

  function restartReview() {
    const nextOrder = reviewQuestions.map((question) => question.id);
    persistProgress(0, nextOrder);
    setOrder(nextOrder);
    setIndex(0);
    setSessionComplete(false);
  }

  function restartSpaced() {
    const nextOrder = spacedQuestions.map((question) => question.id);
    persistProgress(0, nextOrder);
    setOrder(nextOrder);
    setIndex(0);
    setSessionComplete(false);
  }

  return {
    currentQuestion,
    currentNumber: index + 1,
    total: order.length,
    hiddenTargetsByPart,
    hasPrevious: index > 0,
    isLast: index >= order.length - 1,
    sessionComplete,
    next,
    previous,
    restartRandom,
    restartSequential,
    restartReview,
    restartSpaced,
  };
}
