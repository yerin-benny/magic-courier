import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { Delivery, Student } from '../server/models';
// Read server-side snapshots only from the isolated E2E file. No answer API ships.
async function snapshot(nickname: string) {
  const data = JSON.parse(
    await readFile(process.env.E2E_DATA_PATH ?? '.local-data/e2e.json', 'utf8'),
  );
  const student = Object.entries(data).find(
    ([key, value]) => key.startsWith('students/') && (value as Student).nickname === nickname,
  )?.[1] as Student;
  return { student, delivery: data['deliverySessions/' + student.activeSession] as Delivery };
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
test('가입 → 20문제 → 4배송 완주 → 복원·여권·랭킹', async ({ page }, info) => {
  const nickname = '우편' + Date.now().toString(36).slice(-7) + info.project.name[0];
  await page.goto('/');
  await page.getByRole('combobox', { name: /학교/ }).selectOption('sample-seoul');
  await page.getByLabel('닉네임', { exact: true }).fill(nickname);
  await page.getByLabel('비밀 PIN 4자리').fill('2468');
  await page.getByRole('button', { name: '바로 시작' }).click();
  await expect(page.getByRole('heading', { name: '1번째 세계일주' })).toBeVisible();
  await noOverflow(page);
  for (let leg = 0; leg < 4; leg++) {
    if (leg === 0) await page.getByRole('button', { name: '배송 시작하기' }).click();
    for (let i = 0; i < 5; i++) {
      await expect(page.getByRole('heading', { name: '나의 답', exact: true })).toBeVisible();
      const { delivery } = await snapshot(nickname),
        p = delivery.problems[i];
      if (leg === 0 && i === 0) {
        await page.getByLabel('분모', { exact: true }).focus();
        await page.getByRole('button', { name: '0', exact: true }).click();
        await expect(page.getByLabel('분모', { exact: true })).toHaveValue('');
        await page.getByRole('button', { name: '2', exact: true }).click();
        await page.getByRole('button', { name: '다음 칸', exact: true }).click();
        await expect(page.getByLabel('자연수', { exact: true })).toBeFocused();
        await page.getByLabel('분자', { exact: true }).fill(String(p.answer.n * 2));
        await page.getByLabel('분모', { exact: true }).fill(String(p.answer.d * 2));
        await page.getByLabel('분모', { exact: true }).press('Enter');
        await expect(page.getByRole('status')).toContainText('더 간단히');
        await page.reload();
        await expect(page.getByRole('heading', { name: '나의 답', exact: true })).toBeVisible();
      }
      if (p.type === 'E') {
        await page.getByLabel('역수 분자', { exact: true }).fill(String(p.right.d));
        await page.getByLabel('역수 분모', { exact: true }).fill(String(p.right.n));
      }
      if (p.answer.d === 1) {
        await page.getByLabel('자연수', { exact: true }).fill(String(p.answer.n));
        await page.getByLabel('분자', { exact: true }).fill('');
        await page.getByLabel('분모', { exact: true }).fill('');
      } else {
        await page.getByLabel('분자', { exact: true }).fill(String(p.answer.n));
        await page.getByLabel('분모', { exact: true }).fill(String(p.answer.d));
      }
      await noOverflow(page);
      await page.getByRole('button', { name: /정답 확인/ }).click();
      if (i < 4)
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(i + 1));
    }
    if (leg < 3) {
      await expect(page.getByRole('heading', { name: /도착!$/ })).toBeVisible();
      await page.getByRole('button', { name: '다음 배송 시작' }).click();
    }
  }
  await expect(page.getByRole('heading', { name: '1번째 세계일주 완료!' })).toBeVisible();
  expect((await snapshot(nickname)).student.dust).toBe(70);
  await page.reload();
  await expect(page.getByRole('heading', { name: '1번째 세계일주 완료!' })).toBeVisible();
  await page.getByRole('button', { name: '여권 펼쳐 보기' }).click();
  await expect(page.getByText('4 / 30', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: '학교 랭킹', exact: true }).click();
  await expect(page.getByRole('heading', { name: '학교 랭킹' })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.getByRole('combobox', { name: /학교/ }).selectOption('sample-seoul');
  await page.getByLabel('닉네임', { exact: true }).fill(nickname);
  await page.getByLabel('비밀 PIN 4자리').fill('2468');
  await page.getByRole('button', { name: '바로 시작' }).click();
  await expect(page.getByRole('heading', { name: '1번째 세계일주 완료!' })).toBeVisible();
  await page.getByRole('button', { name: '다음 세계일주 바로 시작' }).click();
  await expect(page.getByRole('heading', { name: '나의 답', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '세계지도', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2번째 세계일주' })).toBeVisible();
  await page.screenshot({ path: `../../work/${info.project.name}-map.png`, fullPage: true });
});
