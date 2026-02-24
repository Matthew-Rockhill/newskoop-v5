/**
 * Global Setup for Integration Tests
 *
 * Starts a Next.js dev server on port 3099 before tests run,
 * waits for it to be ready, and returns a teardown function
 * that kills it when tests complete.
 */

import { spawn, ChildProcess } from 'child_process';

let server: ChildProcess;

export async function setup() {
  const isWindows = process.platform === 'win32';

  server = spawn(
    isWindows ? 'npx.cmd' : 'npx',
    ['next', 'dev', '--port', '3099', '--turbopack'],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: isWindows,
      env: { ...process.env },
    }
  );

  // Log server output for debugging startup issues
  server.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes('Ready') || msg.includes('ready') || msg.includes('Error')) {
      console.log(`[next-dev] ${msg.trim()}`);
    }
  });

  server.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString();
    // Only log actual errors, not noisy warnings
    if (msg.includes('Error') || msg.includes('error')) {
      console.error(`[next-dev] ${msg.trim()}`);
    }
  });

  // Wait for server to be ready (poll every 500ms, max 60s)
  const maxWait = 60_000;
  const start = Date.now();
  let ready = false;

  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch('http://localhost:3099/api/auth/session');
      if (res.ok || res.status === 200) {
        ready = true;
        break;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    server?.kill();
    throw new Error('Next.js dev server failed to start within 60s');
  }

  console.log(`[global-setup] Next.js dev server ready on :3099 (${Date.now() - start}ms)`);

  // Warm up the API routes so Next.js compiles them before tests start.
  // Without this, the first request to each route adds ~5-7s of cold-start.
  console.log('[global-setup] Warming up API routes...');
  const warmupStart = Date.now();
  await Promise.all([
    fetch('http://localhost:3099/api/radio/stories').catch(() => {}),
    fetch('http://localhost:3099/api/newsroom/stories/warmup/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {}),
  ]);
  console.log(`[global-setup] Routes warmed up (${Date.now() - warmupStart}ms)`);

  return async function teardown() {
    if (server && !server.killed) {
      // On Windows, need to kill the process tree
      if (process.platform === 'win32' && server.pid) {
        spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], {
          shell: true,
        });
      } else {
        server.kill('SIGTERM');
      }
    }
  };
}
