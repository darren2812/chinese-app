import { useRef, useState } from "react";
import ChatBubble from "./ChatBubble";
import "./App.css";

function App() {
  type Message = {
    id: string;
    text: string;
    sender: "user" | "assistant";
  };

  type VocabularyItem = {
    english: string;
    chinese: string;
    pinyin: string;
  };

  type ProcessResult = {
    vocabulary: VocabularyItem[];
    corrected_sentence: string;
    grammar_note: string | null;
  };

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [firstChat, setFirstChat] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);

  async function getResponse(message: string): Promise<string> {
    const response = await fetch("http://localhost:8000/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error("Could not generate response");
    }

    const data: { text: string } = await response.json();
    return data.text;
  }

  async function processSentence(message: string): Promise<ProcessResult> {
    const response = await fetch("http://localhost:8000/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error("Could not process sentence");
    }

    const result = response.json();
    
    console.log(result);
    return result;
  }

  async function handleRecordedAudio(audioBlob: Blob) {
    const transcription = await sendAudioForTranscription(audioBlob);

    setMessages((messages) => [
      ...messages,
      {
        id: crypto.randomUUID(),
        text: transcription,
        sender: "user",
      },
    ]);

    const responsePromise = getResponse(transcription);
    const processPromise = processSentence(transcription);

    const assistantResponse = await responsePromise;

    setMessages((messages) => [
      ...messages,
      {
        id: crypto.randomUUID(),
        text: assistantResponse,
        sender: "assistant",
      },
    ]);

    // 4. Process was already running in parallel
    const processResult = await processPromise;
    setProcessResult(processResult);
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

          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);

          stream.getTracks().forEach((track) => track.stop());

          try {
            handleRecordedAudio(audioBlob);
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

    const response = await fetch("http://localhost:8000/transcribe", {
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

  return (
    <>
      <main className="chat">
        <section className="chat__messages" aria-live="polite">
          {firstChat ? (
            <p className="chat__empty">Start speaking…</p>
          ) : (
            // Render conversation messages here
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                text={message.text}
                sender={message.sender}
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

export default App;
