from fastapi import FastAPI

app = FastAPI(
    title="GymDesk Face Service",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "gymdesk-face-service",
        "stage": "foundation",
    }
