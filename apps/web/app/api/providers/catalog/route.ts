import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch('https://models.dev/api.json', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `models.dev returned ${response.status}` }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching models.dev:', error)
    return NextResponse.json({ error: 'Failed to fetch provider catalog' }, { status: 500 })
  }
}
