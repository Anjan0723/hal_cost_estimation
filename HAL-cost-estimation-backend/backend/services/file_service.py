import uuid
from typing import Optional
from backend.services.minio_client import MINIO_CLIENT, BUCKET_NAME

def upload_file(file, object_prefix: Optional[str] = None):
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    if object_prefix:
        file_id = f"{object_prefix.rstrip('/')}/{unique_name}"
    else:
        file_id = unique_name

    file.file.seek(0)

    MINIO_CLIENT.put_object(
        bucket_name=BUCKET_NAME,
        object_name=file_id,
        data=file.file,
        length=-1,
        part_size=10 * 1024 * 1024,
        content_type=file.content_type
    )

    return file_id
