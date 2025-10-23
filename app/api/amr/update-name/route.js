import { NextResponse } from 'next/server'

export async function PUT(request) {
  try {
    const body = await request.json()
    const { old_amr_id, new_amr_id } = body

    // Validate input
    if (!old_amr_id || !new_amr_id) {
      return NextResponse.json(
        { success: false, message: 'old_amr_id và new_amr_id không được để trống' },
        { status: 400 }
      )
    }

    if (old_amr_id === new_amr_id) {
      return NextResponse.json(
        { success: false, message: 'old_amr_id và new_amr_id không được giống nhau' },
        { status: 400 }
      )
    }

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/amr/update-name`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        old_amr_id,
        new_amr_id
      })
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: result.detail || 'Lỗi khi cập nhật tên AMR' },
        { status: response.status }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error updating AMR name:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi server: ' + error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const amr_id = searchParams.get('amr_id')

    if (!amr_id) {
      return NextResponse.json(
        { success: false, message: 'amr_id không được để trống' },
        { status: 400 }
      )
    }

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001'
    const response = await fetch(`${backendUrl}/api/amr/${amr_id}/exists`)

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: result.detail || 'Lỗi khi kiểm tra AMR' },
        { status: response.status }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error checking AMR exists:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi server: ' + error.message },
      { status: 500 }
    )
  }
}
