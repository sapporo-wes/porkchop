from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models.database import get_db
from services.validation_service import ValidationService
import asyncio

router = APIRouter()
validation_service = ValidationService()


async def process_file_validation_background_async(file_id: str, prompt_name: str = "validation_prompt"):
    """非同期バックグラウンドタスク - Ollamaをブロックしない"""
    db = next(get_db())
    try:
        await validation_service.process_file_validation_async(file_id, db, prompt_name)
    finally:
        db.close()

async def process_file_validation_background(file_id: str, prompt_name: str = "validation_prompt"):
    """後方互換性のための同期バックグラウンドタスク（非推奨）"""
    db = next(get_db())
    try:
        validation_service.process_file_validation(file_id, db, prompt_name)
    finally:
        db.close()


@router.post("/validate")
async def validate_files(
    files: List[UploadFile] = File(...),
    prompt_name: str = Form("validation_prompt"),
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
    
    # 非同期タスクとして実行（FastAPIワーカーをブロックしない）
    for validation_file in batch.files:
        asyncio.create_task(process_file_validation_background_async(validation_file.id, prompt_name))
    
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

@router.get("/validate/active")
async def get_active_validation_batches(db: Session = Depends(get_db)):
    """進行中の検証バッチを取得する（ブラウザリロード時の復旧用）"""
    active_batches = validation_service.get_active_batches(db)
    return {"active_batches": active_batches}