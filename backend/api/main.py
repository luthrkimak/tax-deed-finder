from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auctions, favorites, alerts
from scheduler import create_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="Tax Deed Finder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
app.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

@app.get("/health")
def health():
    return {"status": "ok"}
