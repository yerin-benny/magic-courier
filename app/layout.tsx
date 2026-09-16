import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '마법 배달부의 세계일주',
  description: '분수 나눗셈으로 한 칸씩, 나만의 세계일주',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
