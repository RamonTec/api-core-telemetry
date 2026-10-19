import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  docker,
  dockerOk,
  httpInContainer,
  IMAGE,
  removeAll,
  runContainer,
  stopTimed,
  VALID_ENV,
  waitHealthy,
} from './docker.js';

const RUN_ID = `${process.pid}-${Date.now()}`;

describe('Container image (spec 002)', () => {
  const containers: string[] = [];
  let counter = 0;

  function containerName(): string {
    const name = `core-service-image-test-${RUN_ID}-${++counter}`;
    containers.push(name);
    return name;
  }

  async function inspect<T>(format: string): Promise<T> {
    return JSON.parse(
      await dockerOk([
        'image',
        'inspect',
        IMAGE,
        '--format',
        `{{json ${format}}}`,
      ]),
    ) as T;
  }

  async function shell(command: string): Promise<string> {
    return dockerOk([
      'run',
      '--rm',
      '--entrypoint',
      'sh',
      IMAGE,
      '-c',
      command,
    ]);
  }

  beforeAll(async () => {
    await dockerOk(['build', '-t', IMAGE, '.'], { timeoutMs: 600_000 });
  });

  afterEach(async () => {
    await removeAll(containers.splice(0));
  });

  it('AC-1: pins the Node version of the image to .node-version', async () => {
    const expected = readFileSync('.node-version', 'utf8').trim();
    expect(await shell('node --version')).toBe(`v${expected}`);
  });

  it('AC-1: the build fails when package.json and the lockfile disagree', async () => {
    const context = mkdtempSync(join(tmpdir(), 'core-service-ctx-'));
    try {
      for (const file of ['Dockerfile', '.dockerignore', 'pnpm-lock.yaml']) {
        cpSync(file, join(context, file));
      }
      const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
        dependencies: Record<string, string>;
      };
      pkg.dependencies['left-pad'] = '1.3.0';
      writeFileSync(join(context, 'package.json'), JSON.stringify(pkg));

      const res = await docker(
        ['build', '--target', 'deps', '-t', `${IMAGE}-mismatch`, context],
        { timeoutMs: 300_000 },
      );

      expect(res.code).not.toBe(0);
      expect(res.stdout + res.stderr).toMatch(/lockfile/i);
    } finally {
      rmSync(context, { recursive: true, force: true });
    }
  });

  it('AC-2: with a valid configuration it listens on PORT and GET /health returns 200', async () => {
    const name = containerName();
    await runContainer(name, { env: { ...VALID_ENV, PORT: '3100' } });
    await waitHealthy(name, 30_000);

    const res = await httpInContainer(name, '/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('AC-2: with invalid configuration it exits with non-zero exit code naming the variable', async () => {
    const args = ['run', '--rm', '-e', 'PORT=abc', IMAGE];

    const res = await docker(args);

    expect(res.code).not.toBe(0);
    const line = JSON.parse(res.stderr.trim().split('\n').at(-1)!) as {
      invalidVariables: string[];
    };
    expect(line.invalidVariables).toContain('PORT');
  });

  it('AC-3: runs as the unprivileged node user', async () => {
    expect(await inspect<string>('.Config.User')).toBe('node');
    expect(await shell('id -u')).toBe('1000');
  });

  it('AC-4: contains only compiled code and production dependencies, without environment-specific configuration', async () => {
    expect((await shell('ls -A /app')).split('\n').sort()).toEqual([
      'dist',
      'node_modules',
      'package.json',
    ]);
    expect(
      await shell(
        'find /app -path /app/node_modules -prune -o -name "*.ts" ! -name "*.d.ts" -print',
      ),
    ).toBe('');
    expect(
      await shell('find /app/dist -name "*.spec.*" -o -name "__fakes__"'),
    ).toBe('');
    expect(await shell('find / -xdev -name ".env*" 2>/dev/null; true')).toBe(
      '',
    );
    expect(
      await shell(
        'ls /app/node_modules | grep -E "^(vitest|typescript|@nestjs)$" || true',
      ),
    ).toBe('@nestjs');
    expect(await shell('ls /app/node_modules/@nestjs')).not.toMatch(
      /cli|testing|schematics/,
    );

    const env = await inspect<string[]>('.Config.Env');
    const names = env.map((entry) => entry.split('=')[0]).sort();
    expect(names).toEqual(
      ['NODE_ENV', 'NODE_VERSION', 'PATH', 'YARN_VERSION'].sort(),
    );
  });

  it('AC-5: declares a healthcheck on GET /health and becomes healthy', async () => {
    const healthcheck = await inspect<{ Test: string[] }>(
      '.Config.Healthcheck',
    );
    expect(healthcheck.Test.join(' ')).toContain('/health');

    const name = containerName();
    await runContainer(name, { env: VALID_ENV });
    await waitHealthy(name, 30_000);
  });

  it('AC-6: when receiving SIGTERM (docker stop), exits with code 0 in < 10 s', async () => {
    const name = containerName();
    await runContainer(name, { env: VALID_ENV });
    await waitHealthy(name, 30_000);

    const { ms, exitCode } = await stopTimed(name);

    expect(exitCode).toBe(0);
    expect(ms).toBeLessThan(10_000);
  });
});
