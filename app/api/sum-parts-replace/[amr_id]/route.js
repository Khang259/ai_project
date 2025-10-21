import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { amr_id } = await params
    
    if (!amr_id) {
      return NextResponse.json(
        { error: 'AMR ID is required' },
        { status: 400 }
      )
    }
    
    const response = await fetch(`http://127.0.0.1:8000/api/sum-parts-replace/${encodeURIComponent(amr_id)}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Không tìm thấy AMR với ID: ${amr_id}` },
          { status: 404 }
        )
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sum parts replace for AMR:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sum parts replace data', details: error.message },
      { status: 500 }
    )
  }
}
