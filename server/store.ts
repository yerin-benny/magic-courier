export interface Transaction {
  get<T>(path: string): Promise<T | undefined>;
  set<T>(path: string, value: T): void;
  list<T>(collection: string): Promise<T[]>;
}
export interface Store {
  run<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
export class MemoryStore implements Store {
  data: Record<string, unknown> = {};
  private chain: Promise<unknown> = Promise.resolve();
  async run<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const task = this.chain.then(async () => {
      const next = structuredClone(this.data);
      const tx: Transaction = {
        get: async <T>(p: string) => next[p] as T | undefined,
        set: <T>(p: string, v: T) => {
          next[p] = v;
        },
        list: async <T>(c: string) =>
          Object.entries(next)
            .filter(([k]) => k.startsWith(c + '/') && k.split('/').length === 2)
            .map(([, v]) => v as T),
      };
      const value = await fn(tx);
      await this.persist(next);
      this.data = next;
      return value;
    });
    this.chain = task.catch(() => {});
    return task;
  }
  protected async persist(_data: Record<string, unknown>) {
    void _data;
  }
}
