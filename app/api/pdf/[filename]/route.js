import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

export async function GET(request, { params }) {
  try {
    const { filename } = params
    
    console.log('PDF API called with filename:', filename)
    console.log('Current working directory:', process.cwd())
    
    // Validate filename
    const allowedFiles = ['taiLieuBaoTri.pdf', 'excel-bao-tri-amr.pdf']
    
    if (!allowedFiles.includes(filename)) {
      console.error('Filename not allowed:', filename)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Đường dẫn tới file PDF - sử dụng filename trực tiếp (đã copy file không dấu)
    const filePath = path.join(process.cwd(), 'pdf', filename)
    console.log('Attempting to read file from:', filePath)
    
    try {
      const fileBuffer = readFileSync(filePath)
      console.log('File read successfully, size:', fileBuffer.length)
      
      // Map display names
      const displayNames = {
        'taiLieuBaoTri.pdf': 'taiLieuBaoTri.pdf',
        'excel-bao-tri-amr.pdf': 'linhKien.pdf'
      }
      
      const displayName = displayNames[filename] || filename
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${encodeURIComponent(displayName)}"`,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch (fileError) {
      console.error('Error reading PDF file:', fileError)
      console.error('File path:', filePath)
      return NextResponse.json({ 
        error: 'File not accessible',
        details: fileError.message,
        path: filePath 
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Error serving PDF:', error)
    return NextResponse.json(
      { error: 'Failed to serve PDF file', details: error.message },
      { status: 500 }
    )
  }
}
