from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En prod, mettre ["http://localhost", "https://ton-domaine.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://catfeeder_user:catfeeder_pass@localhost:5432/catfeeder_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FeedEvent(Base):
    __tablename__ = 'feed_events'
    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
    portionGrams = Column(Integer, nullable=False)

class FillEvent(Base):
    __tablename__ = 'fill_events'
    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
    filledByUser = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Key Auth (very basic)
API_KEY = os.environ.get("API_KEY", "secret-bridge-key")

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key

@app.post("/sync/feed", status_code=201)
def sync_feed(event: dict, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    # Check if already exists
    existing = db.query(FeedEvent).filter(FeedEvent.id == event.get("id")).first()
    if not existing:
        new_event = FeedEvent(
            id=event["id"],
            timestamp=event["timestamp"],
            portionGrams=event["portionGrams"]
        )
        db.add(new_event)
        db.commit()
    return {"status": "ok"}

@app.post("/sync/fill", status_code=201)
def sync_fill(event: dict, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    existing = db.query(FillEvent).filter(FillEvent.id == event.get("id")).first()
    if not existing:
        new_event = FillEvent(
            id=event["id"],
            timestamp=event["timestamp"],
            filledByUser=event.get("filledByUser", "Unknown")
        )
        db.add(new_event)
        db.commit()
    return {"status": "ok"}

@app.get("/api/feeds")
def get_feeds(db: Session = Depends(get_db)):
    """Récupérer l'historique des repas depuis PostgreSQL (Cloud)"""
    feeds = db.query(FeedEvent).order_by(FeedEvent.timestamp.desc()).limit(50).all()
    return [{"id": f.id, "timestamp": f.timestamp, "portionGrams": f.portionGrams} for f in feeds]

@app.get("/api/fills")
def get_fills(db: Session = Depends(get_db)):
    """Récupérer l'historique des remplissages depuis PostgreSQL (Cloud)"""
    fills = db.query(FillEvent).order_by(FillEvent.timestamp.desc()).limit(50).all()
    return [{"id": f.id, "timestamp": f.timestamp, "filledByUser": f.filledByUser} for f in fills]

@app.get("/health")
def healthcheck():
    return {"status": "ok"}
