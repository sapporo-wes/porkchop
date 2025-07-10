import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models.database import ValidationBatch, ValidationFile, get_db
from services.ollama_service import OllamaService
from services.prompt_service import PromptService
import os


class ValidationService:
    def __init__(self):
        self.ollama_service = OllamaService()
        self.prompt_service = PromptService()
    
    def _get_prompt_content(self, prompt_name: str) -> str:
        """指定されたプロンプト名でプロンプト内容を取得"""
        prompt_content = self.prompt_service.load_prompt(prompt_name)
        
        if prompt_content is None:
            return self._get_default_prompt()
        
        return prompt_content
    
    def _get_default_prompt(self) -> str:
        return """You are a code security and quality analysis expert. Please analyze the following file for security vulnerabilities, quality issues, and best practice violations.

Analysis Categories:
1. Security Issues (hardcoded credentials, improper permissions, injection vulnerabilities)
2. Quality Issues (inefficient processing, readability problems, error handling)
3. Best Practice Violations (coding standards, maintainability, documentation)

Please provide your analysis in the following JSON format:
{
  "score": numerical_score_0_to_100,
  "issues": [
    {
      "type": "security|quality|best_practice",
      "severity": "high|medium|low",
      "message": "detailed_description_of_the_issue",
      "line": line_number_if_applicable
    }
  ],
  "recommendations": ["list_of_improvement_suggestions"]
}

Respond only with valid JSON format."""
    
    def _get_file_type(self, filename: str) -> str:
        extension = filename.split('.')[-1].lower()
        type_mapping = {
            'yaml': 'yaml',
            'yml': 'yaml',
            'cwl': 'cwl',
            'sh': 'shell',
            'c': 'c',
            'h': 'c',
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'json': 'json',
            'toml': 'toml',
            'md': 'markdown'
        }
        return type_mapping.get(extension, 'text')
    
    def create_validation_batch(self, files: List[Dict[str, Any]], db: Session) -> ValidationBatch:
        batch_id = str(uuid.uuid4())
        batch = ValidationBatch(
            id=batch_id,
            status="processing",
            total_files=len(files),
            completed_files=0
        )
        
        db.add(batch)
        db.commit()
        
        for file_data in files:
            file_id = str(uuid.uuid4())
            file_type = self._get_file_type(file_data['filename'])
            
            validation_file = ValidationFile(
                id=file_id,
                batch_id=batch_id,
                filename=file_data['filename'],
                file_content=file_data['content'],
                file_type=file_type,
                status="processing"
            )
            
            db.add(validation_file)
        
        db.commit()
        return batch
    
    def process_file_validation(self, file_id: str, db: Session, prompt_name: str = "validation_prompt") -> Dict[str, Any]:
        file_record = db.query(ValidationFile).filter(ValidationFile.id == file_id).first()
        
        if not file_record:
            return {"success": False, "error": "File not found"}
        
        try:
            prompt_content = self._get_prompt_content(prompt_name)
            validation_result = self.ollama_service.validate_file(
                file_record.file_content,
                file_record.file_type,
                prompt_content
            )
            
            if validation_result["success"]:
                result = validation_result["result"]
                file_record.validation_result = result
                file_record.score = result.get("score", 0)
                file_record.status = "completed"
                
                batch = db.query(ValidationBatch).filter(ValidationBatch.id == file_record.batch_id).first()
                if batch:
                    batch.completed_files += 1
                    if batch.completed_files >= batch.total_files:
                        batch.status = "completed"
                
                db.commit()
                return {"success": True, "result": result}
            else:
                file_record.status = "failed"
                file_record.validation_result = {"error": validation_result["error"]}
                db.commit()
                return validation_result
                
        except Exception as e:
            file_record.status = "failed"
            file_record.validation_result = {"error": str(e)}
            db.commit()
            return {"success": False, "error": str(e)}
    
    def get_batch_status(self, batch_id: str, db: Session) -> Dict[str, Any]:
        batch = db.query(ValidationBatch).filter(ValidationBatch.id == batch_id).first()
        
        if not batch:
            return {"success": False, "error": "Batch not found"}
        
        files = db.query(ValidationFile).filter(ValidationFile.batch_id == batch_id).all()
        
        return {
            "success": True,
            "batch_id": batch_id,
            "status": batch.status,
            "total_files": batch.total_files,
            "completed_files": batch.completed_files,
            "files": [
                {
                    "file_id": f.id,
                    "filename": f.filename,
                    "status": f.status,
                    "score": f.score,
                    "result": f.validation_result
                }
                for f in files
            ]
        }