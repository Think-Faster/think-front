export interface Brigade {
  id: string;
  name: string;
}

// id не помечен в доке как внешний (в отличие от объектов/датчиков) —
// значит генерируется бэкендом по общему правилу, в теле только name.
export interface CreateBrigadeRequest {
  name: string;
}
