from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, func, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    pass

class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    test_cases: Mapped[list["TestCase"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")

class TestCase(Base):
    __tablename__ = "test_cases"
    __table_args__ = (UniqueConstraint("dataset_id", "case_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"), nullable=False)
    case_key: Mapped[str] = mapped_column(String(255), nullable=False)
    input_text: Mapped[str] = mapped_column(Text)
    expected_output: Mapped[dict] = mapped_column(JSONB)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    
    dataset: Mapped["Dataset"] = relationship(back_populates="test_cases")
    results: Mapped[list["Result"]] = relationship(back_populates="test_case", cascade="all, delete-orphan")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)

class Run(Base):
    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"))
    prompt_version_id: Mapped[int] = mapped_column(ForeignKey("prompt_versions.id"))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    dataset: Mapped["Dataset"] = relationship()
    prompt_version: Mapped["PromptVersion"] = relationship()
    results: Mapped[list["Result"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class Result(Base):
    __tablename__ = "results"
    __table_args__ = (UniqueConstraint("run_id", "test_case_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    test_case_id: Mapped[int] = mapped_column(ForeignKey("test_cases.id"))
    output: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    latency_ms: Mapped[float | None]
    input_tokens: Mapped[int | None]
    output_tokens: Mapped[int | None]
    passed: Mapped[bool | None]
    score_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    run: Mapped["Run"] = relationship(back_populates="results")
    test_case: Mapped["TestCase"] = relationship(back_populates="results")