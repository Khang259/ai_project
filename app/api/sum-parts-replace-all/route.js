import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/sum-parts-replace-all')
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sum parts replace all:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sum parts replace data', details: error.message },
      { status: 500 }
    )
  }
}
