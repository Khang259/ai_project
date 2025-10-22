import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action_type = searchParams.get('action_type')
    
    console.log('Fetching maintenance logs for action:', action_type)
    
    // Build URL with query parameter
    const url = action_type 
      ? `http://127.0.0.1:8000/api/maintenance-logs?action_type=${encodeURIComponent(action_type)}`
      : 'http://127.0.0.1:8000/api/maintenance-logs'
    
    // Call FastAPI backend
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log(`Successfully loaded ${data.total_logs} logs for action: ${action_type}`)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching maintenance logs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch maintenance logs',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
