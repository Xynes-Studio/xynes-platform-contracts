import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const INTERNAL_REQUEST_TEST_MIRRORS = [
  { suite: 'http', path: 'xynes-accounts-service/tests/internal-request-http.test.ts', framework: 'bun:test', module: '../src/infra/security/internal-request' },
  { suite: 'core', path: 'xynes-accounts-service/tests/internal-request-contract.test.ts', framework: 'bun:test', module: '../src/infra/security/internal-request' },
  { suite: 'core', path: 'xynes-cms-core/test/unit/internal-request-contract.test.ts', framework: 'bun:test', module: '../../src/infra/security/internal-request' },
  { suite: 'core', path: 'xynes-doc-service/tests/internal-request-contract.test.ts', framework: 'bun:test', module: '../src/infra/security/internal-request' },
  { suite: 'core', path: 'xynes-storage-service/tests/security/internal-request-contract.test.ts', framework: 'bun:test', module: '../../src/infra/security/internal-request' },
  { suite: 'core', path: 'xynes-telemetry-service/tests/unit/internal-request-contract.test.ts', framework: 'vitest', module: '../../src/infra/security/internal-request' },
] as const;

export const INTERNAL_REQUEST_MIRRORS = [
  'xynes-gateway/src/security/internalRequest.ts',
  'xynes-accounts-service/src/infra/security/internal-request.ts',
  'xynes-authz-service/src/infra/security/internal-request.ts',
  'xynes-cms-core/src/infra/security/internal-request.ts',
  'xynes-doc-service/src/infra/security/internal-request.ts',
  'xynes-storage-service/src/infra/security/internal-request.ts',
  'xynes-telemetry-service/src/infra/security/internal-request.ts',
] as const;

/** Export the canonical source without introducing runtime sibling dependencies. */
export async function exportInternalRequest(workspace: string, check = false): Promise<void> {
  const source = await readFile(resolve(workspace, 'xynes-platform-contracts/src/security/internal-request.ts'), 'utf8');
  const coreTests = await readFile(resolve(workspace, 'xynes-platform-contracts/src/tests/internal-request-core.test.ts'), 'utf8');
  const httpTests = await readFile(resolve(workspace, 'xynes-platform-contracts/src/tests/internal-request-http.test.ts'), 'utf8');
  const outputs = [
    ...INTERNAL_REQUEST_MIRRORS.map(path => ({ path, source })),
    ...INTERNAL_REQUEST_TEST_MIRRORS.map(({ suite, path, framework, module }) => ({
      path,
      source: `// Generated from platform-contracts internal-request-${suite}.test.ts; update the canonical suite and re-export.\n` +
        (suite === 'core' ? coreTests : httpTests).replace(/from (['"])vitest\1/g, `from '${framework}'`).replace(/from (['"])\.\.\/security\/internal-request\1/g, `from '${module}'`).replace(`import { signInternalRequest, verifyInternalRequest } from '${module}';`, `import { signInternalRequest, verifyInternalRequest } from '${module}';`.length > 100 ? `import {\n  signInternalRequest,\n  verifyInternalRequest,\n} from '${module}';` : `import { signInternalRequest, verifyInternalRequest } from '${module}';`),
    })),
  ];
  for (const { path: relative, source: contents } of outputs) {
    const file = resolve(workspace, relative);
    if (check) {
      if (await readFile(file, 'utf8') !== contents) throw new Error(`Internal request contract drift: ${relative}`);
    } else {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents, 'utf8');
    }
  }
}

export async function runInternalRequestExport(args: readonly string[], workspace = resolve('..')): Promise<void> {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: export-internal-request [--check]');
  }
  await exportInternalRequest(workspace, args.length === 1);
}

if (require.main === module) {
  runInternalRequestExport(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Internal request export failed');
    process.exitCode = 1;
  });
}
