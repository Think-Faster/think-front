import { createContext, useContext } from 'react';

// Окно на холсте — экземпляр записи реестра (доменный документ §7.2: window_id
// и window_type). Первый экземпляр носит id записи, поэтому раскладки,
// сохранённые до копий, остаются валидными; следующие — `<id>:<n>`.
const INSTANCE_SEPARATOR = ':';

// Сколько окон одного типа можно держать открытыми разом (с первым).
export const MAX_WINDOW_INSTANCES = 4;

export function definitionIdOf(windowId: string): string {
  const index = windowId.indexOf(INSTANCE_SEPARATOR);
  return index < 0 ? windowId : windowId.slice(0, index);
}

export function instanceNumber(windowId: string): number {
  const index = windowId.indexOf(INSTANCE_SEPARATOR);
  return index < 0 ? 1 : Number(windowId.slice(index + 1)) || 1;
}

export function isPrimaryInstance(windowId: string): boolean {
  return instanceNumber(windowId) === 1;
}

export function instanceId(definitionId: string, number: number): string {
  return number <= 1 ? definitionId : `${definitionId}${INSTANCE_SEPARATOR}${number}`;
}

// Первый свободный номер копии; null — открыто уже MAX_WINDOW_INSTANCES окон.
export function nextInstanceId(definitionId: string, openIds: string[]): string | null {
  const taken = openIds.filter(id => definitionIdOf(id) === definitionId).length;
  if (taken >= MAX_WINDOW_INSTANCES) {
    return null;
  }
  for (let number = 2; number <= MAX_WINDOW_INSTANCES; number += 1) {
    const id = instanceId(definitionId, number);
    if (!openIds.includes(id)) {
      return id;
    }
  }
  return null;
}

// Какой экземпляр рендерится: содержимое окна узнаёт свой id и маршрут
// карточки из записи реестра (route), не импортируя реестр.
export interface WindowInstance {
  windowId: string;
  route?: string;
}

export const WindowInstanceContext = createContext<WindowInstance | null>(null);

export function useWindowInstance(): WindowInstance | null {
  return useContext(WindowInstanceContext);
}
