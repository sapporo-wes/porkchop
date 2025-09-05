FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir .

# Copy application code
COPY . .

# Create responses directory
RUN mkdir -p /app/responses

# Expose port
EXPOSE 11434

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "11434", "--reload"]