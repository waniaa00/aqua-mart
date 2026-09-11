import { CURRENCIES, useCurrency } from '../context/CurrencyContext.jsx';

export default function CurrencySelector({ className = '' }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      className={`currency-select ${className}`}
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      aria-label="Currency"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code}
        </option>
      ))}
    </select>
  );
}
