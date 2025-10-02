from typing import Any

from fastapi import APIRouter, HTTPException, Query

from schema import PromptCategory, PromptCategoryKind, PromptContentResponse
from services.prompt_service import PromptService

router = APIRouter()
prompt_service = PromptService()


@router.get("/prompts", response_model=list[PromptCategory])
async def get_available_prompts():
    """
    利用可能なプロンプト一覧を取得
    """
    try:
        prompt_category_list = prompt_service.get_available_prompts()
        if prompt_category_list is None:
            raise HTTPException(status_code=404, detail="No prompts found")
        return prompt_category_list
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get prompts: {str(e)}"
        ) from e


@router.get("/prompts/content", response_model=PromptContentResponse)
async def get_prompt_content(name: str = Query(...), cat: str = Query(...)):
    """
    指定されたプロンプトの内容を取得
    """
    try:
        prompt_category: PromptCategoryKind = PromptCategoryKind(cat)
        content = prompt_service.load_prompt_content(name, prompt_category)
        if content is None:
            raise HTTPException(
                status_code=404,
                detail=f"Prompt '{name}' in the '{cat}' category was not found",
            )

        return content
    except ValueError as e:
        raise HTTPException(
            status_code=404, detail=f"Category '{cat}' not found"
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to load prompt: {str(e)}"
        ) from e
