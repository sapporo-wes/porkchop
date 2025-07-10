from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./validation.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ValidationBatch(Base):
    __tablename__ = "validation_batches"
    
    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)
    total_files = Column(Integer, nullable=False)
    completed_files = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    files = relationship("ValidationFile", back_populates="batch")

class ValidationFile(Base):
    __tablename__ = "validation_files"
    
    id = Column(String, primary_key=True)
    batch_id = Column(String, ForeignKey("validation_batches.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_content = Column(Text, nullable=False)
    file_type = Column(String, nullable=False)
    validation_result = Column(JSON, nullable=True)
    score = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    batch = relationship("ValidationBatch", back_populates="files")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()