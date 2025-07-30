import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from models.database import ValidationBatch, ValidationFile, get_db

router = APIRouter()


@router.get("/logs")
async def get_validation_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(ValidationBatch).order_by(desc(ValidationBatch.created_at))

    if search:
        query = query.join(ValidationFile).filter(
            ValidationFile.filename.contains(search)
        )

    total = query.count()
    batches = query.offset((page - 1) * limit).limit(limit).all()

    total_pages = math.ceil(total / limit)

    logs = []
    for batch in batches:
        files = (
            db.query(ValidationFile).filter(ValidationFile.batch_id == batch.id).all()
        )
        scores = [f.score for f in files if f.score is not None]
        average_score = sum(scores) / len(scores) if scores else None

        logs.append(
            {
                "batch_id": batch.id,
                "total_files": batch.total_files,
                "completed_files": batch.completed_files,
                "average_score": average_score,
                "status": batch.status,
                "created_at": batch.created_at.isoformat(),
            }
        )

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get("/logs/{batch_id}")
async def get_validation_log_detail(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(ValidationBatch).filter(ValidationBatch.id == batch_id).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    files = db.query(ValidationFile).filter(ValidationFile.batch_id == batch_id).all()

    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total_files": batch.total_files,
        "completed_files": batch.completed_files,
        "created_at": batch.created_at.isoformat(),
        "files": [
            {
                "file_id": f.id,
                "filename": f.filename,
                "file_content": f.file_content,
                "file_type": f.file_type,
                "status": f.status,
                "score": f.score,
                "validation_result": f.validation_result,
                "created_at": f.created_at.isoformat(),
            }
            for f in files
        ],
    }
