from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import StreamingResponse, FileResponse
from backend.services.file_service import upload_file
from backend.services.minio_client import MINIO_CLIENT, BUCKET_NAME
import os


router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_id = upload_file(file)
    return {
        "message": "File uploaded successfully",
        "file_id": file_id
    }


@router.get("/download/{file_id:path}")
def download_file(file_id: str, inline: bool = Query(False, description="Display file inline instead of downloading")):
    obj = MINIO_CLIENT.get_object(BUCKET_NAME, file_id)

    filename = file_id.rsplit("/", 1)[-1]
    
    # Determine content type based on file extension
    if filename.lower().endswith('.pdf'):
        media_type = "application/pdf"
    elif filename.lower().endswith(('.jpg', '.jpeg')):
        media_type = "image/jpeg"
    elif filename.lower().endswith('.png'):
        media_type = "image/png"
    elif filename.lower().endswith('.gif'):
        media_type = "image/gif"
    else:
        media_type = "application/octet-stream"
    
    # Set Content-Disposition based on inline parameter
    if inline:
        content_disposition = f'inline; filename="{filename}"'
    else:
        content_disposition = f'attachment; filename="{filename}"'

    return StreamingResponse(
        obj,
        media_type=media_type,
        headers={
            "Content-Disposition": content_disposition
        }
    )


@router.get("/uploads/{file_path:path}")
def serve_upload_file(file_path: str, inline: bool = Query(False, description="Display file inline instead of downloading")):
    """Serve files from uploads directory with proper headers for inline display"""
    file_location = os.path.join("uploads", file_path)
    
    if not os.path.exists(file_location):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    
    filename = os.path.basename(file_path)
    
    # Determine content type based on file extension
    if filename.lower().endswith('.pdf'):
        media_type = "application/pdf"
    elif filename.lower().endswith(('.jpg', '.jpeg')):
        media_type = "image/jpeg"
    elif filename.lower().endswith('.png'):
        media_type = "image/png"
    elif filename.lower().endswith('.gif'):
        media_type = "image/gif"
    else:
        media_type = "application/octet-stream"
    
    # Set Content-Disposition based on inline parameter
    if inline:
        content_disposition = f'inline; filename="{filename}"'
    else:
        content_disposition = f'attachment; filename="{filename}"'

    return FileResponse(
        file_location,
        media_type=media_type,
        headers={
            "Content-Disposition": content_disposition
        }
    )
