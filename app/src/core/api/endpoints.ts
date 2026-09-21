export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
    register: '/auth/register',
  },

  // BFF sits behind the same nginx/domain under /api/bff/* — see
  // docs/FRONTEND_INTEGRATION.md §1. apiClient's baseURL already covers /api.
  bff: {
    users: '/bff/users',
    groups: '/bff/groups',
    permissionsMe: '/bff/permissions/me',
  },
} as const;
