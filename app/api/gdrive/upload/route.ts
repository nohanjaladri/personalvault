import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get('x-upload-url')
    if (!uploadUrl) {
      console.error('[GDrive Upload] Missing upload URL header')
      return NextResponse.json({ error: 'Upload URL required' }, { status: 400 })
    }

    const contentRange = request.headers.get('content-range')
    const contentType = request.headers.get('content-type') || 'application/octet-stream'
    const buffer = await request.arrayBuffer()
    
    console.log('[GDrive Upload] Starting upload relay', {
      uploadUrl: uploadUrl.substring(0, 100) + '...',
      contentRange,
      contentType,
      bufferSize: buffer.byteLength
    })

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

    console.log('[GDrive Upload] Google Drive response status:', driveResponse.status)

    if (!driveResponse.ok) {
      const text = await driveResponse.text()
      console.error('[GDrive Upload] Google Drive error response:', {
        status: driveResponse.status,
        statusText: driveResponse.statusText,
        body: text.substring(0, 500)
      })
      return NextResponse.json(
        { error: `Google Drive error: ${driveResponse.status} - ${text.substring(0, 200)}` },
        { status: driveResponse.status }
      )
    }

    // 200 = upload selesai, 308 = perlu continue
    if (driveResponse.status === 200) {
      const responseData = await driveResponse.json()
      console.log('[GDrive Upload] Upload complete, file ID:', responseData.id)
      return NextResponse.json(responseData)
    } else {
      // 308 Resume Incomplete
      const location = driveResponse.headers.get('location')
      console.log('[GDrive Upload] Resume incomplete, new location:', location?.substring(0, 100))
      return NextResponse.json({ resumeUrl: location }, { status: 308 })
    }
  } catch (err: any) {
    console.error('[GDrive Upload] Relay error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
