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


class VocabularyItem(BaseModel):
    english: str
    chinese: str
    pinyin: str


class ProcessedSentence(BaseModel):
    vocabulary: list[VocabularyItem]
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
