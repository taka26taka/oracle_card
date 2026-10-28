import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { router, trackEvent } = vi.hoisted(() => { process.env.NEXT_PUBLIC_CHECKOUT_URL = 'https://checkout.example.test/buy'; return { router: { push: vi.fn(), replace: vi.fn() }, trackEvent: vi.fn() }; });
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../lib/analytics/trackEvent', () => ({ trackEvent }));
import Home from '../app/page.js';
import DrawPage from '../app/draw/page.js';
import ResultPageClient from '../components/result/ResultPageClient.jsx';
import DeepPageClient from '../components/deep/DeepPageClient.jsx';
import PremiumIntroPageClient from '../components/premium/PremiumIntroPageClient.jsx';
import PremiumReadingPageClient from '../components/premium/PremiumReadingPageClient.jsx';
import PremiumCompletePageClient from '../components/premium/PremiumCompletePageClient.jsx';
import { ORACLE_CARDS } from '../lib/cards';

const result = { card: ORACLE_CARDS[0], message: 'テスト結果です。', title: '今夜の恋', theme: 'mutual', diagnosisType: 'mutual', actionTip: '短く連絡する', afterglowLine: '間合いを整える', drawnAt: '2026-10-28T00:00:00Z' };
const save = (extra = {}) => localStorage.setItem('oracle_session_v1', JSON.stringify({ sessionId: 's', diagnosisType: 'mutual', lastResult: result, ...extra }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ message: '生成された結果です。' }) })));
  window.history.replaceState({}, '', '/');
  performance.mark ??= vi.fn();
  performance.measure ??= vi.fn();
  performance.getEntriesByName ??= () => [];
  performance.clearMeasures ??= vi.fn();
  performance.clearMarks ??= vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test('top requires accessible theme selection before navigation', async () => {
  render(<Home />);
  const button = screen.getByRole('button', { name: '1枚引く' });
  expect(button.disabled).toBe(true);
  await userEvent.click(screen.getByRole('radio', { name: '片思い' }));
  expect(button.disabled).toBe(false);
  await userEvent.click(button);
  expect(router.push).toHaveBeenCalledWith('/draw?diagnosisType=unrequited');
  expect(trackEvent).toHaveBeenCalledWith('diagnosis_completed', expect.objectContaining({ diagnosisType: 'unrequited' }));
});
test('draw guards rapid duplicate clicks, saves result, and navigates', async () => {
  save();
  vi.useFakeTimers();
  render(<DrawPage />);
  const button = screen.getByRole('button', { name: '1枚引く' });
  fireEvent.click(button); fireEvent.click(button);
  await vi.runAllTimersAsync();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/result');
  expect(JSON.parse(localStorage.getItem('oracle_session_v1')).lastResult.card.id).toBeDefined();
});
test('result displays saved content and purchase entry', () => {
  save();
  render(<ResultPageClient />);
  expect(screen.getByText('今夜の恋')).toBeTruthy();
  expect(screen.getByText('テスト結果です。')).toBeTruthy();
  const premium = screen.getByRole('button', { name: /3枚/ });
  fireEvent.click(premium);
  expect(router.push).toHaveBeenCalledWith('/premium/intro');
});
test('deep limits successful operations to two and prevents duplicate submissions', async () => {
  save({ deepCount: 1 });
  render(<DeepPageClient />);
  const button = screen.getByRole('button', { name: '相手の気持ち' });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(screen.getByText('深掘り回数: 2/2')).toBeTruthy());
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(true);
});
test('unmount aborts an in-flight deep request', () => {
  save();
  vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
  const view = render(<DeepPageClient />);
  fireEvent.click(screen.getByRole('button', { name: '相手の気持ち' }));
  const signal = vi.mocked(fetch).mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
});
test('premium displays network errors without exposing internals', async () => {
  save({ premiumAccess: { attemptId: 'a' } });
  vi.mocked(fetch).mockRejectedValue(new Error('private-upstream-error'));
  render(<PremiumReadingPageClient />);
  expect((await screen.findByRole('alert')).textContent).toContain('読み込みに失敗');
  expect(document.body.textContent).not.toContain('private-upstream-error');
});
test('completion must not claim payment before verification; retry permits verified access', async () => {
  save({ checkoutAttempt: { attemptId: 'a' } });
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 400 }).mockResolvedValueOnce({ ok: true, status: 200 });
  render(<PremiumCompletePageClient />);
  const reading = screen.getByRole('button', { name: '3枚リーディングを見る' });
  expect(reading.disabled).toBe(true);
  const retry = await screen.findByRole('button', { name: '購入状況を再確認する' });
  expect(document.body.textContent).not.toContain('ご購入を確認しました');
  fireEvent.click(retry);
  await waitFor(() => expect(reading.disabled).toBe(false));
  expect(JSON.parse(localStorage.getItem('oracle_session_v1')).premiumAccess.attemptId).toBe('a');
});

test('checkout preserves attempt and session identifiers in external URL', () => {
  save();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<PremiumIntroPageClient />);
  fireEvent.click(screen.getByRole('button', { name: 'noteで購入して続きを読む' }));
  const url = new URL(open.mock.calls[0][0]);
  const state = JSON.parse(localStorage.getItem('oracle_session_v1'));
  expect(url.origin).toBe('https://checkout.example.test');
  expect(url.searchParams.get('attemptId')).toBe(state.checkoutAttempt.attemptId);
  expect(url.searchParams.get('sessionId')).toBe('s');
  open.mockRestore();
});
