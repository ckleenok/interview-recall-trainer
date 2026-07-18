import type { ParsedQuestionPreview } from "../types/interview";

interface ImportPreviewProps {
  previews: ParsedQuestionPreview[];
}

export function ImportPreview({ previews }: ImportPreviewProps) {
  const validCount = previews.filter((preview) => preview.errors.length === 0).length;

  return (
    <section className="previewPanel" aria-labelledby="preview-title">
      <h2 id="preview-title">미리보기</h2>
      <p>
        인식된 질문 {previews.length}개 · 저장 가능 {validCount}개
      </p>
      <div className="previewList">
        {previews.map((preview, index) => (
          <article className="previewItem" key={`${preview.question.id}-${index}`}>
            <strong>
              {index + 1}. {preview.question.question || "질문 없음"}
            </strong>
            <p>{preview.question.keySentence || "핵심 문장 없음"}</p>
            <span>키워드 {preview.question.keywords.length}개</span>
            {preview.errors.map((error) => (
              <p className="errorText" key={error}>
                오류: {error}
              </p>
            ))}
            {preview.warnings.map((warning) => (
              <p className="warningText" key={warning}>
                경고: {warning}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
