import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { CMS_PUBLICATION_POLICY_MIRRORS, runCmsPublicationPolicyExport } from '../export-cms-publication-policy';

let fixture: string | undefined;
afterEach(async () => { if (fixture) await rm(fixture, { recursive: true, force: true }); });

describe('CMS publication policy consumer parity', () => {
  it('exports exact canonical bytes and detects consumer drift without rewriting it', async () => {
    fixture = await mkdtemp(resolve(tmpdir(), 'cms-policy-export-'));
    const source = resolve(fixture, 'xynes-platform-contracts/src/integrations/cms-publication-policy.ts');
    await mkdir(resolve(source, '..'), { recursive: true });
    await writeFile(source, '// inert policy fixture\n');
    const suite = resolve(fixture, 'xynes-platform-contracts/src/tests/cms-publication-policy.test.ts');
    await mkdir(resolve(suite, '..'), { recursive: true });
    await writeFile(suite, 'import {it} from "vitest";\nimport "../integrations/cms-publication-policy";\n');
    await runCmsPublicationPolicyExport([], fixture);
    for (const relative of CMS_PUBLICATION_POLICY_MIRRORS) {
      const contents = await readFile(resolve(fixture, relative), 'utf8');
      if (!relative.endsWith('.test.ts')) {
        expect(contents).toBe('// Generated from platform-contracts; change the canonical source and re-export.\n// inert policy fixture\n');
      } else {
        expect(contents).toContain('from "bun:test"');
        expect(contents).toContain(relative.startsWith('xynes-gateway') ? '"./cms-publication-policy"' : '"../../src/security/cms-publication-policy"');
        expect(contents).not.toContain('from "vitest"');
      }
    }
    await runCmsPublicationPolicyExport(['--check'], fixture);
    for (const relative of CMS_PUBLICATION_POLICY_MIRRORS) {
      const consumer = resolve(fixture, relative);
      await writeFile(consumer, '// drift\n');
      await expect(runCmsPublicationPolicyExport(['--check'], fixture)).rejects.toThrow('CMS publication policy drift');
      expect(await readFile(consumer, 'utf8')).toBe('// drift\n');
      await runCmsPublicationPolicyExport([], fixture);
    }
    await expect(runCmsPublicationPolicyExport(['bad'], fixture)).rejects.toThrow('Usage:');
    await expect(runCmsPublicationPolicyExport(['--check', '--check'], fixture)).rejects.toThrow('Usage:');
  });
});
