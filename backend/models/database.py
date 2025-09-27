import os
from datetime import datetime
from typing import Annotated

from fastapi import Depends
from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)
from sqlalchemy.sql import text

from schema import Status

#########################################################
# Types
#########################################################
int_pk = Annotated[int, mapped_column(Integer, primary_key=True, autoincrement=True)]
# uuid_pk = Annotated[
#     uuid.UUID, mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
# ]
status_enum = Annotated[
    Status, mapped_column(SAEnum(Status, native_enum=False), nullable=False)
]
timestamp = Annotated[
    datetime,
    mapped_column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")),
]
#########################################################

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./validation.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class ValidationBatchORM(Base):
    __tablename__ = "validation_batches"

    id: Mapped[int_pk] = mapped_column(comment="Batch ID")
    status: Mapped[status_enum] = mapped_column(comment="Current status of the batch")

    completed_prompts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prompt_results: Mapped[list[dict]] = mapped_column(
        JSON, default=list, nullable=False
    )
    created_at: Mapped[timestamp] = mapped_column(
        comment="Creation timestamp", server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[timestamp] = mapped_column(
        onupdate=text("CURRENT_TIMESTAMP"),
        server_default=text("CURRENT_TIMESTAMP"),
        comment="Last update timestamp",
    )

    files: Mapped[list["ValidationFileORM"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan", passive_deletes=True
    )


class ValidationFileORM(Base):
    __tablename__ = "validation_files"

    id: Mapped[int_pk] = mapped_column(comment="File ID")
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[timestamp] = mapped_column(
        server_default=text("CURRENT_TIMESTAMP"), comment="Creation timestamp"
    )

    batch_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("validation_batches.id", ondelete="CASCADE"),
        index=True,
    )
    batch: Mapped["ValidationBatchORM"] = relationship(back_populates="files")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
