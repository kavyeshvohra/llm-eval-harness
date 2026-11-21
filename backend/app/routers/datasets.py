import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("", response_model=list[schemas.DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    return db.scalars(select(models.Dataset).order_by(models.Dataset.id)).all()

@router.get("/{dataset_id}", response_model=schemas.DatasetDetail)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(models.Dataset)
        .options(selectinload(models.Dataset.test_cases))
        .where(models.Dataset.id == dataset_id)
    )
    dataset = db.scalars(stmt).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.post("", response_model=schemas.DatasetOut, status_code=201)
def create_dataset(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    raw = file.file.read()
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}") from e

    if not isinstance(payload, list):
        raise HTTPException(status_code=422, detail="JSON file must contain a list of test cases")

    test_cases = []
    for index, item in enumerate(payload, start=1):
        try:
            test_cases.append(schemas.TestCaseIn.model_validate(item))
        except ValidationError as e:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid test case at item {index}: {e}",
            ) from e

    seen_ids = set()
    for test_case in test_cases:
        if test_case.id in seen_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate test case id: {test_case.id}",
            )
        seen_ids.add(test_case.id)

    dataset = models.Dataset(name=name)
    for test_case in test_cases:
        dataset.test_cases.append(
            models.TestCase(
                case_key=test_case.id,
                input_text=test_case.input,
                expected_output=test_case.expected,
                tags=test_case.tags,
            )
        )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset
    