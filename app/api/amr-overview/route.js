import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/amr-overview')
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching AMR overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AMR overview', details: error.message },
      { status: 500 }
    )
  }
}
