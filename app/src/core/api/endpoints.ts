export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    register: '/auth/create',
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
      layers: (id: number) => `/bff/objects/${id}/layers`,
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
    // Тревоги по факту (FactAlert) — срабатывания по показаниям датчиков, а
    // не прогноз модели; источник окна «Журнал данных».
    factAlerts: '/bff/fact-alerts',
    tasks: {
      list: '/bff/tasks',
      byId: (id: string) => `/bff/tasks/${id}`,
      take: (id: string) => `/bff/tasks/${id}/take`,
      predictions: (id: string) => `/bff/tasks/${id}/predictions`,
      predictionById: (id: string, predictionId: string) => `/bff/tasks/${id}/predictions/${predictionId}`,
      assignments: (id: string) => `/bff/tasks/${id}/assignments`,
      reports: (id: string) => `/bff/tasks/${id}/reports`,
      returns: (id: string) => `/bff/tasks/${id}/returns`,
    },
    incidents: {
      list: '/bff/incidents',
      byId: (id: string) => `/bff/incidents/${id}`,
      confirm: (id: string) => `/bff/incidents/${id}/confirm`,
    },
    userSchedule: {
      list: (userId: string) => `/bff/users/${userId}/schedule`,
      byId: (userId: string, entryId: string) => `/bff/users/${userId}/schedule/${entryId}`,
    },
    userAssignedObjects: {
      list: (userId: string) => `/bff/users/${userId}/assigned-objects`,
      byId: (userId: string, objectId: number) => `/bff/users/${userId}/assigned-objects/${objectId}`,
    },
    userEngineerProfile: (userId: string) => `/bff/users/${userId}/engineer-profile`,
    presence: '/bff/presence',
    brigades: '/bff/brigades',
    modelVersions: {
      list: '/bff/model-versions',
      activate: (id: string) => `/bff/model-versions/${id}/activate`,
    },
    coefficients: '/bff/coefficients',
    retrainJobs: '/bff/retrain-jobs',
    ignoredRanges: {
      list: '/bff/ignored-ranges',
      byId: (id: string) => `/bff/ignored-ranges/${id}`,
    },
    // График плановых работ (ППР, ТО): окна, в которые модель глушит тревоги.
    workSchedule: {
      list: '/bff/work-schedule',
      byId: (workId: number) => `/bff/work-schedule/${workId}`,
    },
    notifications: {
      sendEmail: '/bff/notifications/email',
    },
  },
} as const;
