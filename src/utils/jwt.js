// Client-side JWT expiry check only — never trust the payload for anything
// authorization-related, the backend re-validates and re-checks role on
// every request. This just decides whether the UI shows a login form.
export function isTokenExpired(token) {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return !exp || Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}
