import math

from fastapi import APIRouter, HTTPException, Query
from fastapi import status as fastapi_status
from sqlalchemy import desc, distinct, func, select
from sqlalchemy.exc import SQLAlchemyError

from models.database import ValidationBatchORM, ValidationFileORM, db_dependency
from schema import (
    ActiveBatchResponse,
    ValidationBatchResponse,
    ValidationLogsPagenatedResponse,
)
from services.converter import batch_orm_to_active_response, batch_orm_to_schema

router = APIRouter()


@router.get("/logs", response_model=ValidationLogsPagenatedResponse)
async def get_validation_logs(
    db: db_dependency,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    try:
        # query
        stmt = select(ValidationBatchORM).order_by(desc(ValidationBatchORM.created_at))
        if search:
            stmt = stmt.join(ValidationFileORM).where(
                ValidationFileORM.file_name.contains(search)
            )

        # count total items
        count_stmt = select(func.count(distinct(ValidationBatchORM.id)))
        if search:
            count_stmt = (
                count_stmt.select_from(ValidationBatchORM)
                .join(ValidationFileORM)
                .where(ValidationFileORM.file_name.contains(search))
            )
        total = db.execute(count_stmt).scalar_one()
        total_pages = math.ceil(total / per_page) if total > 0 else 1

        if page > total_pages:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail="Page number out of range",
            )

        offset = (page - 1) * per_page
        paged_stmt = stmt.offset(offset).limit(per_page)

        result = db.execute(paged_stmt)
        batch_orms = result.scalars().all()
        logs = [batch_orm_to_schema(batch) for batch in batch_orms]

        return ValidationLogsPagenatedResponse(
            logs=logs,
            curr_page=page,
            total_pages=total_pages,
            per_page=per_page,
            total=total,
            has_next=page < total_pages,
            has_prev=page > 1,
        )
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB Error: {str(e)}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Error: {str(e)}",
        ) from e


@router.get("/logs/{batch_id}", response_model=ValidationBatchResponse)
async def get_validation_log_detail(batch_id: int, db: db_dependency):
    try:
        batch_orm: ValidationBatchORM | None = db.get(ValidationBatchORM, batch_id)
        if not batch_orm:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND, detail="Log not found"
            )
        batch = batch_orm_to_schema(batch_orm)
        return batch
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB Error: {str(e)}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Error: {str(e)}",
        ) from e


@router.get("/logs/active", response_model=list[ActiveBatchResponse])
async def get_active_validation_batches(db: db_dependency):
    try:
        stmt = select(ValidationBatchORM).where(
            ValidationBatchORM.status.in_(["waiting", "processing"]).order_by(
                desc(ValidationBatchORM.created_at)
            )
        )
        result = db.execute(stmt)
        active_batch_orms = result.scalars().all()

        return [batch_orm_to_active_response(batch) for batch in active_batch_orms]
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB Error: {str(e)}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Error: {str(e)}",
        ) from e
