from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pathlib import Path

app = FastAPI(title="Rosetta Alpha API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_PATH = Path(__file__).parent.parent / "results.json"

@app.get("/api/results")
async def get_results():
    """Serve the latest E2E run results."""
    if not RESULTS_PATH.exists():
        # Fallback to empty list if no results yet
        return []
    
    try:
        with open(RESULTS_PATH, "r") as f:
            data = json.load(f)
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading results: {str(e)}")

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
