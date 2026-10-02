import { describe, expect, it } from 'vitest';
import { buildBudgetItem } from '../../../tests/helpers/factories';
import { deriveDashboard } from './BudgetDashboard.helpers';

describe('budget dashboard accounting', () => {
  it('keeps unpaid entries in recorded budget but excludes them from actual spending', () => {
    const items = [
      buildBudgetItem({
        total_price: 100,
        category: 'food',
        expense_date: '2026-10-02',
        payers: [
          { user_id: 1, amount: 60 },
          { user_id: 2, amount: 40 },
        ],
      }),
      buildBudgetItem({ total_price: 50, category: 'hotel', payers: [] }),
    ];
    const data = deriveDashboard(items, (amount) => amount);
    expect(data.recorded).toBe(150);
    expect(data.paid).toBe(100);
    expect(data.unpaid).toBe(50);
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].share).toBe(1);
  });
  it('converts each row at its booked rate and separates refunds from positive category shares', () => {
    const data = deriveDashboard(
      [
        buildBudgetItem({
          total_price: 10,
          category: 'restaurant',
          exchange_rate: 2,
          expense_date: '2026-10-02',
          payers: [{ user_id: 1, amount: 10 }],
        }),
        buildBudgetItem({
          total_price: 30,
          category: 'transport',
          exchange_rate: 1,
          expense_date: '2026-10-01',
          payers: [{ user_id: 2, amount: 30 }],
        }),
        buildBudgetItem({
          total_price: -10,
          category: 'food',
          exchange_rate: 1,
          expense_date: '2026-10-02',
          payers: [{ user_id: 1, amount: -10 }],
        }),
      ],
      (amount, item) => amount / (item.exchange_rate || 1)
    );
    expect(data.paid).toBe(25);
    expect(data.refunds).toBe(-10);
    expect(data.categories.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1);
    expect(data.categories.find((c) => c.key === 'food')).toMatchObject({ spending: 5, refunds: -10 });
    expect(data.days).toEqual([
      { date: '2026-10-01', amount: 30 },
      { date: '2026-10-02', amount: -5 },
    ]);
  });
  it('preserves undated payments and renders refund-only and empty data without invalid percentages', () => {
    const data = deriveDashboard(
      [buildBudgetItem({ total_price: -4, expense_date: null, payers: [{ user_id: 1, amount: -4 }] })],
      (amount) => amount
    );
    expect(data.days).toEqual([{ date: '', amount: -4 }]);
    expect(data.categories[0].share).toBe(0);
    expect(deriveDashboard([], (amount) => amount)).toMatchObject({
      recorded: 0,
      paid: 0,
      unpaid: 0,
      categories: [],
      days: [],
    });
  });
});
