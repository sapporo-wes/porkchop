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
    │   ├── validation_service.py
    │   └── prompt_service.py
    ├── routers/
    │   ├── upload.py
    │   ├── logs.py
    │   └── prompts.py
    └── prompts/
        ├── validation_prompt.txt
        └── test_prompt.txt
```

## Memories
- Project developed as a comprehensive workflow validation system using LLM-powered code analysis
- Integrated multiple technologies including React, FastAPI, Ollama, and SQLite
- Supports multiple file type validations with dynamic prompt selection
- Implemented background processing for file validation tasks
- Designed with extensibility and modularity in mind