from minio import Minio
from minio.error import S3Error

MINIO_CLIENT = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

BUCKET_NAME = "hal-documents"

def ensure_bucket():
    if not MINIO_CLIENT.bucket_exists(BUCKET_NAME):
        MINIO_CLIENT.make_bucket(BUCKET_NAME)
