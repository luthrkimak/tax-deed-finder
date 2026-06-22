FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Instala deps primeiro para aproveitar cache de layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
