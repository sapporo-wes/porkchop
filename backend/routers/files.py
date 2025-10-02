from fastapi import APIRouter, HTTPException
from fastapi import status as fastapi_status

from models.database import ValidationFileORM, db_dependency
from schema import (
    ValidationFileContentResponse,
)
from services.converter import file_orm_to_schema

router = APIRouter()


@router.get("/files/{file_id}", response_model=ValidationFileContentResponse)
async def get_file_content(file_id: int, db: db_dependency):
    try:
        file_orm: ValidationFileORM | None = db.get(ValidationFileORM, file_id)
        if not file_orm:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )
        return file_orm_to_schema(file_orm)
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e
