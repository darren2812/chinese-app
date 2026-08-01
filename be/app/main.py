import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv();

app = FastAPI()
client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

@app.post("/transcribe") 
def transcribe(file: UploadFile = File(...)):
    try:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=(
                file.filename or "recording.webm",
                file.file,
                file.content_type or "audio/webm"
            )
        )

        return {"text": transcription.text}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Audio transcription failed"
        ) from exc