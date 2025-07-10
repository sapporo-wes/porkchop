# Workflow Validation System Implementation Specification

## System Overview
A system that validates workflow files and other code files for inappropriate processing using LLM (Ollama's gemma3n model). Consists of three components: frontend, backend, and Ollama server.

## Project Structure
```
porkchop/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── nginx.conf
│   ├── .env
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── vite-env.d.ts
│   │   ├── components/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ValidationResult.tsx
│   │   │   └── LogList.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   └── public/
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── main.py
    ├── models/
    │   └── database.py
    ├── services/
    │   ├── ollama_service.py
    │   └── validation_service.py
    ├── routers/
    │   ├── upload.py
    │   └── logs.py
    └── prompts/
        └── validation_prompt.txt
```

## Frontend Specification

### Technology Stack
- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **React Query** (Data fetching)
- **React Dropzone** (File upload)
- **Axios** (HTTP communication)
- **Nginx** (Production server)

### Functional Requirements
1. **Multiple File Selection & Upload**
   - File selection UI with drag & drop support
   - Support for multiple file selection (up to 10 files)
   - Supported formats: YAML, Shell scripts (.sh), C files (.c, .h), and other text files
   - File size limit: 10MB per file
   - Real-time file validation before upload

2. **Validation Result Display**
   - Loading state during validation
   - Individual validation results for each file
   - Progress indicator for multiple files
   - Validation score display (0-100)
   - Real-time status updates (2-second polling)
   - Modal-based result display

3. **Validation Log List**
   - List of past validation results
   - Search & filtering functionality
   - Detail view modal
   - **Note: Not implemented in current version**

### Component Structure
- `FileUpload.tsx`: Multiple file upload functionality with drag & drop
- `ValidationResult.tsx`: Real-time validation results display for multiple files
- `LogList.tsx`: Validation log list and search (**Not implemented**)
- `App.tsx`: Main application component with error handling
- `main.tsx`: Application entry point with React Query setup

## Backend Specification

### Technology Stack
- **Python 3.11**
- **FastAPI** (Web API framework)
- **SQLite** (Database)
- **SQLAlchemy** (ORM)
- **Ollama Python** (Ollama client)
- **Pydantic** (Data validation)
- **Background Tasks** (Async file processing)

### API Specification

#### 1. Multiple File Upload & Validation
```
POST /api/validate
Content-Type: multipart/form-data

Request:
- files: List of files to validate

Response:
{
  "batch_id": "uuid",
  "status": "processing|completed|failed",
  "results": [
    {
      "file_id": "uuid",
      "filename": "workflow.yml",
      "status": "processing|completed|failed",
      "result": {
        "score": 85,
        "issues": [
          {
            "type": "security",
            "severity": "high",
            "message": "Hardcoded credentials detected",
            "line": 23
          }
        ],
        "recommendations": ["Use environment variables for secrets"]
      }
    }
  ],
  "created_at": "2025-07-09T10:30:00Z"
}
```

#### 2. Validation Status Check
```
GET /api/validate/{batch_id}/status

Response:
{
  "batch_id": "uuid",
  "status": "processing|completed|failed",
  "completed_files": 3,
  "total_files": 5,
  "results": [...]
}
```

#### 3. Validation Log List
```
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
      "created_at": "2025-07-09T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 4. Validation Log Detail
```
GET /api/logs/{batch_id}

Response:
{
  "batch_id": "uuid",
  "status": "completed",
  "files": [
    {
      "file_id": "uuid",
      "filename": "workflow.yml",
      "file_content": "...",
      "result": { ... },
      "created_at": "2025-07-09T10:30:00Z"
    }
  ],
  "created_at": "2025-07-09T10:30:00Z"
}
```

### Database Design
```python
# SQLAlchemy Models
class ValidationBatch(Base):
    __tablename__ = "validation_batches"
    
    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)  # processing, completed, failed
    total_files = Column(Integer, nullable=False)
    completed_files = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ValidationFile(Base):
    __tablename__ = "validation_files"
    
    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("validation_batches.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_content = Column(Text, nullable=False)
    file_type = Column(String, nullable=False)  # yaml, shell, c, etc.
    validation_result = Column(JSON, nullable=True)
    score = Column(Integer, nullable=True)
    status = Column(String, nullable=False)  # processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### Ollama Integration
```python
# services/ollama_service.py
import ollama
import json
import os

class OllamaService:
    def __init__(self, host: str = None, model: str = None):
        self.host = host or os.getenv("OLLAMA_HOST", "http://ollama:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "gemma3n:e4b")
        self.client = ollama.Client(host=self.host)
    
    def validate_file(self, file_content: str, file_type: str, prompt: str) -> Dict[str, Any]:
        full_prompt = f"{prompt}\n\nFile Type: {file_type}\nFile Content:\n{file_content}"
        
        try:
            response = self.client.generate(
                model=self.model,
                prompt=full_prompt,
                stream=False
            )
            
            response_text = response['response']
            
            # Extract JSON from markdown code blocks if present
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                if end != -1:
                    response_text = response_text[start:end].strip()
            
            try:
                result = json.loads(response_text)
                return {"success": True, "result": result}
            except json.JSONDecodeError:
                return {"success": False, "error": "Invalid JSON response from LLM"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def check_model_availability(self) -> bool:
        try:
            models = self.client.list()
            return any(model['name'] == self.model for model in models.get('models', []))
        except Exception:
            return False
```

## Docker Configuration

### docker-compose.yml
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

## Validation Prompt
```
# prompts/validation_prompt.txt
You are a code security and quality analysis expert. Please analyze the following file for security vulnerabilities, quality issues, and best practice violations.

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

Respond only with valid JSON format.
```

## Implementation Steps

1. **Project Structure Creation** ✅
   - Create directory structure
   - Set up Docker configuration files

2. **Backend Implementation** ✅
   - FastAPI application basic setup
   - Database models definition with SQLAlchemy
   - Ollama service implementation with JSON parsing
   - API endpoints implementation (upload, logs)
   - Multiple file processing logic with background tasks
   - Environment variable configuration

3. **Frontend Implementation** ✅
   - React + TypeScript project initialization
   - Multiple file upload component with drag & drop
   - API communication implementation with React Query
   - UI/UX implementation with progress tracking
   - Tailwind CSS styling
   - Nginx production deployment setup

4. **Integration Testing** ✅
   - docker-compose startup verification
   - End-to-end testing with multiple files
   - Frontend-backend communication testing
   - Ollama model integration testing

## Environment Requirements
- Docker & Docker Compose
- Node.js 22+ (for development)
- Python 3.11+ (for development)
- Ollama with gemma3n:e4b model

## Additional Notes
- Ollama server runs as a Docker container with gemma3n:e4b model
- Files are processed individually by Ollama using background tasks
- Support for multiple file types (YAML, Shell, C, Python, JavaScript, etc.)
- File content is passed as plain text to the validation prompt
- Proper error handling for file upload size limits
- Security considerations for file validation and XSS prevention
- Progress tracking for multiple file validation with real-time updates
- Frontend uses Nginx for production deployment
- Backend uses pyproject.toml instead of requirements.txt
- JSON response parsing with markdown code block extraction
- Environment variables for configuration (OLLAMA_HOST, OLLAMA_MODEL)
- Multi-stage Docker builds for optimized production images

## Access Information
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Ollama: http://localhost:11434

## Current Implementation Status
- ✅ File upload with drag & drop
- ✅ Real-time validation results
- ✅ Progress tracking
- ✅ Docker containerization
- ✅ Backend API with background processing
- ✅ Ollama integration with gemma3n:e4b
- ❌ Log list component (not implemented)
- ❌ Historical validation logs (not implemented)