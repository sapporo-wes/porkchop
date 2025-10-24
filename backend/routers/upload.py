import asyncio

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi import status as fastapi_status

from models.database import db_dependency
from schema import (
    PromptCategoryKind,
    PromptCatName,
    PromptInfo,
    Status,
    ValidationBatchResponse,
    ValidationFileModel,
)
from services.validation_service import ValidationService, change_batch_status

router = APIRouter()
validation_service = ValidationService()
# TODO do not hardcode
semaphore = asyncio.Semaphore(3)


async def _run_with_limit(coro):
    async with semaphore:
        return await coro


@router.post(
    "/validate",
    response_model=ValidationBatchResponse,
    status_code=fastapi_status.HTTP_202_ACCEPTED,
)
async def validate_files(
    db: db_dependency,
    upload_files: list[UploadFile] = File(...),
    prompt_category_names: list[PromptCatName] = Form(
        ...,
        description="Prompt category and name in the format 'category::name' (e.g. ['pipeline_validity::all'] )",
    ),
    batch_name: str = Form(
        ..., description="Name of the job (ValidationBatch)", max_length=255
    ),
):
    if not upload_files:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST, detail="No files provided"
        )

    if len(upload_files) > 30:
        # TODO configurable
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Maximum 30 files allowed",
        )

    if not prompt_category_names:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="No prompt category/name provided",
        )

    if not batch_name or batch_name.strip() == "":
        batch_name = "N/A"

    file_models: list[ValidationFileModel] = []
    for file in upload_files:
        if file.size is not None and file.size > 3 * 1024 * 1024:
            # TODO configurable
            raise HTTPException(
                status_code=fastapi_status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} exceeds 3MB limit",
            )

        content = await file.read()
        try:
            content_decoded = content.decode("utf-8")
        except UnicodeDecodeError as e:
            raise HTTPException(
                status_code=fastapi_status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is not valid UTF-8",
            ) from e
        file_models.append(
            ValidationFileModel(
                file_name=file.filename or "N/A",
                content=content_decoded,
                file_type=validation_service._get_file_type(file.filename or "N/A"),
            )
        )

    prompt_infos: list[PromptInfo] = []
    for cat_name in prompt_category_names:
        parts = cat_name.split("::")
        if len(parts) != 2:
            raise HTTPException(
                status_code=fastapi_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid prompt category/name format: {cat_name}. Expected format 'category::name'",
            )
        category_str, name = parts
        category: PromptCategoryKind = PromptCategoryKind(category_str)
        prompt_infos.append(
            PromptInfo(
                category=category,
                name=name,
            )
        )

    # try:
    batch, files = validation_service.create_validation_batch_and_files(
        file_models, prompt_infos, batch_name, db
    )
    # except Exception as e:
    #     raise HTTPException(
    #         status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         detail="Failed to create validation batch",
    #     ) from e

    try:
        change_batch_status(batch, Status.processing, db)
        print("--")
        print(batch)
        for i, prompt_task in enumerate(batch.prompt_results):
            # TODO currently errors occurred in each tasks are not gathered. Need logging.
            asyncio.create_task(
                _run_with_limit(
                    validation_service.process_file_validation(
                        batch.id, prompt_task, i, files, db
                    )
                )
            )
    except Exception as e:
        change_batch_status(batch, Status.failed, db)
        print("Error starting validation tasks:", e)
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate",
        ) from e

    return batch
