from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict

#------------------ Test cases -----------------
class TestCaseIn(BaseModel):
    """One case as it appears in JSON file."""
    id: str # this becomes the case_key in the database
    input: str
    expected: dict
    tags: list[str] = []

class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_key: str
    input_text: str
    expected_output: dict
    tags: list[str]

# --------------- Datasets -----------------
class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    created_at: datetime

class DatasetDetail(DatasetOut):
    test_cases: list[TestCaseOut]

# --------------- Prompt Versions -----------------
class PromptVersionCreate(BaseModel):
    name: str
    prompt_text: str
    provider: Literal["groq"]
    model: str

class PromptVersionOut(PromptVersionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int