import { useRef, useState } from "react";
import "./App.css";

function App() {
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [firstChat, setFirstChat] = useState<boolean>(true);

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
            await sendAudioForTranscription(audioBlob);
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
  }

  return (
    <>
      <main className="chat">
        <section className="chat__messages" aria-live="polite">
          {firstChat ? (
            <p className="chat__empty">Start speaking…</p>
          ) : (
            // Render conversation messages here
            <div>...</div>
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
