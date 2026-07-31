import { useRef, useState } from "react";
import "./App.css";

function App() {
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function handleOnRecordingClick() {
    if (recording) {
      // access the current reference of the media recorder and stop it
      mediaRecorderRef.current?.stop();
      setRecording(false);
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

        // pushes media recorder data to audio chunks
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // start the media recorder
        mediaRecorder.start();
        setRecording(true);
      } catch (error) {
        console.log("Could not access microphone", error);
      }
    }
  }

  return (
    <>
      <section id="center">
        <div>
          <h1>{recording ? "Recording..." : "Start speaking..."}</h1>
        </div>
        <button
          type="button"
          className={`recording-btn ${recording ? "recording-active" : "recording-idle"}`}
          onClick={handleOnRecordingClick}
        >
          {recording ? "Stop recording..." : "Start recording"}
        </button>
        {audioUrl && <audio src={audioUrl} controls />}
      </section>
    </>
  );

  async function sendAudioForTranscription(audioBlob: Blob) {
    const formData = new FormData();

    formData.append(
      "file",
      audioBlob,
      mediaRecorderRef.current?.mimeType.includes("webm")
        ? "recording.webm"
        : "recording.wav",
    );

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
}

export default App;
