import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { amr_id, ma_linh_kien } = await params
    
    let url = `http://127.0.0.1:8000/api/maintenance-logs/${encodeURIComponent(amr_id)}`
    
    // Nếu có ma_linh_kien thì thêm vào URL
    if (ma_linh_kien) {
      url += `/${encodeURIComponent(ma_linh_kien)}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Không tìm thấy logs cho AMR: ${amr_id}${ma_linh_kien ? ` và linh kiện: ${ma_linh_kien}` : ''}` },
          { status: 404 }
        )
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching maintenance logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance logs', details: error.message },
      { status: 500 }
    )
  }
}
