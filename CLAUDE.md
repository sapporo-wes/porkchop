# Porkchop Workflow Validation System

## システム概要

Ollama（gemma3n:e4b）を使用してワークフローファイルとコードファイルのセキュリティ・品質検証を行うWebアプリケーション。フロントエンド、バックエンド、Ollamaサーバーの3層構成で、複数ファイルの同時検証とリアルタイム結果表示が可能。

**✅ 2025年7月10日アップデート**: 
- 非同期処理の実装により、検証処理中でも他のAPI（プロンプト一覧、ログ表示）が応答可能に改善
- 進行中バッチの自動復旧機能により、ブラウザリロード時も検証状況が継続表示

## プロジェクト構造

```
porkchop/
├── docker-compose.yml                 # 本番環境設定
├── docker-compose.dev.yml            # 開発環境設定
├── frontend/
│   ├── Dockerfile
│   ├── package.json                   # React 18 + TypeScript + Vite
│   ├── tsconfig.json
│   ├── vite.config.ts                # プロキシ設定付き
│   ├── tailwind.config.js
│   ├── nginx.conf                     # 本番用Nginx設定
│   ├── src/
│   │   ├── App.tsx                    # メインアプリ（タブナビゲーション）
│   │   ├── components/
│   │   │   ├── FileUpload.tsx         # ファイルアップロード+プロンプト選択
│   │   │   ├── ValidationResult.tsx   # リアルタイム検証結果表示
│   │   │   └── LogList.tsx           # 検証ログ一覧（実装済み）
│   │   ├── services/
│   │   │   └── api.ts                # API通信サービス
│   │   └── types/
│   │       └── index.ts              # TypeScript型定義
│   └── public/
└── backend/
    ├── Dockerfile
    ├── pyproject.toml                 # Python 3.11 + FastAPI
    ├── main.py                        # FastAPIアプリケーション
    ├── data/
    │   └── validation.db              # SQLiteデータベース
    ├── models/
    │   └── database.py                # SQLAlchemyモデル
    ├── services/
    │   ├── ollama_service.py          # Ollama連携サービス
    │   ├── validation_service.py      # 検証ロジック
    │   └── prompt_service.py          # プロンプト管理
    ├── routers/
    │   ├── upload.py                  # ファイルアップロードAPI
    │   ├── logs.py                    # ログ管理API
    │   └── prompts.py                 # プロンプト管理API
    └── prompts/
        ├── validation_prompt.txt      # メイン検証プロンプト
        ├── simple_prompt.txt          # シンプルテスト用
        └── test_prompt.txt            # テスト用プロンプト
```

## 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** (高速ビルドツール)
- **Tailwind CSS** (ユーティリティファーストCSS)
- **React Query** (サーバー状態管理・データフェッチング)
- **React Dropzone** (ドラッグ&ドロップファイルアップロード)
- **Axios** (HTTP通信)
- **React Hook Form** (フォーム管理)

### バックエンド
- **Python 3.11**
- **FastAPI** (高性能WebAPIフレームワーク)
- **SQLAlchemy** (ORM)
- **SQLite** (データベース)
- **Ollama Python** (LLMクライアント)
- **Pydantic** (データバリデーション)
- **Background Tasks** (非同期処理)

### インフラストラクチャ
- **Docker** + **Docker Compose**
- **Nginx** (フロントエンド配信)
- **Ollama** (gemma3n:e4b LLMサーバー)

## 主要機能

### 1. 複数ファイルアップロード・検証
- **ドラッグ&ドロップ対応** - 直感的なファイル選択
- **複数ファイル同時処理** - 最大10ファイル
- **ファイル形式サポート** - YAML, CWL, Shell, C, Python, JavaScript, TypeScript, JSON, TOML, Markdown
- **ファイルサイズ制限** - 10MB/ファイル
- **リアルタイム進捗表示** - 個別ファイルの処理状況
- **バックグラウンド処理** - ノンブロッキング検証

### 2. 動的プロンプト選択システム
- **プロンプト一覧取得** - プロンプトディレクトリから動的読み込み
- **プロンプト選択UI** - ドロップダウンでの選択
- **プロンプト内容プレビュー** - モーダルでの全文表示
- **プロンプト更新機能** - リアルタイムでのプロンプトリスト更新
- **説明文自動抽出** - ファイル先頭からの説明文取得

### 3. 包括的検証結果表示
- **検証スコア** - 0-100点での評価
- **問題分析** - セキュリティ、品質、ベストプラクティス別
- **重要度別表示** - High/Medium/Low重要度での色分け
- **行番号表示** - 問題箇所の特定
- **推奨事項** - 改善提案の表示
- **リアルタイム更新** - 2秒間隔での自動更新

