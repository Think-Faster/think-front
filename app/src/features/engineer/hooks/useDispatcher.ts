import { useEffect, useState } from 'react';

import { taskRepository } from '../../../entities/task/taskRepository';
import { TaskAssignee } from '../../../entities/task/types';

// ФИО диспетчера заявки — из участников группы dispatchers (прав users:read
// у инженера нет). Список один на сессию.
let dispatchers: Promise<TaskAssignee[]> | null = null;

function fetchDispatchers(): Promise<TaskAssignee[]> {
  if (!dispatchers) {
    const request = taskRepository.getAssignees('dispatchers');
    request.catch(() => {
      if (dispatchers === request) {
        dispatchers = null;
      }
    });
    dispatchers = request;
  }
  return dispatchers;
}

export function useDispatcher(dispatcherId: string | null | undefined): TaskAssignee | null {
  const [dispatcher, setDispatcher] = useState<TaskAssignee | null>(null);

  useEffect(() => {
    if (!dispatcherId) {
      setDispatcher(null);
      return;
    }
    let cancelled = false;
    fetchDispatchers()
      .then(list => {
        if (!cancelled) {
          setDispatcher(list.find(item => item.id === dispatcherId) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDispatcher(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dispatcherId]);

  return dispatcher;
}

export function fullName(person: TaskAssignee): string {
  return [person.lastName, person.firstName, person.middleName].filter(Boolean).join(' ');
}
