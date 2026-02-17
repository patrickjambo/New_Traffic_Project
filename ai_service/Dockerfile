FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-light.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-light.txt

# Copy source code
COPY . .

# Create directories
RUN mkdir -p models temp_videos

EXPOSE 8000

CMD ["uvicorn", "main_light:app", "--host", "0.0.0.0", "--port", "8000"]
