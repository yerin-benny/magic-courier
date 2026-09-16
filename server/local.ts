import { randomBytes } from 'node:crypto';
import { FileStore } from './file-store';
import { CourierService } from './service';
const root = globalThis as unknown as { courierStore?: FileStore; courierService?: CourierService };
export function localService() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_BACKEND !== 'true')
    throw Error('운영에서는 Firebase 모드를 설정해 주세요.');
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET)
    throw Error('SESSION_SECRET이 필요해요.');
  root.courierStore ??= new FileStore(process.env.LOCAL_DATA_PATH ?? '.local-data/state.json');
  root.courierService ??= new CourierService(
    root.courierStore,
    process.env.SESSION_SECRET ?? 'local-development-pepper-set-before-deployment',
    () => Date.now(),
    Number(process.env.DAILY_RANKING_CAP ?? 25),
  );
  return root.courierService;
}
export const newToken = () => randomBytes(32).toString('hex');
