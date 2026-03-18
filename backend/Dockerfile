FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install slowapi pandas uvicorn python-multipart

COPY . .

# Explicitly create the uploads directory for volume mounting
RUN mkdir -p ../uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
