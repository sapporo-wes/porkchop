from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from services.prompt_service import PromptService

router = APIRouter()
prompt_service = PromptService()


@router.get("/prompts", response_model=Dict[str, List[Dict[str, Any]]])
async def get_available_prompts():
    """
    利用可能なプロンプト一覧を取得
    """
    try:
        prompts = prompt_service.get_available_prompts()
        return {"prompts": prompts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompts: {str(e)}")


@router.get("/prompts/{prompt_name}")
async def get_prompt_content(prompt_name: str):
    """
    指定されたプロンプトの内容を取得
    """
    try:
        content = prompt_service.load_prompt(prompt_name)
        if content is None:
            raise HTTPException(status_code=404, detail=f"Prompt '{prompt_name}' not found")
        
        return {
            "name": prompt_name,
            "content": content
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load prompt: {str(e)}")