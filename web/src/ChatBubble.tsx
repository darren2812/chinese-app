import { useState } from "react";
import type { ProcessResult } from "./App";

type ChatBubbleProps = {
  text: string;
  sender: "user" | "assistant";
  correction?: ProcessResult;
  onSelection?: (selection: string, sentence: string) => void | Promise<void>;
};

export default function ChatBubble({
  text,
  sender,
  correction,
  onSelection,
}: ChatBubbleProps) {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    const selection = window.getSelection()?.toString().trim();

    if (!selection || !onSelection) return;

    const sentence = getSelectedSentence(event.currentTarget);
    if (!sentence) return;

    void onSelection(selection, sentence);
  }

  return (
    <article className={`message message--${sender}`}>
      <div
        className={`chat-bubble chat-bubble--${sender}`}
        onMouseUp={sender === "assistant" ? handleMouseUp : undefined}
      >
        {text}
      </div>

      {sender === "user" && correction && (
        <>
          <button
            type="button"
            className="correction-toggle"
            onClick={() => setIsCorrectionOpen(!isCorrectionOpen)}
            aria-expanded={isCorrectionOpen}
          >
            Chinese help
          </button>

          {isCorrectionOpen && (
            <section className="correction-card" aria-label="Chinese help">
              {correction.vocabulary.length > 0 && (
                <div className="correction-card__section">
                  <h3 className="correction-card__heading">Vocabulary</h3>
                  <ul className="correction-card__vocabulary">
                    {correction.vocabulary.map((word) => (
                      <li key={`${word.english}-${word.chinese}`}>
                        <strong>{word.english}</strong>
                        <span> → {word.chinese}</span>
                        <span className="correction-card__pinyin">
                          {" "}
                          · {word.pinyin}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {correction.corrected_sentence && (
                <div className="correction-card__section">
                  <h3 className="correction-card__heading">
                    Corrected sentence
                  </h3>
                  <p>{correction.corrected_sentence}</p>
                </div>
              )}

              {correction.grammar_note && (
                <div className="correction-card__section">
                  <h3 className="correction-card__heading">Grammar note</h3>
                  <p>{correction.grammar_note}</p>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </article>
  );
}

function getSelectedSentence(container: HTMLElement) {
  const selection = window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    !selection.toString().trim()
  ) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!container.contains(range.startContainer)) {
    return null;
  }

  const text = container.textContent ?? "";
  const punctuation = new Set(["。", "！", "？", ".", "!", "?", "\n"]);

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(container);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const start = beforeRange.toString().length;
  const end = start + selection.toString().length;

  let sentenceStart = start;
  while (sentenceStart > 0 && !punctuation.has(text[sentenceStart - 1])) {
    sentenceStart--;
  }

  let sentenceEnd = end;
  while (sentenceEnd < text.length && !punctuation.has(text[sentenceEnd])) {
    sentenceEnd++;
  }

  if (sentenceEnd < text.length) {
    sentenceEnd++;
  }

  return text.slice(sentenceStart, sentenceEnd).trim();
}
