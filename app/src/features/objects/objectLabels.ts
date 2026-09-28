import { ObjectStatus } from '../../entities/object/types';

export const objectStatusLabels: Record<ObjectStatus, string> = {
  normal: 'норма',
  watch: 'наблюдение',
  alarm: 'тревога',
  offline: 'офлайн',
};

export const objectStatusOrder: ObjectStatus[] = ['normal', 'watch', 'alarm', 'offline'];

// Уровни иерархии (доменный документ §1.1, слои карты §1.4): у объекта
// уровень на единицу ниже родителя, у корня — 1.
export const objectLevelLabels: Record<number, string> = {
  1: 'район',
  2: 'коллектор',
  3: 'рабочий объект',
};

export const ROOT_OBJECT_LEVEL = 1;

export function childObjectLevel(parent: { level: number } | undefined): number {
  return parent ? parent.level + 1 : ROOT_OBJECT_LEVEL;
}

export function objectLevelLabel(level: number): string {
  return objectLevelLabels[level] ? `${level} — ${objectLevelLabels[level]}` : String(level);
}

// Виды объектов (kind) — открытый список («controlHouse, guardObject и т. д.»):
// варианты — те, что уже есть у объектов, плюс своё значение.
export function objectKindOptions(objects: { kind: string }[]): { value: string; label: string }[] {
  return Array.from(new Set(objects.map(object => object.kind).filter(Boolean)))
    .sort()
    .map(kind => ({ value: kind, label: kind }));
}
