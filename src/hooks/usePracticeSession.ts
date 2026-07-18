import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type { AppStorage, PracticeMode, QuestionSet } from "../types/interview";
import { type ClozeTarget, pickHiddenAnswerTargets } from "../utils/createClozeSegments";
import { saveLastSession, saveStorage } from "../utils/storage";
import { shuffle } from "../utils/shuffle";

interface UsePracticeSessionOptions {
  storage: AppStorage;
  setStorage: Dispatch<SetStateAction<AppStorage>>;
  questionSet: QuestionSet;
  mode: PracticeMode;
  start: "resume" | "new";
}

export function usePracticeSession({ storage, setStorage, questionSet, mode, start }: UsePracticeSessionOptions) {
  const progress = storage.progress[questionSet.id] ?? { sequentialIndex: 0 };
  const lowReadinessIds = new Set(
    Object.entries(progress.readiness ?? {})
      .filter(([, readiness]) => readiness <= 2)
      .map(([questionId]) => questionId),
  );
  const questions = questionSet.questions;
  const reviewQuestions = questions.filter((question) => lowReadinessIds.has(question.id));

  function getInitialOrder() {
    if (mode === "review") {
      if (start === "resume" && progress.reviewOrder?.length) {
        return progress.reviewOrder.filter((questionId) => questions.some((question) => question.id === questionId));
      }
      return reviewQuestions.map((question) => question.id);
    }
    if (mode === "sequential") return questions.map((question) => question.id);
    if (start === "resume" && progress.randomOrder?.length === questions.length) return progress.randomOrder;
    return shuffle(questions.map((question) => question.id));
  }

  function getInitialIndex() {
    if (start === "new") return 0;
    if (mode === "review") return Math.min(progress.reviewIndex ?? 0, Math.max(questions.length - 1, 0));
    if (mode === "random") return Math.min(progress.randomIndex ?? 0, Math.max(questions.length - 1, 0));
    return Math.min(progress.sequentialIndex ?? 0, Math.max(questions.length - 1, 0));
  }

  const [order, setOrder] = useState(getInitialOrder);
  const [index, setIndex] = useState(getInitialIndex);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [hiddenTargets, setHiddenTargets] = useState<ClozeTarget[]>([]);

  const currentQuestion = questions.find((question) => question.id === order[index]) ?? questions[0];

  useEffect(() => {
    setHiddenTargets(
      pickHiddenAnswerTargets(
        currentQuestion?.answer ?? "",
        currentQuestion?.keywords ?? [],
        storage.settings.blankRatio,
      ),
    );
  }, [currentQuestion?.answer, currentQuestion?.id, currentQuestion?.keywords, storage.settings.blankRatio]);

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
    const nextOrder = questions.map((question) => question.id);
    persistProgress(0, nextOrder);
    setOrder(nextOrder);
    setIndex(0);
    setSessionComplete(false);
  }

  return {
    currentQuestion,
    currentNumber: index + 1,
    total: order.length,
    hiddenTargets,
    hasPrevious: index > 0,
    isLast: index >= order.length - 1,
    sessionComplete,
    next,
    previous,
    restartRandom,
    restartSequential,
    restartReview,
  };
}
