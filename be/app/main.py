import os
import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, field_validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Transcription failed (filename=%r, content_type=%r)",
            file.filename,
            file.content_type,
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to transcribe audio right now.",
        ) from exc


class ChatRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value

@app.post("/respond")
def respond(request: ChatRequest):
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions=(
                "You are a Mandarin conversation partner. "
                "The learner may mix English words into Chinese sentences. "
                "Understand the intended meaning and continue the conversation naturally in simplified Mandarin. "
            ),
            input=request.message,
        )

        text = response.output_text

        if not text.strip():
            raise HTTPException(
                status_code=502,
                detail="The model returned an empty response.",
            )

        return {"text": text}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Response generation failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate a response right now.",
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
                1. Create a vocabulary item only for an English word or contiguous English phrase
                that appears verbatim in the transcript.
                2. Copy that exact text into the `english` field. Do not conjugate, paraphrase,
                infer, translate, or add English words.
                3. Never create vocabulary from the corrected sentence or grammar explanation.
                4. For each English word or phrase, provide:
                    - a natural Chinese equivalent
                    - pinyin
                5. Identify at most one important grammar issue, only if there is a meaningful issue. Output in English.
                6. If there are no English words in the transcript, return an empty vocabulary list.
                7. If there is no meaningful grammar issue, return null for the grammar note.
                8. If no grammar issues or English words in the transcript, return null for the corrected sentence.
                """,
            input=request.message,
            text_format=ProcessedSentence,
        )

        result = response.output_parsed

        if result is None:
            raise HTTPException(
                status_code=502,
                detail="The response could not be processed.",
            )

        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Sentence processing failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to process the sentence right now.",
        ) from exc
