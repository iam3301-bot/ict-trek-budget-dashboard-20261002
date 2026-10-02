import { delay, http, HttpResponse } from 'msw';
import { buildBudgetItem, buildTrip, buildUser } from '../../../tests/helpers/factories';
import { server } from '../../../tests/helpers/msw/server';
import { act, render, screen, waitFor, within } from '../../../tests/helpers/render';
import { resetAllStores, seedStore } from '../../../tests/helpers/store';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTripStore } from '../../store/tripStore';
import BudgetDashboard from './BudgetDashboard';
import CostsPanel from './CostsPanel';

beforeEach(() => {
  resetAllStores();
  seedStore(useAuthStore, { user: buildUser(), isAuthenticated: true });
  seedStore(useTripStore, { trip: buildTrip({ id: 1, currency: 'EUR' }) });
});

it('refreshes both dashboard spending and settlement after an edit with the same item count', async () => {
  let amount = 30;
  let reads = 0;
  const item = () =>
    buildBudgetItem({
      id: 1,
      total_price: amount,
      category: 'food',
      expense_date: '2026-10-02',
      payers: [{ user_id: 1, amount }],
    });
  server.use(
    http.get('/api/trips/1/budget', () => HttpResponse.json({ items: [item()] })),
    http.get('/api/trips/1/budget/settlement', () => {
      reads++;
      return HttpResponse.json({
        balances: [],
        flows: [{ from: { user_id: 2, username: 'bob' }, to: { user_id: 1, username: 'alice' }, amount: amount / 2 }],
        settlements: [],
        finalBudgets: [],
      });
    })
  );
  render(
    <CostsPanel
      tripId={1}
      tripMembers={[
        { id: 1, username: 'alice' },
        { id: 2, username: 'bob' },
      ]}
      dashboardOnly
    />
  );
  const comparison = await screen.findByRole('region', { name: 'Budget and actual payments' });
  await waitFor(() => expect(within(comparison).getAllByText(/30/).length).toBeGreaterThan(0));
  const initialReads = reads;
  amount = 80;
  await act(async () => {
    await useTripStore.getState().loadBudgetItems(1);
  });
  await waitFor(() => expect(within(comparison).getAllByText(/80/).length).toBeGreaterThan(0));
  await waitFor(() => expect(reads).toBeGreaterThan(initialReads));
  const settlement = screen.getByRole('region', { name: 'Settlement' });
  await waitFor(() => expect(within(settlement).getByText(/40/)).toBeInTheDocument());
});

it('shows a failed settlement read as an error, never as everyone settled', async () => {
  server.use(
    http.get('/api/trips/1/budget', () => HttpResponse.json({ items: [] })),
    http.get('/api/trips/1/budget/settlement', () => new HttpResponse(null, { status: 500 }))
  );
  render(<CostsPanel tripId={1} dashboardOnly />);
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(screen.queryByText('Everyone is square')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Settlement' })).toHaveTextContent(/error/i);
});

it('does not let a delayed old settlement overwrite the newest edited expense', async () => {
  let amount = 30;
  let oldReadStarted = false;
  let oldReadFinished = false;
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  const item = () => buildBudgetItem({ id: 1, total_price: amount, payers: [{ user_id: 1, amount }] });
  server.use(
    http.get('/api/trips/1/budget', () => HttpResponse.json({ items: [item()] })),
    http.get('/api/trips/1/budget/settlement', async () => {
      const captured = amount;
      if (captured === 80) {
        oldReadStarted = true;
        await oldResponse;
        oldReadFinished = true;
      }
      return HttpResponse.json({
        balances: [],
        settlements: [],
        finalBudgets: [],
        flows: [{ from: { user_id: 2, username: 'bob' }, to: { user_id: 1, username: 'alice' }, amount: captured / 2 }],
      });
    })
  );
  render(
    <CostsPanel
      tripId={1}
      dashboardOnly
      tripMembers={[
        { id: 1, username: 'alice' },
        { id: 2, username: 'bob' },
      ]}
    />
  );
  const settlement = screen.getByRole('region', { name: 'Settlement' });
  await waitFor(() => expect(within(settlement).getByText(/15/)).toBeInTheDocument());
  amount = 80;
  await act(async () => {
    await useTripStore.getState().loadBudgetItems(1);
  });
  await waitFor(() => expect(oldReadStarted).toBe(true));
  amount = 120;
  await act(async () => {
    await useTripStore.getState().loadBudgetItems(1);
  });
  await waitFor(() => expect(within(settlement).getByText(/60/)).toBeInTheDocument());
  releaseOld();
  await waitFor(() => expect(oldReadFinished).toBe(true));
  // Let the delayed network response reach the client before checking its effect.
  await act(async () => {
    await delay(60);
  });
  expect(within(settlement).getByText(/60/)).toBeInTheDocument();
  expect(within(settlement).queryByText(/40/)).not.toBeInTheDocument();
});

it('renders all four sections in Chinese without falling back to raw translation keys', async () => {
  useSettingsStore.setState((s) => ({ settings: { ...s.settings, language: 'zh' } }));
  const { container } = render(
    <BudgetDashboard items={[]} booked={(amount) => amount} fmt={String} members={<p>成员样例</p>} />
  );
  await screen.findByRole('heading', { name: '预算看板' });
  expect(screen.getAllByRole('region')).toHaveLength(4);
  expect(screen.getByRole('region', { name: '预算与实际付款' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '每日支出趋势' })).toBeInTheDocument();
  expect(container.textContent).not.toContain('budgetDashboard.');
});
