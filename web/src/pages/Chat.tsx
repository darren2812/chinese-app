import { useRef, useState, useEffect } from "react";
import ChatBubble from "../components/ChatBubble";
import "./App.css";
import { apiFetch } from "../lib/api";
import { useParams, useNavigate } from "react-router";

export type BaseComponent = {
  type: "vocab" | "grammar" | "phrase" | "clause";
  mandarin: string;
  pinyin: string;
  english: string;
};

export type SelectionAnalysis = {
  selection_type: "single" | "mixed" | "awkward";
  components: BaseComponent[];
  explanation: string;
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "assistant";
  correction?: ProcessResult;
  selectionAnalysis?: SelectionAnalysis;
};

type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  correction: ProcessResult | null;
};

export type ProcessResult = {
  components: BaseComponent[];
  corrected_sentence: string;
  grammar_note: string | null;
};

type CreateMessageInput = {
  conversationId: string;
  content: string;
};

function Chat() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [firstChat, setFirstChat] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const { conversationId } = useParams();
  const navigate = useNavigate();

  async function getResponse(userMessageId: string): Promise<StoredMessage> {
    const response = await apiFetch("/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message_id: userMessageId }),
    });

    if (!response.ok) {
      throw new Error("Could not generate response");
    }

    const data = await response.json();
    return data;
  }

  async function processSentence(
    userMessageId: string,
  ): Promise<ProcessResult> {
    const response = await apiFetch("/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message_id: userMessageId }),
    });

    if (!response.ok) {
      throw new Error("Could not process sentence");
    }

    const result = await response.json();

    console.log(result);
    return result;
  }

  async function createConversation(): Promise<string> {
    const response = await apiFetch("/conversations", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Could not create conversation");
    }
    const result: { id: string } = await response.json();

    return result.id;
  }

  async function createMessage({
    conversationId,
    content,
  }: CreateMessageInput): Promise<string> {
    const response = await apiFetch("/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not create message");
    }

    const result: { id: string } = await response.json();
    return result.id;
  }

  async function handleRecordedAudio(audioBlob: Blob) {
    const transcription = await sendAudioForTranscription(audioBlob);

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      activeConversationId = await createConversation();
      navigate(`/app/chat/${activeConversationId}`, { replace: true });
    }

    const userMessageId = await createMessage({
      conversationId: activeConversationId,
      content: transcription,
    });

    setMessages((messages) => [
      ...messages,
      {
        id: userMessageId,
        text: transcription,
        sender: "user",
      },
    ]);

    const responsePromise = getResponse(userMessageId);
    const processPromise = processSentence(userMessageId);

    const assistantResponse = await responsePromise;

    setMessages((messages) => [
      ...messages,
      {
        id: assistantResponse.id,
        text: assistantResponse.content,
        sender: assistantResponse.role,
      },
    ]);

    // 4. Process was already running in parallel
    const processResult = await processPromise;

    if (
      processResult.components.length > 0 ||
      processResult.corrected_sentence?.trim() ||
      processResult.grammar_note?.trim()
    ) {
      setMessages((messages) =>
        messages.map((message) =>
          message.id === userMessageId
            ? { ...message, correction: processResult }
            : message,
        ),
      );
    }
  }

  async function handleOnRecordingClick() {
    if (recording) {
      // access the current reference of the media recorder and stop it
      mediaRecorderRef.current?.stop();
      setRecording(false);
      setFirstChat(false);
    } else {
      // clear previous recording data
      audioChunksRef.current = [];
      try {
        // ask user for microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // create the media recorder that uses the mic stream
        const mediaRecorder = new MediaRecorder(stream);

        // pushes media recorder data to audio chunks
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // defining media recorder behavior when stopped
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          stream.getTracks().forEach((track) => track.stop());

          try {
            await handleRecordedAudio(audioBlob);
          } catch (error) {
            console.log("Could not transcribe", error);
          }
        };

        // store this instance of the media recorder on the ref
        mediaRecorderRef.current = mediaRecorder;

        // start the media recorder
        mediaRecorder.start();
        setRecording(true);
      } catch (error) {
        console.log("Could not access microphone", error);
      }
    }
  }

  async function handleAssistantSelection(selection: string, sentence: string) {
    console.log("Selection: ", selection, "Sentence: ", sentence);
    const response = await apiFetch("/explain-selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selection,
        sentence,
      }),
    });

    if (!response.ok) {
      throw new Error("Could not explain selection.");
    }

    const result = await response.json();

    console.log(result);
    return result as SelectionAnalysis;
  }

  async function sendAudioForTranscription(audioBlob: Blob) {
    const formData = new FormData();

    const extensionByMimeType: Record<string, string> = {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/wav": "wav",
    };

    const baseMimeType = audioBlob.type.split(";")[0];
    const extension = extensionByMimeType[baseMimeType] ?? "audio";

    formData.append("file", audioBlob, `recording.${extension}`);

    const response = await apiFetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Transcription failed");
    }

    const data: { text: string } = await response.json();
    console.log(data.text);
    return data.text;
  }

  // const submittedTestPrompt = useRef(false);

  useEffect(() => {
    /*
    const prompt = import.meta.env.VITE_SUBMIT_TEST_PROMPT?.trim();

    if (!prompt || submittedTestPrompt.current) {
      return;
    }

    submittedTestPrompt.current = true;

    async function submitTestPrompt() {
      try {
        const activeConversationId =
          conversationId ?? (await createConversation());

        setConversationId(activeConversationId);

        const userMessageId = await createMessage({
          conversationId: activeConversationId,
          content: prompt,
        });

        setFirstChat(false);
        setMessages([{ id: userMessageId, text: prompt, sender: "user" }]);

        const responsePromise = getResponse(userMessageId);
        const processPromise = processSentence(userMessageId);

        const assistantText = await responsePromise;

        setMessages((messages) => [
          ...messages,
          {
            id: crypto.randomUUID(),
            text: assistantText,
            sender: "assistant",
          },
        ]);

        const correction = await processPromise;

        setMessages((messages) =>
          messages.map((message) =>
            message.id === userMessageId ? { ...message, correction } : message,
          ),
        );
      } catch (error) {
        console.error("Could not submit test prompt", error);
      }
    }

    void submitTestPrompt();
    */

    if (!conversationId) {
      setMessages([]);
      setFirstChat(true);
      return;
    }

    async function loadConversation() {
      const response = await apiFetch(
        `/conversations/${conversationId}/messages`,
      );
      if (!response.ok) throw new Error("Could not load conversation");

      const stored: StoredMessage[] = await response.json();

      setMessages(
        stored.map((message) => ({
          id: message.id,
          text: message.content,
          sender: message.role,
        })),
      );
      setFirstChat(stored.length === 0);
    }

    void loadConversation();
  }, [conversationId]);

  return (
    <>
      <main className="chat">
        <section className="chat__messages" aria-live="polite">
          {firstChat ? (
            <p className="chat__empty">Start speaking…</p>
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                text={message.text}
                sender={message.sender}
                correction={message.correction}
                onSelection={
                  message.sender === "assistant"
                    ? handleAssistantSelection
                    : undefined
                }
              />
            ))
          )}
        </section>

        <footer className="chat__composer">
          <button
            type="button"
            className="recording-btn"
            onClick={handleOnRecordingClick}
          >
            {recording ? "Stop recording" : "Start recording"}
          </button>
        </footer>
      </main>
    </>
  );
}

export default Chat;
