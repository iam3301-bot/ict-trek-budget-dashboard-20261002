import { useMemo, type ReactNode } from 'react';
import { useTranslation } from '../../i18n';
import type { BudgetItem } from '../../types';
import { deriveDashboard } from './BudgetDashboard.helpers';

interface Props {
  items: BudgetItem[];
  booked: (amount: number, item: BudgetItem) => number;
  fmt: (value: number) => string;
  members: ReactNode;
}

/** Presentation only: the ledger, FX and settlement remain owned by Costs. */
export default function BudgetDashboard({ items, booked, fmt, members }: Props) {
  const { t, locale } = useTranslation();
  const data = useMemo(() => deriveDashboard(items, booked), [items, booked]);
  const card = 'rounded-2xl border border-edge bg-surface-card p-5 min-w-0';
  const scale = Math.max(1, Math.abs(data.recorded), Math.abs(data.paid));
  const dayScale = Math.max(1, ...data.days.map((d) => Math.abs(d.amount)));
  const percentage = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(n);
  return (
    <div className="p-4 text-content md:p-8">
      <h1 className="mb-2 text-2xl font-bold">{t('budgetDashboard.title')}</h1>
      <p className="mb-6 text-content-muted">{t('budgetDashboard.note')}</p>
      {items.length === 0 && (
        <p role="status" className="mb-6 text-content-muted">
          {t('costs.emptyText')}
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={card} aria-label={t('budgetDashboard.comparison')}>
          <h2 className="mb-5 font-semibold">{t('budgetDashboard.comparison')}</h2>
          {(
            [
              [t('budgetDashboard.recorded'), data.recorded],
              [t('budgetDashboard.paid'), data.paid],
            ] as const
          ).map(([label, amount]) => (
            <div key={label} className="mb-4">
              <div className="mb-2 flex justify-between gap-3">
                <span>{label}</span>
                <strong className="tabular-nums">{fmt(amount)}</strong>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full bg-content-muted"
                  style={{ width: `${(Math.abs(amount) / scale) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-content-muted">
            {t('budgetDashboard.unpaid')}: <strong>{fmt(data.unpaid)}</strong>
          </p>
        </section>
        <section className={card} aria-label={t('budget.byCategory')}>
          <h2 className="mb-2 font-semibold">{t('budget.byCategory')}</h2>
          <p className="mb-4 text-sm text-content-muted">{t('budgetDashboard.shareBasis')}</p>
          {data.categories.length === 0 && (
            <p>
              {t('budgetDashboard.paid')}: {fmt(0)}
            </p>
          )}
          {data.categories.map((c) => (
            <div key={c.key} className="mb-4">
              <div className="flex justify-between gap-3">
                <span>{t(c.labelKey)}</span>
                <span className="tabular-nums">
                  {fmt(c.spending)} · {percentage(c.share)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-secondary">
                <div className="h-full bg-content-muted" style={{ width: `${c.share * 100}%` }} />
              </div>
              {c.refunds !== 0 && (
                <p className="text-sm text-content-muted">
                  {t('budgetDashboard.refunds')}: {fmt(c.refunds)}
                </p>
              )}
            </div>
          ))}
        </section>
        <section className={card} aria-label={t('budgetDashboard.trend')}>
          <h2 className="mb-4 font-semibold">{t('budgetDashboard.trend')}</h2>
          {data.days.length === 0 ? (
            <p>
              {t('budgetDashboard.paid')}: {fmt(0)}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-start">{t('costs.day')}</th>
                    <th className="text-end">{t('budgetDashboard.paid')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.date}>
                      <td className="py-2 pe-3">
                        {d.date
                          ? new Date(d.date + 'T00:00:00Z').toLocaleDateString(locale, { timeZone: 'UTC' })
                          : t('costs.noDate')}
                      </td>
                      <td className="py-2 text-end tabular-nums">
                        <span>{fmt(d.amount)}</span>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-secondary">
                          <div
                            className="h-full bg-content-muted"
                            style={{ width: `${(Math.abs(d.amount) / dayScale) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className={card} aria-label={t('budget.settlement')}>
          <h2 className="mb-4 font-semibold">
            {t('budget.perPerson')} · {t('budget.settlement')}
          </h2>
          {members}
        </section>
      </div>
    </div>
  );
}
