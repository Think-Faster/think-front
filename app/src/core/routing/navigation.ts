import { NavigateFunction } from 'react-router-dom';

let navigator: NavigateFunction | null = null;
let redirecting = false;

export function setNavigator(fn: NavigateFunction) {
  navigator = fn;
}

export function redirectToLogin(fromPath?: string) {
  if (!navigator || redirecting || window.location.pathname === '/login') {
    return;
  }

  redirecting = true;
  navigator('/login', {
    replace: true,
    state: fromPath ? { from: fromPath } : undefined,
  });

  setTimeout(() => {
    redirecting = false;
  }, 0);
}
