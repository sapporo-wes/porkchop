from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from models.database import get_db
from services.validation_service import ValidationService
import asyncio

router = APIRouter()
validation_service = ValidationService()


async def process_file_validation_background(file_id: str):
    db = next(get_db())
    try:
        validation_service.process_file_validation(file_id, db)
    finally:
        db.close()


@router.post("/validate")
async def validate_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed")
    
    file_data = []
    for file in files:
        if file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds 10MB limit")
        
        content = await file.read()
        file_data.append({
            "filename": file.filename,
            "content": content.decode('utf-8')
        })
    
    batch = validation_service.create_validation_batch(file_data, db)
    
    for validation_file in batch.files:
        background_tasks.add_task(process_file_validation_background, validation_file.id)
    
    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total_files": batch.total_files,
        "completed_files": batch.completed_files,
        "files": [
            {
                "file_id": f.id,
                "filename": f.filename,
                "status": f.status
            }
            for f in batch.files
        ]
    }


@router.get("/validate/{batch_id}/status")
async def get_validation_status(batch_id: str, db: Session = Depends(get_db)):
    result = validation_service.get_batch_status(batch_id, db)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return {
        "batch_id": result["batch_id"],
        "status": result["status"],
        "total_files": result["total_files"],
        "completed_files": result["completed_files"],
        "files": result["files"]
    }