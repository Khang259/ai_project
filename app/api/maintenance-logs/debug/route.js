import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Debug: Fetching maintenance logs debug info...')
    
    // Call FastAPI backend debug endpoint
    const response = await fetch('http://127.0.0.1:8000/api/maintenance-logs/debug')
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log('Debug: Successfully loaded debug info:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Debug: Error fetching maintenance logs debug:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch maintenance logs debug',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
