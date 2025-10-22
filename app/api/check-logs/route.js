import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/check-logs')
    if (!res.ok) throw new Error(`Backend error ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


