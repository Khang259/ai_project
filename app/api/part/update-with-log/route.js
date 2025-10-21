import { NextResponse } from 'next/server'

export async function PUT(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.amr_id || !body.ma_linh_kien || !body.ngay_thay_the) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: amr_id, ma_linh_kien, ngay_thay_the' },
        { status: 400 }
      )
    }
    
    const response = await fetch('http://127.0.0.1:8000/api/part/update-with-log', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Lỗi từ backend' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating part with log:', error)
    return NextResponse.json(
      { error: 'Failed to update part', details: error.message },
      { status: 500 }
    )
  }
}
