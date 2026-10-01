import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CMS_DELIVERY_CONTRACT } from '../src/integrations/cms-delivery';

export function renderCmsDeliveryArtifact(): { json: string; digest: string } {
  const json = JSON.stringify(CMS_DELIVERY_CONTRACT, null, 2) + '\n';
  return { json, digest: createHash('sha256').update(json).digest('hex') + '\n' };
}

export async function exportCmsDeliveryContract(outputDirectory: string, check = false): Promise<void> {
  const { json, digest } = renderCmsDeliveryArtifact();
  const files = [
    { name: 'cms-delivery.v1.json', bytes: json },
    { name: 'cms-delivery.v1.sha256', bytes: digest },
  ];
  if (!check) await mkdir(outputDirectory, { recursive: true });
  for (const { name, bytes } of files) {
    const path = resolve(outputDirectory, name);
    if (check) {
      if (await readFile(path, 'utf8') !== bytes) throw new Error(`CMS delivery contract drift: ${name}`);
    } else {
      await writeFile(path, bytes, 'utf8');
    }
  }
}

export async function runCmsDeliveryExport(args: readonly string[], outputDirectory = resolve('contracts')): Promise<void> {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: export-cms-delivery-contract [--check]');
  }
  await exportCmsDeliveryContract(outputDirectory, args.length === 1);
}

if (require.main === module) {
  runCmsDeliveryExport(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'CMS delivery contract export failed');
    process.exitCode = 1;
  });
}
