import asyncio
import json
import os
from typing import Any

import ollama


class OllamaService:
    def __init__(self, host: str = None, model: str = None):
        self.host = host or os.getenv("OLLAMA_HOST", "http://ollama:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "gemma3n:e4b")
        self.client = ollama.Client(host=self.host)

    async def validate_file_async(
        self, file_content: str, file_type: str, prompt: str
    ) -> dict[str, Any]:
        """非同期でファイルを検証する"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._sync_validate_file, file_content, file_type, prompt
        )

    def _sync_validate_file(
        self, file_content: str, file_type: str, prompt: str
    ) -> dict[str, Any]:
        """同期的なファイル検証処理（内部使用）"""
        full_prompt = (
            f"{prompt}\n\nFile Type: {file_type}\nFile Content:\n{file_content}"
        )

        try:
            response = self.client.generate(
                model=self.model, prompt=full_prompt, stream=False
            )

            response_text = response["response"]

            # Extract JSON from markdown code blocks if present
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                if end != -1:
                    response_text = response_text[start:end].strip()
            print(response_text)
            try:
                result = json.loads(response_text)
                return {"success": True, "result": result}
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "error": "Invalid JSON response from LLM",
                    "raw_response": response_text,
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def validate_file(
        self, file_content: str, file_type: str, prompt: str
    ) -> dict[str, Any]:
        """後方互換性のための同期メソッド（非推奨）"""
        return self._sync_validate_file(file_content, file_type, prompt)

    def check_model_availability(self) -> bool:
        try:
            models = self.client.list()
            return any(
                model["name"] == self.model for model in models.get("models", [])
            )
        except Exception:
            return False
