import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const CMS_PUBLICATION_POLICY_MIRRORS = [
  'xynes-gateway/src/security/cms-publication-policy.ts',
  'xynes-cms-core/src/security/cms-publication-policy.ts',
  'xynes-gateway/src/security/cms-publication-policy.contract.test.ts',
  'xynes-cms-core/test/unit/cms-publication-policy.contract.test.ts',
] as const;

export async function exportCmsPublicationPolicy(workspace: string, check = false): Promise<void> {
  const source = await readFile(resolve(workspace,
    'xynes-platform-contracts/src/integrations/cms-publication-policy.ts'), 'utf8');
  const suite = await readFile(resolve(workspace,
    'xynes-platform-contracts/src/tests/cms-publication-policy.test.ts'), 'utf8');
  const outputs = [
    source, source,
    suite.replace('from "vitest"', 'from "bun:test"').replace('../integrations/cms-publication-policy', './cms-publication-policy'),
    suite.replace('from "vitest"', 'from "bun:test"').replace('../integrations/cms-publication-policy', '../../src/security/cms-publication-policy'),
  ].map(contents => '// Generated from platform-contracts; change the canonical source and re-export.\n' + contents);
  for (const [index, relative] of CMS_PUBLICATION_POLICY_MIRRORS.entries()) {
    const output = outputs[index];
    const file = resolve(workspace, relative);
    if (check) {
      if (await readFile(file, 'utf8') !== output) throw new Error(`CMS publication policy drift: ${relative}`);
    } else {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, output, 'utf8');
    }
  }
}

export async function runCmsPublicationPolicyExport(args: readonly string[], workspace = resolve('..')): Promise<void> {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: export-cms-publication-policy [--check]');
  }
  await exportCmsPublicationPolicy(workspace, args.length === 1);
}

if (require.main === module) {
  runCmsPublicationPolicyExport(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'CMS policy export failed');
    process.exitCode = 1;
  });
}
