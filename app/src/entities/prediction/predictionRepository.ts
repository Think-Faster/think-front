import { predictions as seed } from './mockData';
import { Prediction, PredictionStatus, Risk } from './types';

export interface PredictionFilter {
  risk?: Risk | 'all';
  status?: PredictionStatus | 'all';
}

// In-memory store standing in for the future BFF-backed endpoint. Behind
// this same get/getList/update contract, a real ApiClient call can replace
// the body without any caller changing.
let store: Prediction[] = seed.map(prediction => ({ ...prediction }));

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

export const predictionRepository = {
  async getList(filter?: PredictionFilter): Promise<Prediction[]> {
    const list = store.filter(
      prediction =>
        (!filter?.risk || filter.risk === 'all' || prediction.risk === filter.risk) &&
        (!filter?.status || filter.status === 'all' || prediction.status === filter.status)
    );

    return delay(list);
  },

  async get(id: string): Promise<Prediction | undefined> {
    return delay(store.find(prediction => prediction.id === id));
  },

  async update(id: string, data: Partial<Prediction>): Promise<Prediction> {
    store = store.map(prediction =>
      prediction.id === id ? { ...prediction, ...data } : prediction
    );

    return delay(store.find(prediction => prediction.id === id)!);
  },
};
