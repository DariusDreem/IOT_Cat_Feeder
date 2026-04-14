FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN apk add --no-cache gcc musl-dev postgresql-dev && \
    pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
