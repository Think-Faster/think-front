import { ObjectStatus } from '../../entities/object/types';

export const objectStatusLabels: Record<ObjectStatus, string> = {
  normal: 'норма',
  watch: 'наблюдение',
  alarm: 'тревога',
  offline: 'офлайн',
};

export const objectStatusOrder: ObjectStatus[] = ['normal', 'watch', 'alarm', 'offline'];
