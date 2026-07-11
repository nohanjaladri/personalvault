// Jalankan script ini di browser console (F12) saat sudah login ke aplikasi
// Copy-paste seluruh script ke console

(async function testGDriveUpload() {
  console.log('=== Google Drive Upload Test ===\n');
  
  // Step 1: Check auth status
  console.log('1. Checking auth status...');
  const statusRes = await fetch('/api/auth/google/status');
  const statusData = await statusRes.json();
  console.log('Auth status:', statusData);
  
  if (!statusData.isConnected) {
    console.error('❌ Google Drive tidak terhubung!');
    console.log('Silakan hubungkan Google Drive di halaman Pengaturan.');
    return;
  }
  
  // Step 2: Run diagnostic
  console.log('\n2. Running diagnostic...');
  const diagRes = await fetch('/api/gdrive/diagnostic');
  const diagData = await diagRes.json();
  console.log('Diagnostic result:', diagData);
  
  // Step 3: Test upload URL for different file types
  const testFiles = [
    { name: 'test-image.jpg', type: 'image/jpeg', size: 1000 },
    { name: 'test-document.pdf', type: 'application/pdf', size: 2000 },
    { name: 'test-text.txt', type: 'text/plain', size: 500 },
  ];
  
  for (const file of testFiles) {
    console.log(`\n3. Testing upload URL for ${file.name} (${file.type})...`);
    const uploadRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file)
    });
    const uploadData = await uploadRes.json();
    console.log('Result:', {
      status: uploadRes.status,
      isGDrive: uploadData.isGDrive,
      hasUploadUrl: !!uploadData.uploadUrl,
      error: uploadData.error
    });
  }
  
  console.log('\n=== Test Complete ===');
})();
