import { PagedResult } from '../../core/api/types';
import { CreateObjectRequest, MonitoredObject, UpdateObjectRequest } from './types';

// TEMP TEST STUB — reverted after manual verification.
let store: MonitoredObject[] = [
  { id: 142, level: 2, parentId: null, kind: 'collector', name: 'К-142', address: 'Южный узел', geometryGeoJson: null, status: 'alarm', statusAt: new Date().toISOString() },
  { id: 90, level: 2, parentId: null, kind: 'collector', name: 'К-90', address: null, geometryGeoJson: null, status: 'normal', statusAt: new Date().toISOString() },
];

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

export const objectRepository = {
  async getList(): Promise<PagedResult<MonitoredObject>> {
    return delay({ items: store, total: store.length, page: 1, pageSize: 50 });
  },

  async create(request: CreateObjectRequest): Promise<MonitoredObject> {
    const object: MonitoredObject = {
      ...request,
      parentId: request.parentId ?? null,
      address: request.address ?? null,
      geometryGeoJson: request.geometryGeoJson ?? null,
      status: 'normal',
      statusAt: new Date().toISOString(),
    };
    store = [...store, object];
    return delay(object);
  },

  async update(id: number, request: UpdateObjectRequest): Promise<MonitoredObject> {
    store = store.map(o => (o.id === id ? { ...o, ...request } : o));
    return delay(store.find(o => o.id === id)!);
  },
};
