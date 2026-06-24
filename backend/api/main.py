import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auctions, favorites, alerts, flood_zone, stats
from scheduler import create_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="Tax Deed Finder API", lifespan=lifespan)

cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
app.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(flood_zone.router, prefix="/flood-zone", tags=["flood-zone"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])

@app.get("/health")
def health():
    return {"status": "ok"}
