import { useRef, useState } from "react";
import type { ProcessResult } from "./App";

type ChatBubbleProps = {
  text: string;
  sender: "user" | "assistant";
  correction?: ProcessResult;
};

export default function ChatBubble({ text, sender, correction }: ChatBubbleProps) {
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
            <section className="correction-card">
              {/* vocabulary, corrected sentence, grammar note */}
            </section>
          )}
        </>
      )}
    </article>
  );
}
