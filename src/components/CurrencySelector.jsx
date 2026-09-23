import { CURRENCIES, useCurrency } from '../context/CurrencyContext.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { updateProfile } from '../api/account.js';

export default function CurrencySelector({ className = '' }) {
  const { currency, setCurrency } = useCurrency();
  const { isAuthenticated, token, updateUser } = useCustomerAuth();

  function handleChange(code) {
    setCurrency(code);
    // Persist as the account's preference (FR-010) so it's also what orders
    // get placed in and what the next session loads by default.
    if (isAuthenticated) {
      updateProfile(token, { preferred_currency: code })
        .then(updateUser)
        .catch(() => {}); // the local selection still applies for this session either way
    }
  }

  return (
    <select className={`currency-select ${className}`} value={currency} onChange={(e) => handleChange(e.target.value)} aria-label="Currency">
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code}
        </option>
      ))}
    </select>
  );
}
