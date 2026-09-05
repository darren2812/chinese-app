import "./LearningItemCard.css";

export type LearningItem = {
  id: string;
  english: string;
  mandarin: string;
  pinyin: string;
  type: "vocab" | "grammar" | "phrase" | "clause";
  source: "detected" | "user" | "assistant";
  created_at: string;
};

export type StartingLanguage = "english" | "mandarin";

type LearningItemCardProps = {
  item: LearningItem;
  flipped: boolean;
  pinyinVisible: boolean;
  startingLanguage: StartingLanguage;
  onFlip: () => void;
  onTogglePinyin: () => void;
};

export default function LearningItemCard({
  item,
  flipped,
  pinyinVisible,
  startingLanguage,
  onFlip,
  onTogglePinyin,
}: LearningItemCardProps) {
  const frontIsMandarin = startingLanguage === "mandarin";
  const activeSide = flipped ? "back" : "front";

  function renderFace(side: "front" | "back", isMandarin: boolean) {
    const isActive = activeSide === side;
    const faceText = isMandarin ? item.mandarin : item.english;

    return (
      <div
        className={`vocabulary-card__face vocabulary-card__face--${side}`}
        aria-hidden={!isActive}
      >
        <button
          type="button"
          className="vocabulary-card__flip-button"
          onClick={onFlip}
          tabIndex={isActive ? 0 : -1}
          aria-label={`${faceText}. Flip card to show ${
            isMandarin ? "English" : "Mandarin"
          }`}
        >
          <span
            className={
              isMandarin
                ? "vocabulary-card__hanzi"
                : "vocabulary-card__english"
            }
          >
            {faceText}
          </span>

          {isMandarin && pinyinVisible && (
            <span className="vocabulary-card__pinyin">{item.pinyin}</span>
          )}
        </button>

        {isMandarin && isActive && (
          <button
            type="button"
            className="vocabulary-card__pinyin-toggle"
            onClick={onTogglePinyin}
            aria-pressed={pinyinVisible}
          >
            {pinyinVisible ? "Hide pinyin" : "Show pinyin"}
          </button>
        )}
      </div>
    );
  }

  return (
    <article
      className={`vocabulary-card${
        flipped ? " vocabulary-card--flipped" : ""
      }`}
    >
      <div className="vocabulary-card__inner">
        {renderFace("front", frontIsMandarin)}
        {renderFace("back", !frontIsMandarin)}
      </div>
    </article>
  );
}
