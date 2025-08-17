"""
Ollama Stub Service - Ollama互換の高速レスポンススタブ

本物のOllamaと完全に同じAPIインターフェースを提供し、
事前に用意したJSONファイルの内容を即座に返すスタブサービス。
"""

import json
import os
from datetime import datetime

from fastapi import FastAPI, Request

app = FastAPI(title="Ollama Stub", version="1.0.0")


def load_response():
    """レスポンスファイルを読み込む"""
    response_file = os.path.join("responses", "error.json")
    try:
        with open(response_file, encoding="utf-8") as f:
            content = f.read().strip()
            # JSONとして解析せず、文字列のまま返す（Ollamaと同じ形式）
            return content
    except Exception as e:
        # フォールバック用のエラーレスポンス
        return json.dumps(
            {"success": False, "error": f"Stub response load failed: {str(e)}"}
        )


@app.post("/api/generate")
async def generate(request: Request):
    """Ollama完全互換のAPIエンドポイント"""
    # リクエストボディを受け取る（実際は使わないが、ログ出力用）
    body = await request.json()

    # ログ出力（デバッグ用）
    print(f"[STUB] Received request: model={body.get('model', 'unknown')}")

    # 固定レスポンスを返す（Ollamaと全く同じ形式）
    response_content = load_response()

    return {
        "model": body.get("model", "stub"),
        "created_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "response": response_content,
        "done": True,
    }


@app.get("/api/version")
async def version():
    """バージョン情報（デバッグ用）"""
    return {"version": "stub-1.0.0", "description": "Ollama Stub for fast testing"}


@app.get("/health")
async def health():
    """ヘルスチェック用エンドポイント"""
    return {"status": "healthy", "service": "ollama-stub"}


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Ollama Stub Service",
        "endpoints": ["POST /api/generate", "GET /api/version", "GET /health"],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=11434, log_level="info")
