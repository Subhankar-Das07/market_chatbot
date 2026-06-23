FROM python:3.10-slim

WORKDIR /app

# System dependencies for PyMuPDF and building extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libffi-dev \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Run uvicorn on standard Render/Railway host and port
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
