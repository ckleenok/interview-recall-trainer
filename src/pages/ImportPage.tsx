import { type Dispatch, type SetStateAction, useState } from "react";
import { ImportPreview } from "../components/ImportPreview";
import type { AppStorage, ParsedQuestionPreview, QuestionSet } from "../types/interview";
import { createImportedSetName, parseQuestionSet } from "../utils/parseQuestionSet";

interface ImportPageProps {
  setStorage: Dispatch<SetStateAction<AppStorage>>;
  onCancel: () => void;
  onSaved: () => void;
}

const SAMPLE = `질문: 부산대학교 AI컴퓨터공학과에 지원한 이유는 무엇입니까?

핵심문장: 호치민 생활을 통해 기술의 연결 가능성을 경험했고, 부산대학교에서 AI로 실제 문제를 해결하는 개발자가 되고 싶습니다.

답변: 저는 컴퓨터와 인공지능 기술을 활용해 실제 생활의 문제를 해결하는 개발자가 되고 싶어 지원했습니다. 중학교 3학년부터 고등학교 3학년까지 베트남 호치민에서 공부하면서, 언어와 교육환경이 달라도 디지털 기술이 학습과 소통을 도와주는 모습을 경험했습니다.

키워드: 컴퓨터와 인공지능 기술, 베트남 호치민, 디지털 기술, 실제 문제 해결

카테고리: 지원동기

---

질문: 다른 대학이 아닌 부산대학교를 선택한 이유는 무엇입니까?

핵심문장: 체계적인 전공 교육이 가장 큰 이유이고, 부산 출신이라는 점도 중요한 동기가 되었습니다.

답변: 부산대학교를 선택한 가장 큰 이유는 컴퓨터공학의 기초부터 인공지능까지 체계적으로 배울 수 있다고 생각했기 때문입니다.

키워드: 컴퓨터공학의 기초, 인공지능, 부산 출신

카테고리: 지원동기`;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ImportPage({ setStorage, onCancel, onSaved }: ImportPageProps) {
  const [name, setName] = useState(createImportedSetName);
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<ParsedQuestionPreview[]>([]);
  const [message, setMessage] = useState("");

  const hasErrors = previews.some((preview) => preview.errors.length > 0);
  const validQuestions = previews.filter((preview) => preview.errors.length === 0).map((preview) => preview.question);

  function analyze() {
    const parsed = parseQuestionSet(text);
    setPreviews(parsed);
    setMessage(parsed.length === 0 ? "인식된 질문이 없습니다." : "");
  }

  function save() {
    if (!name.trim()) {
      setMessage("세트 이름을 입력해 주세요.");
      return;
    }
    if (validQuestions.length === 0 || hasErrors) {
      setMessage("오류가 없는 질문만 저장할 수 있습니다.");
      return;
    }

    const now = new Date().toISOString();
    const setId = createId("set");
    const nextSet: QuestionSet = {
      id: setId,
      name: name.trim(),
      questions: validQuestions,
      createdAt: now,
      updatedAt: now,
    };

    setStorage((previous) => ({
      ...previous,
      sets: [...previous.sets, nextSet],
      settings: {
        ...previous.settings,
        lastSetId: setId,
      },
      progress: {
        ...previous.progress,
        [setId]: {
          sequentialIndex: 0,
        },
      },
    }));
    onSaved();
  }

  return (
    <main className="page">
      <header className="screenHeader">
        <button className="ghost" type="button" onClick={onCancel}>
          홈
        </button>
        <div>
          <p className="eyebrow">세트 가져오기</p>
          <h1>새 질문 세트 붙여넣기</h1>
        </div>
      </header>

      <section className="importLayout">
        <label className="field">
          <span>세트 이름</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <label className="field">
          <span>질문 데이터</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={SAMPLE} />
        </label>

        <details className="sampleBox">
          <summary>입력 형식 예시</summary>
          <pre>{SAMPLE}</pre>
        </details>

        <div className="buttonRow">
          <button type="button" onClick={analyze}>
            분석하기
          </button>
          <button className="primary" type="button" onClick={save} disabled={previews.length === 0 || hasErrors}>
            저장
          </button>
          <button className="ghost" type="button" onClick={onCancel}>
            취소
          </button>
        </div>

        {message ? <p className="errorText">{message}</p> : null}
        {previews.length > 0 ? <ImportPreview previews={previews} /> : null}
      </section>
    </main>
  );
}