### 4. 検証ログ管理
- **履歴一覧表示** - 過去の検証結果
- **検索・フィルタリング** - ファイル名での検索
- **ページネーション** - 大量データの効率的表示
- **詳細モーダル** - 個別結果の詳細表示
- **平均スコア表示** - バッチ単位での成績

## API仕様

### ファイル検証API

#### ファイルアップロード・検証開始
```http
POST /api/validate
Content-Type: multipart/form-data

Parameters:
- files: File[] (required) - 検証対象ファイル（最大10ファイル、10MB/ファイル）
- prompt_name: string (optional, default: "validation_prompt") - 使用するプロンプト名

Response:
{
  "batch_id": "uuid",
  "status": "processing|completed|failed",
  "total_files": 3,
  "completed_files": 0,
  "files": [
    {
      "file_id": "uuid",
      "filename": "workflow.yml",
      "status": "processing"
    }
  ]
}
```

#### 検証状況確認
```http
GET /api/validate/{batch_id}/status

Response:
{
  "batch_id": "uuid",
  "status": "processing|completed|failed",
  "total_files": 3,
  "completed_files": 2,
  "files": [
    {
      "file_id": "uuid",
      "filename": "workflow.yml",
      "status": "completed",
      "score": 85,
      "result": {
        "score": 85,
        "issues": [
          {
            "type": "security|quality|best_practice",
            "severity": "high|medium|low",
            "message": "詳細な問題説明",
            "line": 23
          }
        ],
        "recommendations": ["改善提案リスト"]
      }
    }
  ]
}
```

#### 進行中バッチ取得
```http
GET /api/validate/active

Response:
{
  "active_batches": [
    {
      "batch_id": "uuid",
      "status": "processing",
      "total_files": 3,
      "completed_files": 1,
      "created_at": "2025-07-10T10:30:00Z"
    }
  ]
}
```

### ログ管理API

#### ログ一覧取得
```http
GET /api/logs?page=1&limit=20&search=keyword

Response:
{
  "logs": [
    {
      "batch_id": "uuid",
      "total_files": 3,
      "completed_files": 3,
      "average_score": 85,
      "status": "completed",
      "created_at": "2025-07-10T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "total_pages": 5
}
```

#### ログ詳細取得
```http
GET /api/logs/{batch_id}

Response:
{
  "batch_id": "uuid",
  "status": "completed",
  "total_files": 3,
  "completed_files": 3,
  "created_at": "2025-07-10T10:30:00Z",
  "files": [
    {
      "file_id": "uuid",
      "filename": "workflow.yml",
      "file_content": "ファイル内容",
      "file_type": "yaml",
      "status": "completed",
      "score": 85,
      "validation_result": { /* 検証結果 */ },
      "created_at": "2025-07-10T10:30:00Z"
    }
  ]
}
```

### プロンプト管理API

#### プロンプト一覧取得
```http
GET /api/prompts

Response:
{
  "prompts": [
    {
      "name": "validation_prompt",
      "filename": "validation_prompt.txt",
      "description": "コードセキュリティと品質分析エキスパート"
    },
    {
      "name": "test_prompt",
      "filename": "test_prompt.txt", 
      "description": "シンプルなテスト分析"
    }
  ]
}
```

#### プロンプト内容取得
```http
GET /api/prompts/{prompt_name}

Response:
{
  "name": "validation_prompt",
  "content": "プロンプトの全文内容..."
}
```

## データベース設計

### ValidationBatch テーブル
```sql
CREATE TABLE validation_batches (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,  -- processing, completed, failed
    total_files INTEGER NOT NULL,
    completed_files INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### ValidationFile テーブル
```sql
CREATE TABLE validation_files (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_content TEXT NOT NULL,
    file_type TEXT NOT NULL,  -- yaml, cwl, shell, c, python, etc.
    validation_result JSON,
    score INTEGER,
    status TEXT NOT NULL,  -- processing, completed, failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES validation_batches (id)
);
```

## Docker構成

### 本番環境 (docker-compose.yml)
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - ollama
    environment:
      - OLLAMA_HOST=http://ollama:11434
      - OLLAMA_MODEL=gemma3n:e4b
      - DATABASE_URL=sqlite:///./data/validation.db
    volumes:
      - ./backend/data:/app/data
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    restart: unless-stopped

volumes:
  ollama_data:
```

