import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { exportInternalRequest, INTERNAL_REQUEST_MIRRORS, INTERNAL_REQUEST_TEST_MIRRORS, runInternalRequestExport } from '../export-internal-request';

let fixture: string | undefined;
afterEach(async () => { if (fixture) await rm(fixture, { recursive: true, force: true }); });

describe('canonical internal request export', () => {
  it('exports all consumers, checks exact bytes and rejects drift without rewriting', async () => {
    fixture = await mkdtemp(resolve(tmpdir(), 'internal-request-export-'));
    const source = resolve(fixture, 'xynes-platform-contracts/src/security/internal-request.ts');
    await mkdir(resolve(source, '..'), { recursive: true });
    await writeFile(source, '// inert canonical fixture\n');
    const testSource = resolve(fixture, 'xynes-platform-contracts/src/tests/internal-request-core.test.ts');
    await mkdir(resolve(testSource, '..'), { recursive: true });
    await writeFile(testSource, 'import { it } from "vitest";\nimport { signInternalRequest } from "../security/internal-request";\n');
    await writeFile(resolve(fixture, 'xynes-platform-contracts/src/tests/internal-request-http.test.ts'), await readFile(testSource, 'utf8'));
    await runInternalRequestExport([], fixture);
    for (const relative of INTERNAL_REQUEST_MIRRORS) {
      expect(await readFile(resolve(fixture, relative), 'utf8')).toBe('// inert canonical fixture\n');
    }
    for (const { path, framework, module } of INTERNAL_REQUEST_TEST_MIRRORS) {
      const suite = await readFile(resolve(fixture, path), 'utf8');
      expect(suite).toContain(`from '${framework}'`);
      expect(suite).toContain(`from '${module}'`);
    }
    await runInternalRequestExport(['--check'], fixture);
    const consumer = resolve(fixture, INTERNAL_REQUEST_MIRRORS[0]);
    await writeFile(consumer, '// drift\n');
    await expect(exportInternalRequest(fixture, true)).rejects.toThrow('contract drift');
    expect(await readFile(consumer, 'utf8')).toBe('// drift\n');
    await exportInternalRequest(fixture);
    const testConsumer = resolve(fixture, INTERNAL_REQUEST_TEST_MIRRORS[0].path);
    await writeFile(testConsumer, '// changed consumer test');
    await expect(exportInternalRequest(fixture, true)).rejects.toThrow('contract drift');
    expect(await readFile(testConsumer, 'utf8')).toBe('// changed consumer test');
    await expect(runInternalRequestExport(['--invalid'], fixture)).rejects.toThrow('Usage:');
    await expect(runInternalRequestExport(['--check', '--check'], fixture)).rejects.toThrow('Usage:');
  });
});
