from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError

from models.database import ValidationBatchORM, ValidationFileORM
from schema import (
    ActiveBatchResponse,
    ValidationBatchResponse,
    ValidationFile,
    ValidationFileId,
    ValidationPromptResult,
)


def batch_orm_to_schema(batch_orm: ValidationBatchORM) -> ValidationBatchResponse:
    return ValidationBatchResponse(
        id=batch_orm.id,
        status=batch_orm.status,
        file_ids=[
            ValidationFileId(id=file.id, file_name=file.file_name)
            for file in batch_orm.files
        ],
        completed_prompts=batch_orm.completed_prompts,
        prompt_results=[dict_to_prompt_result(pr) for pr in batch_orm.prompt_results],
        created_at=batch_orm.created_at,
        updated_at=batch_orm.updated_at,
    )


def dict_to_prompt_result(d: dict) -> ValidationPromptResult:
    try:
        return ValidationPromptResult.model_validate(d)
    except PydanticValidationError as e:
        raise ValueError(f"Invalid prompt result data: {e}") from e


def file_orm_to_schema(file_orm: ValidationFileORM) -> ValidationFile:
    return ValidationFile(
        id=file_orm.id,
        file_name=file_orm.file_name,
        content=file_orm.content,
        file_type=file_orm.file_type,
        created_at=file_orm.created_at,
    )


def sync_from_orm_inplace(dst_model: BaseModel, orm_obj: object) -> None:
    tmp = dst_model.__class__.model_validate(orm_obj, from_attributes=True)
    data = tmp.model_dump()
    for key, value in data.items():
        setattr(dst_model, key, value)


def batch_orm_to_active_response(
    batch_orm: ValidationBatchORM,
) -> ActiveBatchResponse:
    return ActiveBatchResponse(
        id=batch_orm.id,
        status=batch_orm.status,
        file_ids=[
            ValidationFileId(id=file.id, file_name=file.file_name)
            for file in batch_orm.files
        ],
        selected_prompts=[
            dict_to_prompt_result(pr).prompt for pr in batch_orm.prompt_results
        ],
        completed_prompts=batch_orm.completed_prompts,
        created_at=batch_orm.created_at,
    )
