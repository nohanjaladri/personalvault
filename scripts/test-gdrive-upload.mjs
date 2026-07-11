/**
 * Test script untuk memeriksa Google Drive upload
 * Jalankan dengan: node scripts/test-gdrive-upload.mjs
 */

const BASE_URL = 'http://localhost:3000'

async function testGDriveUpload() {
  console.log('=== Google Drive Upload Diagnostic Test ===\n')
  
  // Step 1: Check authentication status
  console.log('1. Checking authentication status...')
  try {
    const statusRes = await fetch(`${BASE_URL}/api/auth/google/status`)
    console.log('Status:', statusRes.status)
    const statusData = await statusRes.json()
    console.log('Response:', JSON.stringify(statusData, null, 2))
  } catch (err) {
    console.error('Error:', err.message)
    console.log('\nNote: You need to be logged in. Open http://localhost:3000 in your browser first.')
    return
  }
  
  // Step 2: Run diagnostic
  console.log('\n2. Running Google Drive diagnostic...')
  try {
    const diagRes = await fetch(`${BASE_URL}/api/gdrive/diagnostic`)
    console.log('Status:', diagRes.status)
    const diagData = await diagRes.json()
    console.log('Response:', JSON.stringify(diagData, null, 2))
  } catch (err) {
    console.error('Error:', err.message)
  }
  
  // Step 3: Test upload URL generation
  console.log('\n3. Testing upload URL generation...')
  try {
    const uploadUrlRes = await fetch(`${BASE_URL}/api/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test-file.txt',
        contentType: 'text/plain',
        size: 10
      })
    })
    console.log('Status:', uploadUrlRes.status)
    const uploadUrlData = await uploadUrlRes.json()
    console.log('Response:', JSON.stringify(uploadUrlData, null, 2))
    
    if (uploadUrlData.uploadUrl && uploadUrlData.isGDrive) {
      console.log('\n4. Testing upload relay...')
      const uploadRes = await fetch(`${BASE_URL}/api/gdrive/upload`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'x-upload-url': uploadUrlData.uploadUrl,
          'Content-Range': 'bytes 0-9/10'
        },
        body: 'Test data!'
      })
      console.log('Upload Status:', uploadRes.status)
      const uploadData = await uploadRes.json()
      console.log('Upload Response:', JSON.stringify(uploadData, null, 2))
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
}

testGDriveUpload()
