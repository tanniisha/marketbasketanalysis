from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import api
import os

app = FastAPI(title="Market Basket Analysis API")

# Add CORS middleware to allow a future frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)

# Mount the static frontend directory
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
os.makedirs(frontend_path, exist_ok=True)
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="static")

@app.get("/")
def read_root():
    response = FileResponse(os.path.join(frontend_path, "index.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/compare")
def read_compare_demo():
    # Serve the standalone HTML file that demonstrates Apriori vs FP-Growth
    return FileResponse(os.path.join(os.path.dirname(__file__), "compare_demo.html"))
