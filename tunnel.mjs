import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

let currentUrl = null;

function sendRegistration(url) {
  const req = http.request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkin-sessions/tunnel-url',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    (res) => {}
  );

  req.on('error', () => {});
  req.write(JSON.stringify({ url }));
  req.end();
}

function notifyBackend(url) {
  if (currentUrl === url) return;
  currentUrl = url;
  console.log('\n=========================================');
  console.log('>>> ACTIVE PUBLIC HTTPS TUNNEL URL (CLOUDFLARE):');
  console.log('>>>', url);
  console.log('=========================================\n');
  sendRegistration(url);
}

// Keep backend synced with active tunnel URL every 5 seconds
setInterval(() => {
  if (currentUrl) {
    sendRegistration(currentUrl);
  }
}, 5000);

function startCloudflareTunnel() {
  const exePath = path.join(process.cwd(), 'cloudflared.exe');
  const hasExe = fs.existsSync(exePath);

  const cmd = hasExe ? exePath : 'cloudflared';
  const args = ['tunnel', '--url', 'http://localhost:5180'];

  console.log(`[Bitnox Tunnel] Starting Cloudflare Quick Tunnel (${cmd})...`);

  const proc = spawn(cmd, args);

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/([a-zA-Z0-9_-]+\.trycloudflare\.com)/);
    if (match && match[0]) {
      notifyBackend(match[0]);
    }
  };

  proc.stdout.on('data', handleOutput);
  proc.stderr.on('data', handleOutput);

  proc.on('close', (code) => {
    console.log(`[Bitnox Tunnel] Cloudflare process exited (code ${code}). Auto-reconnecting in 3s...`);
    currentUrl = null;
    setTimeout(startCloudflareTunnel, 3000);
  });
}

startCloudflareTunnel();
