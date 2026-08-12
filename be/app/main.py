import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

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
            ),
            prompt="Use Simplified Chinese for Mandarin. Preserve English words as English."
        )

        return {"text": transcription.text}
    except Exception as exc:
        print ("Transcription Error: ", repr(exc))
        print("filename:", file.filename)
        print("content type:", file.content_type)
        contents = file.file.read()
        print("size:", len(contents))
        file.file.seek(0)
        raise HTTPException(
            status_code=502,
            detail="Unable to transcribe audio right now."
        ) from exc
        
class ChatRequest(BaseModel):
    message: str

@app.post("/respond")
def respond(request: ChatRequest):
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions=(
                "You are a Mandarin conversation partner. "
                "The learner may mix English words into Chinese sentences. "
                "Understand the intended meaning and continue the conversation naturally. "
            ),
            input=request.message
        )
        return {"text": response.output_text}
    except Exception as exc:
        print ("Response Error: ", repr(exc))
        raise HTTPException(
            status_code=502,
            detail="Unable to generate a response right now."
        ) from exc
        
class VocabularyItem(BaseModel):
    english: str
    chinese: str
    pinyin: str

class ProcessedSentence(BaseModel):
    vocabulary: list[VocabularyItem]
    corrected_sentence: str | None
    grammar_note: str | None
        
@app.post("/process")
def process(request: ChatRequest):
    try:
        response = client.responses.parse(
            model="gpt-4o-mini",
            instructions="""
                You are analyzing one message from a Mandarin learner.

                Return concise learning feedback for this single message only.

                Your goals:
                1. For each English word or phrase, provide:
                - a natural Chinese equivalent
                - pinyin
                2. Provide a natural corrected Mandarin version of the full sentence.
                3. Identify at most one important grammar issue, only if there is a meaningful issue.
                4. If there are no English words, return an empty vocabulary list.
                5. If there is no meaningful grammar issue, return null for the grammar note.
                """,
            input=request.message,
            text_format=ProcessedSentence
        )
        
        result = response.output_parsed

        if result is None:
            raise HTTPException(
                status_code=502,
                detail="The response could not be processed."
            )

        return result

    except HTTPException:
        raise
    except Exception as exc:
        print("Process Error:", repr(exc))
        raise HTTPException(
            status_code=502,
            detail="Unable to process the sentence right now."
        ) from exc