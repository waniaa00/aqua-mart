import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Every price in the data files (products.js, services.js) is a plain USD
// number. This context converts and formats them into the shopper's chosen
// currency, fetching USD -> {GBP, PKR} rates from a free, key-less exchange
// rate API and caching them in localStorage for 12h - this is a front-end
// prototype with no backend to proxy the request through, so the browser
// calls the rate API directly and falls back to fixed approximate rates if
// that request fails or the shopper is offline.

const CURRENCY_STORAGE_KEY = 'aqua-mart-currency-v1';
const RATES_CACHE_KEY = 'aqua-mart-fx-rates-v1';
const RATES_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const RATES_API = 'https://open.er-api.com/v6/latest/USD';

const FALLBACK_RATES = { USD: 1, GBP: 0.79, PKR: 278 };

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

function loadCachedRates() {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.rates && parsed?.fetchedAt ? parsed : null;
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(loadStoredCurrency);
  const [rates, setRates] = useState(() => loadCachedRates()?.rates ?? FALLBACK_RATES);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // ignore - the picker still works for the rest of this session
    }
  }, [currency]);

  useEffect(() => {
    const cached = loadCachedRates();
    if (cached && Date.now() - cached.fetchedAt < RATES_MAX_AGE_MS) return;

    let cancelled = false;
    fetch(RATES_API)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((data) => {
        if (cancelled || data.result !== 'success' || !data.rates?.GBP || !data.rates?.PKR) {
          throw new Error('unexpected exchange-rate response');
        }
        const next = { USD: 1, GBP: data.rates.GBP, PKR: data.rates.PKR };
        setRates(next);
        try {
          localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates: next, fetchedAt: Date.now() }));
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // network/API failure - keep whatever rates are already in state
        // (cached or the fixed fallback) rather than breaking price display
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const api = useMemo(() => {
    const meta = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
    const rate = rates[currency] ?? 1;
    const formatter = new Intl.NumberFormat(meta.locale, { style: 'currency', currency: meta.code });

    return {
      currency,
      setCurrency,
      convert: (usdAmount) => usdAmount * rate,
      format: (usdAmount) => formatter.format(usdAmount * rate),
    };
  }, [currency, rates]);

  return <CurrencyContext.Provider value={api}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
