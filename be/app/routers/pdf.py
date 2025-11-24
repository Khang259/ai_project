from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from pathlib import Path

router = APIRouter()

# Đường dẫn tới thư mục PDF (tương đối với file này)
PDF_DIR = Path(__file__).parent.parent.parent / "pdf"

# Danh sách file PDF được phép
ALLOWED_FILES = ["taiLieuBaoTri.pdf", "linhKien.pdf"]

@router.get("/api/pdf/{filename}")
async def get_pdf(filename: str):
    """
    Serve PDF files từ thư mục pdf/
    
    Args:
        filename: Tên file PDF (taiLieuBaoTri.pdf hoặc linhKien.pdf)
    
    Returns:
        FileResponse: PDF file
    """
    # Validate filename
    if filename not in ALLOWED_FILES:
        raise HTTPException(
            status_code=404,
            detail=f"File không được phép: {filename}. Chỉ cho phép: {', '.join(ALLOWED_FILES)}"
        )
    
    # Tạo đường dẫn đầy đủ
    file_path = PDF_DIR / filename
    
    # Kiểm tra file có tồn tại không
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File không tìm thấy: {filename}"
        )
    
    # Trả về file PDF với Content-Type phù hợp
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f"inline; filename={filename}"
        }
    )

