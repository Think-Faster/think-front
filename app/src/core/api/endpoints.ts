export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    register: '/auth/users/create',
    // Нет ручки логаута — выход обрабатывается на фронте, см. authStore.logout().
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
    resources: '/bff/resources',
    permissions: {
      me: '/bff/permissions/me',
      grants: '/bff/permissions/grants',
      grantById: (id: string) => `/bff/permissions/grants/${id}`,
    },
    objects: {
      list: '/bff/objects',
      byId: (id: number) => `/bff/objects/${id}`,
    },
    sensors: {
      list: '/bff/sensors',
      byId: (id: number) => `/bff/sensors/${id}`,
    },
    predictions: {
      list: '/bff/predictions',
      byId: (id: string) => `/bff/predictions/${id}`,
      decisions: (id: string) => `/bff/predictions/${id}/decisions`,
    },
  },
} as const;
