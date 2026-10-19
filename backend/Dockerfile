FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --home-dir /app --no-create-home aisezim \
    && mkdir -p /data \
    && chown -R aisezim:aisezim /app /data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=aisezim:aisezim app ./app
COPY --chown=aisezim:aisezim create_superuser.py ./create_superuser.py

USER aisezim
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
