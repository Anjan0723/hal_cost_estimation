from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..db import get_db
from ..models.projects import Project, ProjectDocument, ProjectPart, ProjectPartDocument
from pydantic import BaseModel
from backend.services.file_service import upload_file
from backend.services.minio_client import MINIO_CLIENT, BUCKET_NAME

router = APIRouter(prefix="/projects", tags=["projects"])

# ============= PYDANTIC SCHEMAS =============

class PartBase(BaseModel):
    part_number: str
    part_name: str

class PartCreate(PartBase):
    pass

class PartResponse(PartBase):
    id: int
    model_3d_path: Optional[str] = None
    drawing_2d_path: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    project_name: str
    customer_name: str
    po_reference_number: Optional[str] = None
    project_date: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    po_reference_number: Optional[str] = None
    project_date: Optional[str] = None

class DocumentResponse(BaseModel):
    id: int
    document_type: str
    filename: str
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    parts: List[PartResponse] = []
    documents: List[DocumentResponse] = []

    class Config:
        from_attributes = True


# ============= HELPER FUNCTIONS =============

async def save_file(file: UploadFile, folder: str) -> str:
    """Save uploaded file and return the object key"""
    if not file:
        return None

    object_prefix = folder.strip("/")
    return upload_file(file, object_prefix=object_prefix)


# ============= PROJECT CRUD OPERATIONS =============

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_name: str = Form(...),
    customer_name: str = Form(...),
    po_reference_number: Optional[str] = Form(None),
    project_date: Optional[str] = Form(None),
    requirement_docs: List[UploadFile] = File(None),
    other_docs: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Create a new project with document uploads"""
    
    # Create project
    project = Project(
        project_name=project_name,
        customer_name=customer_name,
        po_reference_number=po_reference_number,
        project_date=project_date
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Save requirement documents
    if requirement_docs:
        for doc in requirement_docs:
            if doc.filename:
                file_path = await save_file(doc, f"projects/{project.id}/requirements")
                project_doc = ProjectDocument(
                    project_id=project.id,
                    document_type="requirement",
                    filename=doc.filename,
                    file_path=file_path
                )
                db.add(project_doc)
    
    # Save other documents
    if other_docs:
        for doc in other_docs:
            if doc.filename:
                file_path = await save_file(doc, f"projects/{project.id}/other")
                project_doc = ProjectDocument(
                    project_id=project.id,
                    document_type="other",
                    filename=doc.filename,
                    file_path=file_path
                )
                db.add(project_doc)
    
    db.commit()
    db.refresh(project)
    
    return project


@router.get("/", response_model=List[ProjectResponse])
def get_all_projects(db: Session = Depends(get_db)):
    """Get all projects"""
    projects = db.query(Project).all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a specific project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_name: Optional[str] = Form(None),
    customer_name: Optional[str] = Form(None),
    po_reference_number: Optional[str] = Form(None),
    project_date: Optional[str] = Form(None),
    requirement_docs: List[UploadFile] = File(None),
    other_docs: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Update a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields if provided
    if project_name is not None:
        project.project_name = project_name
    if customer_name is not None:
        project.customer_name = customer_name
    if po_reference_number is not None:
        project.po_reference_number = po_reference_number
    if project_date is not None:
        project.project_date = project_date
    
    # Add new requirement documents
    if requirement_docs:
        for doc in requirement_docs:
            if doc.filename:
                file_path = await save_file(doc, f"projects/{project.id}/requirements")
                project_doc = ProjectDocument(
                    project_id=project.id,
                    document_type="requirement",
                    filename=doc.filename,
                    file_path=file_path
                )
                db.add(project_doc)
    
    # Add new other documents
    if other_docs:
        for doc in other_docs:
            if doc.filename:
                file_path = await save_file(doc, f"projects/{project.id}/other")
                project_doc = ProjectDocument(
                    project_id=project.id,
                    document_type="other",
                    filename=doc.filename,
                    file_path=file_path
                )
                db.add(project_doc)
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    prefix = f"projects/{project_id}/"
    for obj in MINIO_CLIENT.list_objects(BUCKET_NAME, prefix=prefix, recursive=True):
        MINIO_CLIENT.remove_object(BUCKET_NAME, obj.object_name)
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


# ============= PART CRUD OPERATIONS =============

@router.post("/{project_id}/parts", response_model=PartResponse)
async def add_part_to_project(
    project_id: int,
    part_number: str = Form(...),
    part_name: str = Form(...),
    model_3d: UploadFile = File(None),
    drawing_2d: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Add a part to a project with file uploads"""
    
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Save 3D model
    model_3d_path = None
    if model_3d and model_3d.filename:
        model_3d_path = await save_file(model_3d, f"projects/{project_id}/parts/3d_models")
    
    # Save 2D drawing
    drawing_2d_path = None
    if drawing_2d and drawing_2d.filename:
        drawing_2d_path = await save_file(drawing_2d, f"projects/{project_id}/parts/2d_drawings")
    
    # Create part
    part = ProjectPart(
        project_id=project_id,
        part_number=part_number,
        part_name=part_name,
        model_3d_path=model_3d_path,
        drawing_2d_path=drawing_2d_path
    )
    db.add(part)
    db.commit()
    db.refresh(part)
    
    return part


@router.get("/{project_id}/parts", response_model=List[PartResponse])
def get_project_parts(project_id: int, db: Session = Depends(get_db)):
    """Get all parts for a project"""
    parts = db.query(ProjectPart).filter(ProjectPart.project_id == project_id).all()
    return parts


@router.put("/parts/{part_id}", response_model=PartResponse)
async def update_part(
    part_id: int,
    part_number: Optional[str] = Form(None),
    part_name: Optional[str] = Form(None),
    model_3d: UploadFile = File(None),
    drawing_2d: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Update a part"""
    part = db.query(ProjectPart).filter(ProjectPart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    # Update fields
    if part_number is not None:
        part.part_number = part_number
    if part_name is not None:
        part.part_name = part_name
    
    # Update 3D model if provided
    if model_3d and model_3d.filename:
        model_3d_path = await save_file(model_3d, f"projects/{part.project_id}/parts/3d_models")
        part.model_3d_path = model_3d_path
    
    # Update 2D drawing if provided
    if drawing_2d and drawing_2d.filename:
        drawing_2d_path = await save_file(drawing_2d, f"projects/{part.project_id}/parts/2d_drawings")
        part.drawing_2d_path = drawing_2d_path
    
    db.commit()
    db.refresh(part)
    return part


@router.delete("/parts/{part_id}")
def delete_part(part_id: int, db: Session = Depends(get_db)):
    """Delete a part"""
    part = db.query(ProjectPart).filter(ProjectPart.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    
    db.delete(part)
    db.commit()
    return {"message": "Part deleted successfully"}