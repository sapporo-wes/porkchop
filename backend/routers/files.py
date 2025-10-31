from fastapi import APIRouter, HTTPException, Query
from fastapi import status as fastapi_status

from models.database import ValidationFileORM, db_dependency
from schema import (
    ValidationFileContentResponse,
)
from sqlalchemy import select
from services.converter import file_orm_to_schema

router = APIRouter()


@router.get(
    "/files",
    response_model=ValidationFileContentResponse,
    description="Returns the content of files by their IDs. The order of the returned files matches the order of the requested IDs. Missing IDs are ignored. If no files are found, a 404 error is returned.",
)
async def get_file_content(db: db_dependency, file_id: list[int] = Query(...)):
    try:
        stmt = select(ValidationFileORM).where(ValidationFileORM.id.in_(file_id))
        file_orms: list[ValidationFileORM] = db.execute(stmt).scalars().all()

        by_id = {file_orm.id: file_orm for file_orm in file_orms}

        files = [file_orm_to_schema(by_id[fid]) for fid in file_id if fid in by_id]

        seen = set()
        missing_ids: list[int] = []
        for fid in file_id:
            if fid not in by_id and fid not in seen:
                missing_ids.append(fid)
                seen.add(fid)

        if not files:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="No files found",
            )

        resp = ValidationFileContentResponse(
            files=files,
            missing_ids=missing_ids,
        )
        return resp

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e
