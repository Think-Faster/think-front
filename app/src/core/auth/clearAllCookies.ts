// Best-effort client-side wipe of every readable cookie for this origin.
//
// A cookie marked HttpOnly (which is how the auth cookie is described in
// docs/FRONTEND_INTEGRATION.md §2) is invisible to document.cookie by
// design — JS cannot read OR clear it, with or without this function. In
// that case the browser still holds a valid session cookie after logout,
// and it will silently re-authenticate the user on the next request unless
// the backend grows a real logout endpoint (or the cookie expires on its
// own). This function only clears what the browser actually exposes to JS;
// combined with resetting app state and redirecting to /login, it's the
// best a frontend-only logout can do.
export function clearAllCookies() {
  const names = document.cookie
    .split(';')
    .map(pair => pair.split('=')[0].trim())
    .filter(Boolean);

  for (const name of names) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}
