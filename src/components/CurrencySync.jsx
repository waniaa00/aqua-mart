import { useEffect } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

// FR-010: a logged-in shopper's saved currency preference applies by
// default. Adopts it once the profile loads (login, or a page refresh with
// a stored session) rather than whatever was last selected locally.
export default function CurrencySync() {
  const { user } = useCustomerAuth();
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    if (user?.preferred_currency && user.preferred_currency !== currency) {
      setCurrency(user.preferred_currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.preferred_currency]);

  return null;
}
