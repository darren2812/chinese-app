import os
import logging

from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from uuid import UUID

load_dotenv()

from .schemas import (
    MessageIdRequest,
    HoverRequest,
    ProcessedSentence,
    SelectionAnalysis,
    VocabSource,
    Role,
    CreateMessageRequest,
)
from .auth import require_user
from .database import supabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def get_user_message(message_id: UUID, user_id: str) -> dict:
    result = (
        supabase.table("messages")
        .select("id, conversation_id, user_id, role, content")
        .eq("id", str(message_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not isinstance(result.data, dict):
        raise HTTPException(status_code=404, detail="Message not found")

    if result.data["role"] != "user":
        raise HTTPException(
            status_code=400,
            detail="Responses can only be generated from user messages.",
        )

    return result.data


@app.post("/messages")
def create_message(request: CreateMessageRequest, claims: dict = Depends(require_user)):
    user_id = claims["sub"]
    try:
        insert_result = (
            supabase.table("messages")
            .insert(
                {
                    "conversation_id": str(request.conversation_id),
                    "user_id": user_id,
                    "role": Role.USER.value,
                    "content": request.content,
                }
            )
            .execute()
        )

        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Message was not returned.")

        message = insert_result.data[0]

        if not isinstance(message, dict) or not isinstance(message.get("id"), str):
            raise HTTPException(status_code=500, detail="Message has no valid ID.")

        return {"id": message["id"]}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create message for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to create the message right now.",
        ) from exc


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...), claims: dict = Depends(require_user)):
    user_id = claims["sub"]
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
            "Transcription failed for user %s (filename=%r, content_type=%r)",
            user_id,
            file.filename,
            file.content_type,
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to transcribe audio right now.",
        ) from exc


@app.post("/respond")
def respond(request: MessageIdRequest, claims: dict = Depends(require_user)):
    user_id = claims["sub"]
    try:
        message = get_user_message(request.message_id, user_id)

        response = client.responses.create(
            model="gpt-4o-mini",
            instructions=(
                "You are a Mandarin conversation partner. "
                "The learner may mix English words into Chinese sentences. "
                "Understand the intended meaning and continue the conversation naturally in simplified Mandarin. "
            ),
            input=message["content"],
        )

        assistant_text = response.output_text

        if not assistant_text.strip():
            raise HTTPException(
                status_code=502,
                detail="The model returned an empty response.",
            )

        supabase.table("messages").insert(
            {
                "conversation_id": message["conversation_id"],
                "user_id": user_id,
                "role": Role.ASSISTANT.value,
                "content": assistant_text,
            }
        ).execute()

        return {"text": assistant_text}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Response generation failed for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to generate a response right now.",
        ) from exc


@app.post("/process")
def process(request: MessageIdRequest, claims: dict = Depends(require_user)):
    user_id = claims["sub"]
    try:
        message = get_user_message(request.message_id, user_id)

        response = client.responses.parse(
            model="gpt-4o-mini",
            instructions="""
                You are analyzing one message from a Mandarin learner.

                Return concise learning feedback for this single message only.

                Your goals:
                1. Create a BaseComponent item only for one or more English words and determine whether it is 
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
            input=message["content"],
            text_format=ProcessedSentence,
        )

        result = response.output_parsed

        if result is None:
            raise HTTPException(
                status_code=502,
                detail="The response could not be processed.",
            )

        learning_item_rows = [
            {
                "user_id": user_id,
                "english": component.english,
                "mandarin": component.mandarin,
                "pinyin": component.pinyin,
                "type": component.type,
                "source": VocabSource.DETECTED.value,
            }
            for component in result.components
        ]

        if learning_item_rows:
            supabase.table("learning_items").upsert(
                learning_item_rows,
                on_conflict="user_id,english,mandarin",
            ).execute()
            supabase.table("messages").update(
                {"correction": result.model_dump(mode="json")}
            ).eq("id", str(request.message_id)).eq("user_id", user_id)

        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Sentence processing failed for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to process the sentence right now.",
        ) from exc


@app.post("/explain-selection")
def explain_selection(request: HoverRequest, claims: dict = Depends(require_user)):
    user_id = claims["sub"]
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
        logger.exception("Selection explanation failed for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to process the sentence right now.",
        ) from exc


@app.post("/conversations")
def create_conversation(claims: dict = Depends(require_user)):
    user_id = claims["sub"]
    try:
        insert_result = (
            supabase.table("conversations").insert({"user_id": user_id}).execute()
        )
        if not insert_result.data:
            raise HTTPException(
                status_code=500,
                detail="Conversation was created but Supabase did not return it.",
            )

        conversation = insert_result.data[0]
        if not isinstance(conversation, dict):
            raise HTTPException(
                status_code=500,
                detail="Supabase returned an unexpected conversation format.",
            )

        conversation_id = conversation.get("id")
        if not isinstance(conversation_id, str):
            raise HTTPException(
                status_code=500,
                detail="Created conversation has no valid ID.",
            )

        return {"id": conversation_id}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create conversation for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to create a conversation right now.",
        ) from exc


@app.get("/conversations")
def get_conversations(claims: dict = Depends(require_user)):
    user_id = claims["sub"]
    try:

        result = (
            supabase.table("conversations")
            .select("id, title, created_at, updated_at")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )

        if not isinstance(result.data, list):
            raise HTTPException(
                status_code=500,
                detail="Supabase returned an unexpected conversations format.",
            )

        return result.data

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch conversations for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch conversations right now.",
        ) from exc


@app.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: UUID,
    claims: dict = Depends(require_user),
):
    user_id = claims["sub"]

    try:
        conversation_result = (
            supabase.table("conversations")
            .select("id")
            .eq("id", str(conversation_id))
            .eq("user_id", user_id)
            .execute()
        )

        if not conversation_result.data:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        result = (
            supabase.table("messages")
            .select("id, conversation_id, role, content, correction, created_at")
            .eq("conversation_id", str(conversation_id))
            .eq("user_id", user_id)
            .order("created_at")
            .execute()
        )

        if not isinstance(result.data, list):
            raise HTTPException(
                status_code=500,
                detail="Supabase returned an unexpected messages format.",
            )

        return result.data

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Failed to fetch messages for conversation %s and user %s",
            conversation_id,
            user_id,
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch conversation messages right now.",
        ) from exc


@app.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    claims: dict = Depends(require_user),
):
    user_id = claims["sub"]

    try:
        conversation_result = (
            supabase.table("conversations")
            .delete()
            .eq("id", str(conversation_id))
            .eq("user_id", user_id)
            .execute()
        )

        if not conversation_result.data:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        return {"id": str(conversation_id), "deleted": True}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Failed to delete conversation %s for user %s",
            conversation_id,
            user_id,
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to delete conversation right now.",
        ) from exc


@app.patch("/conversations/{conversation_id}")
def update_conversation(
    conversation_id: UUID,
    title: str,
    claims: dict = Depends(require_user),
):
    user_id = claims["sub"]

    try:
        result = (
            supabase.table("conversations")
            .update({"title": title})
            .eq("id", str(conversation_id))
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation not found.")

        return result.data[0]

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update conversation for user %s", user_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to update the conversation right now.",
        ) from exc
