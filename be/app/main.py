import os
import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

from .schemas import ChatRequest, HoverRequest, ProcessedSentence, SelectionAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

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
                file.content_type or "audio/webm",
            ),
            prompt="Use Simplified Chinese for Mandarin. Preserve English words as English.",
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


@app.post("/process")
def process(request: ChatRequest):
    try:
        response = client.responses.parse(
            model="gpt-4o-mini",
            instructions="""
                You are analyzing one message from a Mandarin learner.

                Return concise learning feedback for this single message only.

                Your goals:
                1. Create a BaseComponent item only for one or more English words and dtermine whether it is 
                a vocab item, grammar, phrase, or clause.
                2. Copy that exact text into the `english` field. Do not conjugate, paraphrase,
                infer, translate, or add English words.
                3. Never create BaseComponents from the corrected sentence or grammar explanation.
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


@app.post("/explain-selection")
def explain_selection(request: HoverRequest):
    try:
        response = client.responses.parse(
            model="gpt-4o-mini",
            instructions="""
                Analyze the user's selected Mandarin text using the full sentence as context.

                Return one or more meaningful linguistic components.

                Rules:
                - Each component must be classified as vocab, grammar, phrase, or clause.
                - For each component, provide its Mandarin, pinyin, and natural English meaning in context.
                - If the selection corresponds to one meaningful unit, classify the selection as single.
                - If the selection contains multiple independently meaningful units, classify it as mixed and return each unit as a separate component.
                - If the selection cuts awkwardly across word, phrase, or grammar boundaries, classify it as awkward and return the natural components that the selection overlaps.
                - Do not translate an awkward selection literally.
                - If the selected text is only part of a larger grammar pattern, return the full relevant grammar pattern as the component.
                - Prefer reusable learning units when possible. Use clause only when the selected meaning is best represented as a full clause.
                - Keep meanings concise and learner-friendly.
                """,
            input=f"""
                Selected text: {request.selection}
                Full sentence: {request.sentence}
                """,
            text_format=SelectionAnalysis,
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
