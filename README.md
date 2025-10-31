# Porkchop

## Introduction

Porkchop is a workflow and code validation system powered by LLM (Ollama). It analyzes pipeline validity, pipeline usability, pipeline portability, artifacts validity, artifacts reproducibility, and artifacts anonymity in workflow files.

## Quick Start (development environment)

Start the development environment:

```sh
docker compose -f docker-compose.dev.yml up -d --build
```

Pull the required LLM model with Ollama:

```
docker compose -f docker-compose.dev.yml exec ollama ollama pull gemma3n:e4b
```

Start the backend server:

```sh
docker compose -f docker-compose.dev.yml exec backend-dev python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Start the frontend server:

```sh
docker compose -f docker-compose.dev.yml exec frontend-dev npm i
docker compose -f docker-compose.dev.yml exec frontend-dev npm run dev
```

Access the application at http://localhost:3000

## Configuration

### Using an External Ollama Server

If you want to use an Ollama instance running on a different host, set the `OLLAMA_HOST` environment variable on `backend-dev`:

```sh
OLLAMA_HOST=http://your-ollama-host:11434
```

### Using a Different Model

To use a different LLM model, set the `OLLAMA_MODEL` environment variable on `backend-dev`:

```sh
OLLAMA_MODEL=your-model-name
```

Here is the example of running the backend server with an Ollama instance running on a different host and using a different model.

```sh
docker compose -f docker-compose.dev.yml exec backend-dev bash
OLLAMA_HOST=your-ollama-host:11434 OLLAMA_MODEL=your-model-name python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Usage of Porkchop Web App

1. Navigate to the **Upload** tab
2. Select files to validate (drag & drop or click to browse)
3. Choose validation prompts from available categories
4. (Optional) Enter a job name for the validation batch
5. Click **Upload and Validate** button
6. Monitor real-time validation progress
7. View detailed results with severity-based filtering
8. Check the **Logs** tab for validation history
9. Export results as Markdown with file checksums
