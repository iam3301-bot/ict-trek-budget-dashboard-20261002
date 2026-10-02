import type { BudgetItem } from '../../types';
import { catMeta } from './costsCategories';

/** Use the same frozen exchange rates as Costs; transfers are not new spending. */
export function deriveDashboard(items: BudgetItem[], booked: (amount: number, item: BudgetItem) => number) {
  let recorded = 0,
    paid = 0,
    refunds = 0;
  const categories = new Map<string, { key: string; labelKey: string; spending: number; refunds: number }>();
  const days = new Map<string, number>();
  for (const item of items) {
    recorded += booked(item.total_price || 0, item);
    const amount = booked(
      (item.payers || []).reduce((sum, payer) => sum + payer.amount, 0),
      item
    );
    paid += amount;
    if (amount === 0) continue;
    const meta = catMeta(item.category);
    const category = categories.get(meta.key) || { key: meta.key, labelKey: meta.labelKey, spending: 0, refunds: 0 };
    category.spending += Math.max(0, amount);
    category.refunds += Math.min(0, amount);
    refunds += Math.min(0, amount);
    categories.set(meta.key, category);
    // A missing date stays visible as undated, never silently assigned to today.
    const date = item.expense_date || '';
    days.set(date, (days.get(date) || 0) + amount);
  }
  const spending = [...categories.values()].reduce((sum, c) => sum + c.spending, 0);
  return {
    recorded,
    paid,
    unpaid: recorded - paid,
    refunds,
    categories: [...categories.values()]
      .sort((a, b) => b.spending - a.spending)
      .map((c) => ({ ...c, share: spending > 0 ? c.spending / spending : 0 })),
    days: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
  };
}
