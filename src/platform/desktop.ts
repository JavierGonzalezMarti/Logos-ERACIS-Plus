import { invoke, isTauri } from '@tauri-apps/api/core';
import { writeFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { GeneratedOutput } from '../export/output';

export async function saveOutput(output: GeneratedOutput): Promise<boolean> {
  if (!isTauri()) {
    const url = URL.createObjectURL(output.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = output.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  }
  const path = await invoke<string | null>('choose_output_path', { filename: output.filename });
  if (!path) return false;
  await writeFile(path, new Uint8Array(await output.blob.arrayBuffer()));
  return true;
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) await openUrl(url);
  else window.open(url, '_blank', 'noopener');
}
