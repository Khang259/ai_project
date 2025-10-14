import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { ma_linh_kien } = params
    
    const response = await fetch(`http://127.0.0.1:8000/api/part/${ma_linh_kien}/amr`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Không tìm thấy linh kiện này trong hệ thống' },
          { status: 404 }
        )
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching part details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch part details', details: error.message },
      { status: 500 }
    )
  }
}
