from datetime import datetime
from zoneinfo import ZoneInfo
from enum import Enum
from pathlib import Path
from typing import Annotated

from ollama import ChatResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field
from pydantic.json_schema import JsonSchemaValue


#######################################################
# General
########################################################
class Status(str, Enum):
    waiting = "waiting"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Severity(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class IssueType(str, Enum):
    """Type of issue found during validation. (Experimental, may be extended or deleted in the future)"""

    security = "security"
    quality = "quality"
    best_practice = "best_practice"
    malicious_operation = "malicious_operation"
    licensing = "licensing"
    machine_specifications = "machine_specifications"
    file_paths_and_permissions = "file_paths_and_permissions"


class ValidationIssue(BaseModel):
    """An issue LLM found in files. A list of these is the schema for the model's JSON output."""

    model_config = ConfigDict(use_enum_values=True)

    severity: Severity
    description: str
    lines: list[int] | None
    # type: IssueType  # Experimental, may be extended or deleted in the future
    type: str  # Experimental, may be extended or deleted in the future


#######################################################
# Prompt
#######################################################

PromptCatName = Annotated[str, StringConstraints(pattern=r"^[^:]+::[^:]+$")]


class PromptCategoryKind(str, Enum):
    """Categories for prompts."""

    pipeline_validity = "pipeline_validity"
    pipeline_usability = "pipeline_usability"
    pipeline_portability = "pipeline_portability"
    artifacts_reproducibility = "artifacts_reproducibility"
    artifacts_anonymity = "artifacts_anonymity"
    artifacts_validity = "artifacts_validity"


class PromptInfo(BaseModel):
    """Information about each prompt. The file named all.txt is flagged with has_all=True."""

    model_config = ConfigDict(use_enum_values=True)

    name: str  # file name without extension
    category: PromptCategoryKind
    description: str | None = None
    sha256: str | None = None  # SHA256 hash of the prompt file taken when listing.

    @computed_field
    def has_all(self) -> bool:
        return self.name == "all"


class PromptCategory(BaseModel):
    """Group of prompts."""

    category: PromptCategoryKind
    prompts: list[PromptInfo]


class PromptContentResponse(BaseModel):
    """Response for /api/prompts/?name=&cat=."""

    name: str
    category: PromptCategoryKind
    content: str
    sha256: str  # SHA256 hash of the prompt file taken when returning. Verifies integrity by comparing with PromptInfo.sha256


class ValidationPromptResult(BaseModel):
    """A validation result for a specific prompt."""

    prompt: PromptInfo
    status: Status = Status.processing
    error_message: str | None = None
    result: list[ValidationIssue] | None = None
    total_duration_ns: int | None = None
    eval_duration_ns: int | None = None
    load_duration_ns: int | None = None
    prompt_eval_duration_ns: int | None = None


########################################################
# Target files
########################################################
class ValidationFileIdModel(BaseModel):
    """A information about file to be validated."""

    file_name: str


class ValidationFileId(ValidationFileIdModel):
    id: int = Field(...)


class ValidationFileModel(BaseModel):
    """Whole information about file."""

    file_name: str
    content: str
    file_type: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("UTC")),
        description="UTC timestamp",
    )


class ValidationFile(ValidationFileModel):
    id: int = Field(...)


class ValidationFileContentResponse(ValidationFile):
    """Response for /api/files/{file_id}. (Maybe)"""

    pass


#########################################################
# Validation batch
#########################################################
class ValidationBatchModel(BaseModel):
    """Results for a batch of files validated with selected prompts."""

    model_config = ConfigDict(use_enum_values=True)

    name: str = Field(..., max_length=255, description="Name of the validation batch")
    status: Status = Status.waiting
    file_ids: list[ValidationFileId]
    completed_prompts: int
    prompt_results: list[ValidationPromptResult]
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("UTC")),
        description="UTC timestamp",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("UTC")),
        description="UTC timestamp",
    )

    @computed_field
    def total_files(self) -> int:
        return len(self.file_ids)

    @computed_field
    def total_prompts(self) -> int:
        return len(self.prompt_results)


class ValidationBatchResponse(ValidationBatchModel):
    """Response for /api/validate."""

    id: int = Field(...)


#########################################################
# Validation log
#########################################################
# ページネーションレスポンス
class ValidationLogsPagenatedResponse(BaseModel):
    logs: list[ValidationBatchResponse]
    curr_page: int
    total_pages: int
    per_page: int
    total: int
    has_next: bool
    has_prev: bool


# 進行中バッチレスポンス
class ActiveBatchResponse(BaseModel):
    """list of this is a Response for /api/validation/active_batches"""

    id: int
    name: str
    status: Status
    file_ids: list[ValidationFileId]
    selected_prompts: list[PromptInfo]
    completed_prompts: int
    created_at: datetime
