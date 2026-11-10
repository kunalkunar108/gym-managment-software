import os

import uvicorn
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
