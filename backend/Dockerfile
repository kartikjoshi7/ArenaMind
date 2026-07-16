# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Secure environment (FastAPI should not run as root in production)
RUN useradd -m arenadmin && chown -R arenadmin /app
USER arenadmin

EXPOSE 8000

CMD ["uvicorn", "backend.arena_server:app", "--host", "0.0.0.0", "--port", "8000"]
