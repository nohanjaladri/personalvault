import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get('x-upload-url')
    if (!uploadUrl) {
      return NextResponse.json({ error: 'Upload URL required' }, { status: 400 })
    }

    const contentRange = request.headers.get('content-range')
    const contentType = request.headers.get('content-type') || 'application/octet-stream'
    const buffer = await request.arrayBuffer()

    // Relay ke Google Drive API
    const relayHeaders: Record<string, string> = {
      'Content-Type': contentType,
    }
    if (contentRange) relayHeaders['Content-Range'] = contentRange

    const driveResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: relayHeaders,
      body: buffer,
    })

    if (!driveResponse.ok) {
      const text = await driveResponse.text()
      console.error('Google Drive error:', text)
      return NextResponse.json(
        { error: `Google Drive error: ${driveResponse.status}` },
        { status: driveResponse.status }
      )
    }

    // 200 = upload selesai, 308 = perlu continue
    if (driveResponse.status === 200) {
      const responseData = await driveResponse.json()
      return NextResponse.json(responseData)
    } else {
      // 308 Resume Incomplete
      const location = driveResponse.headers.get('location')
      return NextResponse.json({ resumeUrl: location }, { status: 308 })
    }
  } catch (err: any) {
    console.error('Relay error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
