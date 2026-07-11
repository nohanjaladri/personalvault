import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedGoogleClientAndAuth } from '@/lib/gdrive'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const diagnostics: any = {
    userId: user.id,
    timestamp: new Date().toISOString(),
    steps: []
  }

  try {
    // Step 1: Check if Google tokens exist
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    diagnostics.steps.push({
      step: 'Check Google tokens in database',
      success: !tokenError && !!tokenData,
      error: tokenError?.message,
      hasToken: !!tokenData,
      tokenExpiry: tokenData?.expiry_date ? new Date(Number(tokenData.expiry_date)).toISOString() : null,
      hasRefreshToken: !!tokenData?.refresh_token
    })

    if (!tokenData) {
      return NextResponse.json({
        ...diagnostics,
        conclusion: 'Google Drive tidak terhubung. Silakan hubungkan di halaman Pengaturan.'
      })
    }

    // Step 2: Get OAuth2 client
    let drive, oauth2Client
    try {
      const authData = await getAuthorizedGoogleClientAndAuth(user.id)
      drive = authData.drive
      oauth2Client = authData.oauth2Client
      
      diagnostics.steps.push({
        step: 'Initialize Google Drive client',
        success: true
      })
    } catch (authErr: any) {
      diagnostics.steps.push({
        step: 'Initialize Google Drive client',
        success: false,
        error: authErr.message
      })
      return NextResponse.json({
        ...diagnostics,
        conclusion: 'Gagal menginisialisasi Google Drive client: ' + authErr.message
      })
    }

    // Step 3: Test API call - get user's Drive info
    try {
      const aboutRes = await drive.about.get({ fields: 'user,storageQuota' })
      diagnostics.steps.push({
        step: 'Test Drive API - get about info',
        success: true,
        user: aboutRes.data.user?.displayName,
        storageUsed: aboutRes.data.storageQuota?.limit 
          ? `${Math.round(Number(aboutRes.data.storageQuota.usage) / 1024 / 1024)} MB used of ${Math.round(Number(aboutRes.data.storageQuota.limit) / 1024 / 1024)} MB`
          : 'Unlimited'
      })
    } catch (apiErr: any) {
      diagnostics.steps.push({
        step: 'Test Drive API - get about info',
        success: false,
        error: apiErr.message,
        status: apiErr.status
      })
      return NextResponse.json({
        ...diagnostics,
        conclusion: 'Google Drive API error: ' + apiErr.message
      })
    }

    // Step 4: Check/create PersonalVault folder
    try {
      const listRes = await drive.files.list({
        q: "name = 'PersonalVault' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id,name)',
        spaces: 'drive'
      })
      
      const folder = listRes.data.files?.[0]
      diagnostics.steps.push({
        step: 'Check PersonalVault folder',
        success: true,
        folderId: folder?.id,
        folderName: folder?.name
      })
    } catch (folderErr: any) {
      diagnostics.steps.push({
        step: 'Check PersonalVault folder',
        success: false,
        error: folderErr.message
      })
    }

    // Step 5: Test resumable upload initialization
    try {
      const accessToken = await oauth2Client.getAccessToken()
      const testResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'text/plain',
          'X-Upload-Content-Length': '5'
        },
        body: JSON.stringify({
          name: 'diagnostic-test.txt',
          parents: []
        })
      })

      if (testResponse.ok) {
        const uploadUrl = testResponse.headers.get('location')
        diagnostics.steps.push({
          step: 'Test resumable upload initialization',
          success: true,
          uploadUrl: uploadUrl ? uploadUrl.substring(0, 100) + '...' : null
        })
      } else {
        const errorText = await testResponse.text()
        diagnostics.steps.push({
          step: 'Test resumable upload initialization',
          success: false,
          status: testResponse.status,
          error: errorText.substring(0, 500)
        })
      }
    } catch (uploadErr: any) {
      diagnostics.steps.push({
        step: 'Test resumable upload initialization',
        success: false,
        error: uploadErr.message
      })
    }

    return NextResponse.json({
      ...diagnostics,
      conclusion: 'Semua tes berhasil. Google Drive siap digunakan.'
    })

  } catch (err: any) {
    return NextResponse.json({
      ...diagnostics,
      conclusion: 'Error: ' + err.message
    }, { status: 500 })
  }
}
