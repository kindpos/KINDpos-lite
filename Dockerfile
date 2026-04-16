FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ ./
COPY frontend/ /frontend/
COPY overseer/ /overseer/

# Create data directory for SQLite
RUN mkdir -p /data

# Environment
ENV KINDPOS_DATABASE_PATH=/data/event_ledger.db
ENV KINDPOS_HOST=0.0.0.0
ENV KINDPOS_PORT=8080
ENV KINDPOS_DEBUG=false
ENV KINDPOS_STORE_MODE=live

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
