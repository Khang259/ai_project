import { NextResponse } from 'next/server'

export async function PUT(request) {
  try {
    const body = await request.json()
    
    const response = await fetch('http://127.0.0.1:8000/api/part/update-date', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Backend API error: ${response.status} - ${errorData}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating part date:', error)
    return NextResponse.json(
      { error: 'Failed to update part date', details: error.message },
      { status: 500 }
    )
  }
}