### 開発環境 (docker-compose.dev.yml)
```yaml
version: '3.8'

services:
  frontend-dev:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - VITE_PROXY_TARGET=http://backend-dev:8000
    command: sleep infinity

  backend-dev:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - OLLAMA_HOST=http://ollama:11434
      - OLLAMA_MODEL=gemma3n:e4b
    command: sleep infinity

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
```

## サービス層実装

### OllamaService
```python
class OllamaService:
    def __init__(self, host: str = None, model: str = None):
        self.host = host or os.getenv("OLLAMA_HOST", "http://ollama:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "gemma3n:e4b")
        self.client = ollama.Client(host=self.host)
    
    def validate_file(self, file_content: str, file_type: str, prompt: str) -> Dict[str, Any]:
        # Ollamaによる検証実行
        # JSON形式での結果解析
        # マークダウンコードブロック対応
```

### ValidationService
```python
class ValidationService:
    def __init__(self):
        self.ollama_service = OllamaService()
        self.prompt_service = PromptService()
    
    def process_file_validation(self, file_id: str, db: Session, prompt_name: str = "validation_prompt"):
        # 指定されたプロンプトでファイル検証実行
        # バックグラウンド処理
        # データベース更新
```

### PromptService
```python
class PromptService:
    def get_available_prompts(self) -> List[Dict[str, Any]]:
        # プロンプトディレクトリスキャン
        # 説明文自動抽出
        # ソート済みリスト返却
    
    def load_prompt(self, prompt_name: str) -> Optional[str]:
        # プロンプトファイル読み込み
        # エラーハンドリング
```

## 使用方法

### 開発環境
```bash
# 開発環境起動
docker compose -f docker-compose.dev.yml up -d

# コンテナ内でサービス起動
docker exec -it porkchop-backend-dev-1 python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
docker exec -it porkchop-frontend-dev-1 npm run dev

# Ollamaモデル取得（初回のみ）
docker exec -it porkchop-ollama-1 ollama pull gemma3n:e4b
```

### 本番環境
```bash
# 本番環境起動
docker compose up -d

# Ollamaモデル取得（初回のみ）
docker exec -it porkchop-ollama-1 ollama pull gemma3n:e4b
```

### アクセスURL
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs
- **Ollama**: http://localhost:11434

## 機能実装状況

### ✅ 実装完了
- **複数ファイルアップロード** - ドラッグ&ドロップ、10ファイル制限
- **動的プロンプト選択** - リアルタイム取得・切り替え
- **プロンプト内容プレビュー** - モーダル表示
- **リアルタイム検証結果** - 進捗表示、自動更新、最小化可能
- **包括的結果分析** - スコア、問題、推奨事項
- **検証ログ管理** - 履歴、検索、詳細表示
- **タブナビゲーション** - アップロード・ログ切り替え
- **非同期処理アーキテクチャ** - 検証中でも他API応答可能 🆕
- **進行中バッチ自動復旧** - ブラウザリロード時の検証継続表示 🆕
- **Docker化** - 本番・開発環境対応
- **TypeScript型定義** - 完全な型安全性
- **エラーハンドリング** - 適切なエラー処理

### 📝 仕様
- **対応ファイル形式**: YAML(.yml, .yaml), CWL(.cwl), Shell(.sh), C(.c, .h), Python(.py), JavaScript(.js), TypeScript(.ts), JSON(.json), TOML(.toml), Markdown(.md)
- **ファイルサイズ制限**: 10MB/ファイル
- **同時処理数**: 最大10ファイル
- **検証モデル**: Ollama gemma3n:e4b
- **データベース**: SQLite
- **リアルタイム更新**: 2秒間隔

### 🎯 使用シナリオ
1. **ワークフロー検証** - CI/CDパイプラインの安全性確認
2. **コード品質チェック** - セキュリティ脆弱性の検出
3. **ベストプラクティス監査** - コーディング標準の確認
4. **CWL検証** - 科学計算ワークフローの品質確保

## 開発者向け情報

### カスタムプロンプト追加
```bash
# プロンプトファイルを追加
echo "# カスタム検証プロンプト" > backend/prompts/custom_prompt.txt
echo "Your custom prompt content..." >> backend/prompts/custom_prompt.txt

# 自動的にフロントエンドのプロンプト一覧に反映される
```

### 環境変数設定
```bash
# Ollama設定
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gemma3n:e4b

# データベース設定
DATABASE_URL=sqlite:///./data/validation.db

# フロントエンド設定（開発時）
VITE_PROXY_TARGET=http://backend-dev:8000
```

