import { MemoryStore } from './store';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
export class FileStore extends MemoryStore {
  private ready: Promise<void>;
  private path: string;
  constructor(path: string) {
    super();
    this.path = resolve(path);
    this.ready = readFile(this.path, 'utf8')
      .then((s) => {
        this.data = JSON.parse(s);
      })
      .catch((e: NodeJS.ErrnoException) => {
        if (e.code !== 'ENOENT') throw e;
      });
  }
  override async run<T>(fn: Parameters<MemoryStore['run']>[0]): Promise<T> {
    await this.ready;
    return super.run(fn) as Promise<T>;
  }
  protected override async persist(data: Record<string, unknown>) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path + '.tmp', JSON.stringify(data), { mode: 0o600 });
    await rename(this.path + '.tmp', this.path);
  }
}
