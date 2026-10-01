import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CMS_DELIVERY_CONTRACT } from '../../src/integrations/cms-delivery';
import { exportCmsDeliveryContract, renderCmsDeliveryArtifact, runCmsDeliveryExport } from '../export-cms-delivery-contract';

const directories: string[] = [];
async function temporaryDirectory() {
  const path = await mkdtemp(join(tmpdir(), 'cms-delivery-contract-'));
  directories.push(path);
  return path;
}
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe('deterministic CMS delivery export', () => {
  it('renders canonical metadata with a digest of the exact bytes', () => {
    const first = renderCmsDeliveryArtifact();
    expect(first).toEqual(renderCmsDeliveryArtifact());
    expect(first.json).toBe(JSON.stringify(CMS_DELIVERY_CONTRACT, null, 2) + '\n');
    expect(first.digest).toBe(createHash('sha256').update(first.json).digest('hex') + '\n');
  });

  it('creates both artifacts and checks them without rewriting', async () => {
    const output = join(await temporaryDirectory(), 'contracts');
    await exportCmsDeliveryContract(output);
    const artifact = join(output, 'cms-delivery.v1.json');
    const digest = join(output, 'cms-delivery.v1.sha256');
    const before = await stat(artifact);
    await expect(exportCmsDeliveryContract(output, true)).resolves.toBeUndefined();
    expect((await stat(artifact)).mtimeMs).toBe(before.mtimeMs);
    expect(await readFile(artifact, 'utf8')).toBe(renderCmsDeliveryArtifact().json);
    expect(await readFile(digest, 'utf8')).toBe(renderCmsDeliveryArtifact().digest);
  });

  it.each(['cms-delivery.v1.json', 'cms-delivery.v1.sha256'])('rejects drift in %s without healing it', async (name) => {
    const output = await temporaryDirectory();
    await exportCmsDeliveryContract(output);
    await writeFile(join(output, name), 'drift\n');
    await expect(exportCmsDeliveryContract(output, true)).rejects.toThrow('drift');
    expect(await readFile(join(output, name), 'utf8')).toBe('drift\n');
  });

  it('rejects equivalent JSON with different bytes', async () => {
    const output = await temporaryDirectory();
    await exportCmsDeliveryContract(output);
    await writeFile(join(output, 'cms-delivery.v1.json'), JSON.stringify(CMS_DELIVERY_CONTRACT));
    await expect(exportCmsDeliveryContract(output, true)).rejects.toThrow('drift');
  });

  it('does not generate missing files during check', async () => {
    const output = join(await temporaryDirectory(), 'missing');
    await expect(exportCmsDeliveryContract(output, true)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('propagates write failures', async () => {
    const output = await temporaryDirectory();
    await mkdir(join(output, 'cms-delivery.v1.json'));
    await expect(exportCmsDeliveryContract(output)).rejects.toMatchObject({ code: 'EISDIR' });
  });

  it('dispatches export and check CLI modes', async () => {
    const output = await temporaryDirectory();
    await runCmsDeliveryExport([], output);
    await expect(runCmsDeliveryExport(['--check'], output)).resolves.toBeUndefined();
    await writeFile(join(output, 'cms-delivery.v1.sha256'), 'changed');
    await expect(runCmsDeliveryExport(['--check'], output)).rejects.toThrow('drift');
  });

  it.each([{ args: ['--unknown'] }, { args: ['--check', '--check'] }, { args: ['--output', '/tmp'] }])('rejects ambiguous CLI arguments %#', async ({ args }) => {
    await expect(runCmsDeliveryExport(args, await temporaryDirectory())).rejects.toThrow('Usage');
  });
});
