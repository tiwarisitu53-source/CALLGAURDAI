from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.connection import engine, Base
from .api import calls, analysis, dashboard, users

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CallGuard AI - Backend",
    description="AI-Powered Voice Call Screening and Scam-Risk Detection System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calls.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(users.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "CallGuard AI Backend"}
