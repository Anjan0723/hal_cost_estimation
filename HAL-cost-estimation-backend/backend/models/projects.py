from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_name = Column(String, nullable=False)
    customer_name = Column(String, nullable=False)
    po_reference_number = Column(String, nullable=True)
    project_date = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("ProjectDocument", back_populates="project", cascade="all, delete-orphan")
    parts = relationship("ProjectPart", back_populates="project", cascade="all, delete-orphan")


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    document_type = Column(String, nullable=False)  # 'requirement' or 'other'
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="documents")


class ProjectPart(Base):
    __tablename__ = "project_parts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    part_number = Column(String, nullable=False)
    part_name = Column(String, nullable=False)
    model_3d_path = Column(String, nullable=True)
    drawing_2d_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="parts")
    part_documents = relationship("ProjectPartDocument", back_populates="part", cascade="all, delete-orphan")


class ProjectPartDocument(Base):
    __tablename__ = "project_part_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    part_id = Column(Integer, ForeignKey("project_parts.id"))
    document_type = Column(String, nullable=False)  # '3d_model' or '2d_drawing'
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    part = relationship("ProjectPart", back_populates="part_documents")