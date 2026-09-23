import { createContext, useContext, useMemo, useState } from 'react';

// Per 002-frontend-integration/research.md §7: the backend is authoritative
// for currency conversion (every priced response already carries a
// converted `display_price`/`display_currency`) — this context holds only
// the *selected* currency and formats what the backend returns. It does not
// fetch exchange rates or convert anything itself.
//
// format() also accepts a plain number for the few pages that still haven't
// migrated off local mock data (Home's illustrative CTA numbers, the mock
// services list) — those render as plain USD, unconverted, since there's no
// backend response to draw a real conversion from.

const CURRENCY_STORAGE_KEY = 'aqua-mart-currency-v1';

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', locale: 'en-US' },
  { code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  { code: 'PKR', name: 'Pakistani Rupee', locale: 'en-PK' },
];

const CurrencyContext = createContext(null);

function loadStoredCurrency() {
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return CURRENCIES.some((c) => c.code === raw) ? raw : 'USD';
  } catch {
    return 'USD';
  }
}

function formatAmount(amount, currencyCode) {
  const meta = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];
  return new Intl.NumberFormat(meta.locale, { style: 'currency', currency: meta.code }).format(Number(amount));
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(loadStoredCurrency);

  function setCurrency(code) {
    setCurrencyState(code);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    } catch {
      // ignore — the picker still works for the rest of this session
    }
  }

  const api = useMemo(
    () => ({
      currency,
      setCurrency,
      // Accepts either the backend's Money shape ({display_price,
      // display_currency, ...}) or a plain number (mock-data fallback).
      format: (value) => {
        if (value && typeof value === 'object' && 'display_price' in value) {
          return formatAmount(value.display_price, value.display_currency);
        }
        return formatAmount(value, 'USD');
      },
    }),
    [currency]
  );

  return <CurrencyContext.Provider value={api}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
