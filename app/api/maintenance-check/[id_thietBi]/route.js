import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { id_thietBi } = params
    
    const response = await fetch(`http://127.0.0.1:8000/api/maintenance-check/${id_thietBi}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Không tìm thấy thông tin bảo trì cho thiết bị ID: ${id_thietBi}` },
          { status: 404 }
        )
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching maintenance check by device:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance check by device', details: error.message },
      { status: 500 }
    )
  }
}
