import { useRef, useState } from "react";
import type { ProcessResult } from "./App";

type ChatBubbleProps = {
  text: string;
  sender: "user" | "assistant";
  correction?: ProcessResult;
};

export default function ChatBubble({
  text,
  sender,
  correction,
}: ChatBubbleProps) {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  return (
    <article className={`message message--${sender}`}>
      <div className={`chat-bubble chat-bubble--${sender}`}>{text}</div>

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
