// Стирает читаемые из JS куки этого сайта. Куки сессии HttpOnly JS не видит —
// их снимает tf-auth на POST /auth/logout (см. authStore.logout()); здесь —
// только то, что браузер отдаёт скриптам.
export function clearAllCookies() {
  const names = document.cookie
    .split(';')
    .map(pair => pair.split('=')[0].trim())
    .filter(Boolean);

  for (const name of names) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}
