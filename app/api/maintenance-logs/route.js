import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/maintenance-logs')
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Không tìm thấy logs bảo trì' },
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