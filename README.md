# Porkchop

## Development Setup

```sh
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml exec ollama ollama pull gemma3n:e4b
```

backend

```sh
docker compose -f docker-compose.dev.yml exec backend-dev python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

frontend

```sh
docker compose -f docker-compose.dev.yml exec frontend-dev npm i
docker compose -f docker-compose.dev.yml exec frontend-dev npm run dev
```
