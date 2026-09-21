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
    users: {
      list: '/bff/users',
      byId: (id: string) => `/bff/users/${id}`,
    },
    groups: {
      list: '/bff/groups',
      byId: (id: string) => `/bff/groups/${id}`,
      members: (id: string) => `/bff/groups/${id}/members`,
      memberById: (id: string, memberType: 'user' | 'group', memberId: string) =>
        `/bff/groups/${id}/members/${memberType}/${memberId}`,
    },
    permissionsMe: '/bff/permissions/me',
  },
} as const;
