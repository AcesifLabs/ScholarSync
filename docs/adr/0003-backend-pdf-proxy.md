# 0003 PDFs are proxied by the backend

The PDF viewer loads `GET /api/v1/papers/{id}/pdf`, not the publisher URL, because publishers block cross-origin PDF loads. The backend streams either the user-uploaded object from MinIO or the open-access URL stored from S2 metadata. The endpoint never accepts a URL from the client, which prevents SSRF. Responses are capped at 50 MB and must be `application/pdf`.
