import { execFile } from 'node:child_process';

export const IMAGE = 'core-service:test';

export interface DockerResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs the Docker CLI; never throws on a non-zero exit code. */
export function docker(
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<DockerResult> {
  return new Promise((resolve) => {
    execFile(
      'docker',
      args,
      { timeout: opts.timeoutMs ?? 60_000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const code =
          error === null ? 0 : typeof error.code === 'number' ? error.code : 1;
        resolve({ code, stdout, stderr });
      },
    );
  });
}

export async function dockerOk(
  args: string[],
  opts?: { timeoutMs?: number },
): Promise<string> {
  const res = await docker(args, opts);
  if (res.code !== 0) {
    throw new Error(
      `docker ${args.join(' ')} failed (${res.code}): ${res.stderr}`,
    );
  }
  return res.stdout.trim();
}

/** Valid configuration. */
export const VALID_ENV: Readonly<Record<string, string>> = Object.freeze({
  PORT: '3000',
  LOG_LEVEL: 'info',
});

export interface RunOptions {
  readonly env: Readonly<Record<string, string>>;
  readonly network?: string;
}

/** Starts a detached container from IMAGE. */
export async function runContainer(
  name: string,
  opts: RunOptions,
): Promise<void> {
  const args = ['run', '-d', '--name', name];
  for (const [key, value] of Object.entries(opts.env)) {
    args.push('-e', `${key}=${value}`);
  }
  if (opts.network) args.push('--network', opts.network);
  args.push(IMAGE);
  await dockerOk(args);
}

export async function waitHealthy(
  name: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let status = '';
  while (Date.now() < deadline) {
    status = await dockerOk([
      'inspect',
      '-f',
      '{{.State.Health.Status}}',
      name,
    ]);
    if (status === 'healthy') return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `${name} not healthy after ${timeoutMs} ms (last: ${status})`,
  );
}

export interface HttpResult {
  readonly status: number;
  readonly body: unknown;
}

/**
 * HTTP request made from inside the container, so the suite does not depend on
 * host port publishing.
 */
export async function httpInContainer(
  name: string,
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<HttpResult> {
  const script = `
    const res = await fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + process.argv[1], JSON.parse(process.argv[2]));
    const text = await res.text();
    process.stdout.write(JSON.stringify({ status: res.status, text }));
  `;
  const out = await dockerOk([
    'exec',
    name,
    'node',
    '--input-type=module',
    '-e',
    script,
    path,
    JSON.stringify(init),
  ]);
  const { status, text } = JSON.parse(out) as { status: number; text: string };
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // non-JSON body
  }
  return { status, body };
}

export async function removeAll(names: string[]): Promise<void> {
  if (names.length > 0) await docker(['rm', '-f', '-v', ...names]);
}

/** Stops a container and returns how long it took and its exit code. */
export async function stopTimed(
  name: string,
): Promise<{ ms: number; exitCode: number }> {
  const startedAt = Date.now();
  await dockerOk(['stop', '-t', '10', name], { timeoutMs: 30_000 });
  const ms = Date.now() - startedAt;
  const exitCode = Number(
    await dockerOk(['inspect', '-f', '{{.State.ExitCode}}', name]),
  );
  return { ms, exitCode };
}
