from enum import Enum
from uuid import UUID
from pydantic import BaseModel, field_validator


class MessageIdRequest(BaseModel):
    message_id: UUID


class ProcessedSentence(BaseModel):
    components: list[BaseComponent]
    corrected_sentence: str | None
    grammar_note: str | None


class ComponentType(str, Enum):
    VOCAB = "vocab"
    GRAMMAR = "grammar"
    PHRASE = "phrase"
    CLAUSE = "clause"


class BaseComponent(BaseModel):
    type: ComponentType
    mandarin: str
    pinyin: str
    english: str


class SelectionType(str, Enum):
    SINGLE = "single"
    MIXED = "mixed"
    AWKWARD = "awkward"


class SelectionAnalysis(BaseModel):
    selection_type: SelectionType
    components: list[BaseComponent]
    explanation: str


class HoverRequest(BaseModel):
    selection: str
    sentence: str


class VocabSource(str, Enum):
    DETECTED = "detected"
    USER_MANDARIN = "user_mandarin"
    USER_ENGLISH = "user_english"


class Role(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class CreateMessageRequest(BaseModel):
    conversation_id: str
    content: str