### デバッグ
```bash
# バックエンドログ確認
docker logs porkchop-backend-1

# フロントエンドログ確認
docker logs porkchop-frontend-1

# データベース確認
sqlite3 backend/data/validation.db
```

## 🚀 非同期処理アーキテクチャ詳細

### 概要
2025年7月10日の重要なアップデートにより、Ollama LLM検証処理中でも他のAPIエンドポイント（プロンプト一覧、ログ表示）が応答可能になりました。

### 技術実装

#### 1. OllamaService非同期化
```python
# services/ollama_service.py
class OllamaService:
    async def validate_file_async(self, file_content: str, file_type: str, prompt: str):
        """非同期でファイルを検証する"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_validate_file, file_content, file_type, prompt)
    
    def _sync_validate_file(self, file_content: str, file_type: str, prompt: str):
        """同期的なファイル検証処理（内部使用）"""
        # Ollama API呼び出し処理
```

#### 2. ValidationService非同期化
```python
# services/validation_service.py
class ValidationService:
    async def process_file_validation_async(self, file_id: str, db: Session, prompt_name: str):
        """非同期でファイル検証を処理する"""
        validation_result = await self.ollama_service.validate_file_async(
            file_record.file_content,
            file_record.file_type,
            prompt_content
        )
```

#### 3. BackgroundTask非同期実行
```python
# routers/upload.py
async def validate_files(files: List[UploadFile], prompt_name: str, db: Session):
    batch = validation_service.create_validation_batch(file_data, db)
    
    # 非同期タスクとして実行（FastAPIワーカーをブロックしない）
    for validation_file in batch.files:
        asyncio.create_task(process_file_validation_background_async(validation_file.id, prompt_name))
```

#### 4. 進行中バッチ自動復旧機能
```python
# routers/upload.py
@router.get("/validate/active")
async def get_active_validation_batches(db: Session = Depends(get_db)):
    """進行中の検証バッチを取得する（ブラウザリロード時の復旧用）"""
    active_batches = validation_service.get_active_batches(db)
    return {"active_batches": active_batches}

# services/validation_service.py
def get_active_batches(self, db: Session) -> List[Dict[str, Any]]:
    """過去1時間以内の進行中バッチを取得"""
    cutoff_time = datetime.utcnow() - timedelta(hours=1)
    active_batches = db.query(ValidationBatch).filter(
        ValidationBatch.status == "processing",
        ValidationBatch.created_at >= cutoff_time
    ).order_by(ValidationBatch.created_at.desc()).all()
```

```typescript
// frontend/src/App.tsx
const { data: activeBatches } = useQuery({
  queryKey: ['active-batches'],
  queryFn: apiService.getActiveBatches,
  enabled: !currentBatch, // 既に進行中のバッチがある場合は実行しない
});

useEffect(() => {
  if (activeBatches && activeBatches.length > 0 && !currentBatch) {
    // 最新の進行中バッチを復旧（最小化状態で表示）
    const restoredBatch = /* ValidationBatch形式に変換 */;
    setCurrentBatch(restoredBatch);
    setShowResults(true);
    setIsMinimized(true);
  }
}, [activeBatches, currentBatch]);
```

### パフォーマンス改善効果

#### 改善前
- ❌ 検証処理中は他のAPIエンドポイントが応答不可
- ❌ プロンプト一覧の取得ができない
- ❌ ログ表示機能が利用不可
- ❌ ブラウザ更新時にAPI呼び出しが保留状態

#### 改善後
- ✅ 検証処理中でもプロンプト一覧が取得可能
- ✅ 検証処理中でもログ表示・検索が利用可能
- ✅ ブラウザ更新時も正常にAPI応答
- ✅ 複数の検証処理を同時実行可能
- ✅ ブラウザリロード時に進行中検証が自動復旧 🆕
- ✅ 検証状況を見失うことなく継続監視可能 🆕

### 使用技術
- **asyncio.run_in_executor()** - CPU集約的処理の非同期実行
- **asyncio.create_task()** - バックグラウンドタスクの非並行実行  
- **FastAPI async/await** - 非同期リクエスト処理
- **React Query + useEffect** - 進行中バッチの自動復旧
- **SQLAlchemy datetime filter** - 過去1時間以内のバッチ検索
- **axios timeout設定** - フロントエンド側のタイムアウト対応（30秒）

---

このシステムにより、ワークフローファイルとコードファイルの包括的なセキュリティ・品質検証が、直感的なWebインターフェースで実行できます。