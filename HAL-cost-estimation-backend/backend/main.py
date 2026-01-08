from fastapi import FastAPI
from .db import engine
from .models.models import Base, User
from .routes import cost_estimation
from fastapi.middleware.cors import CORSMiddleware
from .routes import projects  # Add this import
from fastapi.staticfiles import StaticFiles
from backend.services.minio_client import ensure_bucket

from backend.routes import files

from .routes import (
    operation_type,
    machines,
    dimensions,
    duties,
    materials,
    machine_selection,
    mhr,
    cost_estimation,
    projects,
    files,
    users,
)
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HAL Cost Estimation API")

# CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://192.168.137.1:5173",   # optional (LAN)
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):(\d+)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(operation_type.router)
app.include_router(machines.router)
app.include_router(dimensions.router)
app.include_router(duties.router)
app.include_router(materials.router)
app.include_router(machine_selection.router)
app.include_router(mhr.router)
app.include_router(cost_estimation.router)
app.include_router(projects.router)  # Add this line
app.include_router(files.router)
app.include_router(users.router)

# Serve static files from uploads directory
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"status": "HAL Cost Estimation Backend Running 🚀"}
@app.on_event("startup")
def startup():
    ensure_bucket()