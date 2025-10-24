from datetime import UTC

from models.database import ValidationBatchORM, ValidationFileORM, db_dependency
from schema import (
    PromptInfo,
    Status,
    ValidationBatchModel,
    ValidationBatchResponse,
    ValidationFile,
    ValidationFileId,
    ValidationFileModel,
    ValidationPromptResult,
)
from services.converter import (
    batch_orm_to_schema,
    file_orm_to_schema,
)
from services.ollama_service import OllamaService
from services.prompt_service import PromptService


class ValidationService:
    def __init__(self):
        self.ollama_service = OllamaService()
        self.prompt_service = PromptService()

    @classmethod
    def _get_file_type(cls, filename: str) -> str:
        extension = filename.split(".")[-1].lower()
        type_mapping = {
            "yaml": "yaml",
            "yml": "yaml",
            "cwl": "cwl",
            "sh": "shell",
            "c": "c",
            "h": "c",
            "py": "python",
            "js": "javascript",
            "ts": "typescript",
            "json": "json",
            "toml": "toml",
            "md": "markdown",
        }
        return type_mapping.get(extension, "text")

    def create_validation_batch_and_files(
        self,
        file_models: list[ValidationFileModel],
        prompts: list[PromptInfo],
        batch_name: str,
        db: db_dependency,
    ) -> tuple[ValidationBatchResponse, list[ValidationFile]]:
        batch_orm = ValidationBatchORM(
            name=batch_name,
            status=Status.waiting,
            completed_prompts=0,
            prompt_results=[
                ValidationPromptResult(prompt=prompt).model_dump() for prompt in prompts
            ],
        )

        batch_orm.files = [
            ValidationFileORM(**file.model_dump()) for file in file_models
        ]

        db.add(batch_orm)
        db.flush()

        files: list[ValidationFile] = [
            file_orm_to_schema(file_orm) for file_orm in batch_orm.files
        ]

        db.refresh(batch_orm)
        db.commit()

        return (batch_orm_to_schema(batch_orm), files)

        # # Add file record
        # file_orms = [ValidationFileORM(**file.model_dump()) for file in file_models]
        # db.add_all(file_orms)
        # db.commit()
        # for file_orm in file_orms:
        #     db.refresh(file_orm)

        # files: list[ValidationFile] = [
        #     file_orm_to_schema(file_orm) for file_orm in file_orms
        # ]

        # batch = ValidationBatchModel(
        #     status=Status.waiting,
        #     file_ids=[
        #         ValidationFileId(id=file_orm.id, file_name=file_orm.file_name)
        #         for file_orm in file_orms
        #     ],
        #     completed_prompts=0,
        #     prompt_results=[
        #         ValidationPromptResult(**prompt.model_dump()) for prompt in prompts
        #     ],
        # )
        # batch_orm = ValidationBatchORM(**batch.model_dump())
        # db.add(batch_orm)
        # db.commit()
        # db.refresh(batch_orm)

        # return (batch_orm_to_schema(batch_orm), files)

    async def process_file_validation(
        self,
        batch_id: int,
        prompt_task: ValidationPromptResult,
        prompt_index: int,
        files: list[ValidationFile],
        db: db_dependency,
    ) -> None:
        # TODO NEED LOGGING

        prompt_info = prompt_task.prompt
        prompt_content_resp = self.prompt_service.load_prompt_content(
            prompt_info.name, prompt_info.category
        )
        if prompt_content_resp is None:
            # TODO need to create proper error
            raise ValueError(
                f"Prompt '{prompt_info.category}::{prompt_info.name}' not found"
            )

        await self.ollama_service.validate_files_with_prompt(
            files, prompt_info, prompt_content_resp.content, prompt_task
        )

        batch: ValidationBatchORM | None = db.get(ValidationBatchORM, batch_id)
        if not batch:
            raise ValueError(f"Batch with ID {batch_id} not found")

        updated_results = batch.prompt_results.copy()
        updated_results[prompt_index] = prompt_task.model_dump()
        batch.prompt_results = updated_results

        batch.completed_prompts += 1
        if batch.completed_prompts >= len(batch.prompt_results):
            batch.status = Status.completed
        db.commit()
        db.refresh(batch)

        return


def change_batch_status(
    batch_orig: ValidationBatchResponse, new_status: Status, db: db_dependency
) -> None:
    batch: ValidationBatchORM | None = db.get(ValidationBatchORM, batch_orig.id)
    if not batch:
        raise ValueError(f"Batch with ID {batch_orig.id} not found")
    batch.status = new_status
    db.commit()
    db.refresh(batch)

    batch_orig.status = new_status


def increment_completed_prompts_of_batch(batch_id: int, db: db_dependency) -> None:
    batch: ValidationBatchORM | None = db.get(ValidationBatchORM, batch_id)
    if not batch:
        raise ValueError(f"Batch with ID {batch_id} not found")
    batch.completed_prompts += 1
    db.commit()
    db.refresh(batch)

    return


def update_prompt_result_of_batch(
    batch_id: int,
    prompt_result: ValidationPromptResult,
    prompt_index: int,
    db: db_dependency,
) -> None:
    batch: ValidationBatchORM | None = db.get(ValidationBatchORM, batch_id)
    if not batch:
        raise ValueError(f"Batch with ID {batch_id} not found")

    updated_results = batch.prompt_results.copy()
    updated_results[prompt_index] = prompt_result.model_dump()
    batch.prompt_results = updated_results

    db.commit()
    db.refresh(batch)

    return
