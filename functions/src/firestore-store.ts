import { getFirestore } from 'firebase-admin/firestore';
import type { Store, Transaction } from '../../server/store';
export class FirestoreStore implements Store {
  async run<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const db = getFirestore();
    return db.runTransaction(async (native) => {
      const pending = new Map<string, unknown>();
      const tx: Transaction = {
        get: async <T>(path: string) => {
          if (pending.has(path)) return pending.get(path) as T;
          const snapshot = await native.get(db.doc(path));
          return snapshot.exists ? (snapshot.data() as T) : undefined;
        },
        set: <T>(path: string, data: T) => {
          pending.set(path, data);
        },
        list: async <T>(collection: string) => {
          const snapshot = await native.get(db.collection(collection));
          return snapshot.docs.map((d) => d.data() as T);
        },
      };
      const result = await fn(tx);
      for (const [path, value] of pending)
        native.set(db.doc(path), value as FirebaseFirestore.DocumentData);
      return result;
    });
  }
}
