import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { id_thietBi, ghi_chu, ngay_check } = await request.json()
    
    console.log('Check with notes request:', { id_thietBi, ghi_chu, ngay_check })
    
    // Validate required fields
    if (!id_thietBi || !ghi_chu || !ngay_check) {
      return NextResponse.json(
        { error: 'Missing required fields: id_thietBi, ghi_chu, ngay_check' },
        { status: 400 }
      )
    }
    
    // Call FastAPI backend
    const response = await fetch('http://127.0.0.1:8000/api/maintenance-check/check-with-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_thietBi,
        ghi_chu,
        ngay_check
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to check with notes' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    console.log('Successfully checked with notes via FastAPI:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error checking with notes:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check with notes',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
