import { createRoot } from 'react-dom/client'
import { TranslationProvider, useTranslation } from '../../src/i18n'
import { useSettingsStore } from '../../src/store/settingsStore'
import BudgetDashboard from '../../src/components/Budget/BudgetDashboard'
import { formatMoney } from '../../src/utils/formatters'
import type { BudgetItem } from '../../src/types'
import '../../src/index.css'
const items: BudgetItem[] = [
  { id: 1, trip_id: 1, name: 'Hotel', category: 'accommodation', total_price: 900, expense_date: '2026-10-01', payers: [{user_id: 1, amount: 900}] },
  { id: 2, trip_id: 1, name: 'Meals', category: 'food', total_price: 300, expense_date: '2026-10-02', payers: [{user_id: 2, amount: 300}] },
  { id: 3, trip_id: 1, name: 'Train', category: 'transport', total_price: 400, expense_date: '2026-10-03', payers: [] },
  { id: 4, trip_id: 1, name: 'Refund', category: 'food', total_price: -50, expense_date: '2026-10-02', payers: [{user_id: 2, amount: -50}] },
]
function Preview() {
  const { locale } = useTranslation()
  return <><aside className="border-b border-edge p-4 text-content bg-surface-card"><strong>组件样例验证 / Component fixture — 非官方评分、非真实行程</strong><div className="mt-2 flex gap-5"><button onClick={() => useSettingsStore.setState(s => ({settings:{...s.settings,language:'zh'}}))}>中文</button><button onClick={() => useSettingsStore.setState(s => ({settings:{...s.settings,language:'en'}}))}>English</button></div></aside><BudgetDashboard items={items} booked={n=>n} fmt={n=>formatMoney(n,'CNY',locale)} members={<div><p>样例成员 A: ¥575.00</p><p>样例成员 B: ¥575.00</p><p className="mt-4">样例结算建议 / Sample: B → A · ¥325.00</p></div>} /></>
}
useSettingsStore.setState(s=>({settings:{...s.settings,language:'zh'}}))
createRoot(document.getElementById('root')!).render(<TranslationProvider><Preview /></TranslationProvider>)
