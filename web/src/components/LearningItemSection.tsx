import LearningItemCard from "./LearningItemCard";
import type { LearningItem, StartingLanguage } from "./LearningItemCard";
import "./LearningItemSection.css";

type LearningItemSectionProps = {
  title: string;
  emptyMessage: string;
  items: LearningItem[];
  flippedIds: Set<string>;
  pinyinIds: Set<string>;
  startingLanguage: StartingLanguage;
  onFlip: (id: string) => void;
  onTogglePinyin: (id: string) => void;
  onDelete: (id: string) => void;
  onAddToList?: (id: string) => void;
};

export default function LearningItemSection({
  title,
  emptyMessage,
  items,
  flippedIds,
  pinyinIds,
  startingLanguage,
  onFlip,
  onTogglePinyin,
  onDelete,
  onAddToList,
}: LearningItemSectionProps) {
  return (
    <section className="vocabulary-section">
      <h2>{title}</h2>

      {items.length > 0 ? (
        <div className="vocabulary-grid">
          {items.map((item) => (
            <LearningItemCard
              key={item.id}
              item={item}
              flipped={flippedIds.has(item.id)}
              pinyinVisible={pinyinIds.has(item.id)}
              startingLanguage={startingLanguage}
              onFlip={() => onFlip(item.id)}
              onTogglePinyin={() => onTogglePinyin(item.id)}
              onDelete={() => onDelete(item.id)}
              onAddToList={onAddToList ? () => onAddToList(item.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="vocabulary-section__empty">{emptyMessage}</p>
      )}
    </section>
  );
}
