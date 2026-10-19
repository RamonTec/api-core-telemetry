import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { TEST_ENV } from './test-env.js';

async function waitForTcp(
  host: string,
  port: number,
  timeoutMs = 60_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });

    if (reachable) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Timeout (${timeoutMs}ms) waiting for TCP connection to ${host}:${port}`,
  );
}

export async function setup(): Promise<void> {
  const dbUrl = process.env['DATABASE_TEST_URL'] ?? TEST_ENV['DATABASE_URL'];
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined in TEST_ENV');
  }

  const url = new URL(dbUrl);
  const host = url.hostname || '127.0.0.1';
  const port = Number(url.port) || 3306;

  await waitForTcp(host, port, 60_000);

  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
    stdio: 'inherit',
  });
}

export default setup;
