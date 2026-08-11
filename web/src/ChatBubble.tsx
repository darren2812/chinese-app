type ChatBubbleProps = {
  text: string;
  sender: "user" | "assistant";
};

export default function ChatBubble({ text, sender }: ChatBubbleProps) {
  return <div className={`chat-bubble chat-bubble--${sender}`}>{text}</div>;
}
