from enum import Enum

from pydantic import BaseModel, field_validator


class ChatRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


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
