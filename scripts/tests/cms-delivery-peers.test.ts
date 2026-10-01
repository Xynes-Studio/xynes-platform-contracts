import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execute = promisify(execFile);
const compiler = require.resolve('typescript/bin/tsc');
let scratchRoot = '';

async function typecheck(args: string[]) {
  try {
    await execute(process.execPath, [compiler, ...args]);
  } catch (error: unknown) {
    if (error instanceof Error && 'stdout' in error && typeof error.stdout === 'string') {
      throw new Error(`Built-package consumer typecheck failed:\n${error.stdout}`);
    }
    throw error;
  }
}

beforeAll(async () => {
  scratchRoot = await mkdtemp(join(tmpdir(), 'cms-delivery-built-peers-'));
  // Build the real production configuration once. Both consumers get identical output.
  await typecheck(['-p', resolve('tsconfig.json'), '--outDir', join(scratchRoot, 'build')]);
}, 30000);
afterAll(async () => { if (scratchRoot) await rm(scratchRoot, { recursive: true, force: true }); });

describe('CMS delivery built-package peers', () => {
  it.each(['zod', 'zod4'])('typechecks and runs the same package with %s', async (peer) => {
    const root = join(scratchRoot, peer);
    const packagePath = join(root, 'package');
    await cp(join(scratchRoot, 'build'), packagePath, { recursive: true });
    expect(await readFile(join(packagePath, 'integrations/cms-delivery.d.ts'), 'utf8'))
      .toBe(await readFile(join(scratchRoot, 'build/integrations/cms-delivery.d.ts'), 'utf8'));
    await mkdir(join(root, 'node_modules/@types'), { recursive: true });
    await symlink(dirname(require.resolve(`${peer}/package.json`)), join(root, 'node_modules/zod'), 'junction');
    await symlink(dirname(require.resolve('@types/node/package.json')), join(root, 'node_modules/@types/node'), 'junction');
    await writeFile(join(root, 'consumer.ts'), await readFile(resolve('scripts/tests/fixtures/cms-delivery-consumer.ts.txt')));
    await writeFile(join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true, skipLibCheck: false, target: 'ES2020', module: 'commonjs',
        moduleResolution: 'node', esModuleInterop: true, types: ['node'],
      },
      files: ['consumer.ts'],
    }));
    await typecheck(['-p', join(root, 'tsconfig.json'), '--pretty', 'false']);
    await expect(execute(process.execPath, [join(root, 'consumer.js')])).resolves.toMatchObject({ stdout: '', stderr: '' });
  }, 30000);
});
