const SftpClient = require('ssh2-sftp-client');
const config = require('./modules/config'); // Pulls your exact credentials

async function runTest() {
  const sftp = new SftpClient();
  
  console.log('--- STARTING RAW SFTP TEST ---');
  
  try {
    console.log('1. Attempting connection...');
    await sftp.connect({
      host: config.sftp.host,
      port: config.sftp.port,
      username: config.sftp.username,
      password: config.sftp.password,
      readyTimeout: 10000,
      // This will spit out the raw network handshake so we can see the exact moment the host kills it
      debug: msg => console.log('[SSH2 DEBUG]', msg) 
    });
    
    console.log('\n2. Connected! Waiting 1 second before asking for the file...');
    await new Promise(res => setTimeout(res, 1000));
    
    console.log(`\n3. Asking for file stats on: ${config.sftp.logPath}`);
    const fileStat = await sftp.stat(config.sftp.logPath);
    
    console.log('\n4. SUCCESS! File stats received:');
    console.log('Size:', fileStat.size, 'bytes');
    
    await sftp.end();
    console.log('--- TEST COMPLETE (Closed Cleanly) ---');
    
  } catch (err) {
    console.error('\n!!! TEST FAILED !!!');
    console.error('Error Message:', err.message);
    if (err.code) console.error('Error Code:', err.code);
  }
}

runTest();