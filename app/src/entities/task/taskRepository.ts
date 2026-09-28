import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { PagedResult, PageRequest } from '../../core/api/types';
import {
  AddTaskPredictionRequest,
  CreateTaskAssignmentRequest,
  CreateTaskReportRequest,
  CreateTaskReturnRequest,
  AssigneeRole,
  CreateWorkTaskRequest,
  TaskAssignee,
  TaskAssignment,
  TaskTransitionRequest,
  TaskPrediction,
  TaskReport,
  TaskReturn,
  UpdateWorkTaskRequest,
  WorkTask,
  WorkTaskListItem,
  WorkTaskStatus,
} from './types';

// Фильтра по объекту у GET /tasks нет — «История объектов» отбирает заявки
// объекта на клиенте.
export interface TaskFilter extends PageRequest {
  dispatcherId?: string;
  status?: WorkTaskStatus;
  // Заявки, где текущий пользователь назначен инженером (свой id знать не нужно).
  assignedToMe?: boolean;
}

export const taskRepository = {
  async getList(filter?: TaskFilter): Promise<PagedResult<WorkTaskListItem>> {
    const { data } = await apiClient.get<PagedResult<WorkTaskListItem>>(endpoints.bff.tasks.list, {
      params: filter,
    });

    return data;
  },

  async get(id: string): Promise<WorkTask> {
    const { data } = await apiClient.get<WorkTask>(endpoints.bff.tasks.byId(id));
    return data;
  },

  async create(request: CreateWorkTaskRequest): Promise<WorkTask> {
    const { data } = await apiClient.post<WorkTask>(endpoints.bff.tasks.list, request);
    return data;
  },

  async update(id: string, request: UpdateWorkTaskRequest): Promise<WorkTask> {
    const { data } = await apiClient.put<WorkTask>(endpoints.bff.tasks.byId(id), request);
    return data;
  },

  // 409 task_already_taken — штатный исход гонки ("кто первый взял — тот
  // ведёт"), не ошибка данных. Репозиторий его не глотает и не превращает в
  // булево — просто пробрасывает исключение, коды разбирает вызывающий код
  // через parseBffError (см. features/tasks/hooks/useTask.ts).
  async take(id: string): Promise<WorkTask> {
    const { data } = await apiClient.post<WorkTask>(endpoints.bff.tasks.take(id));
    return data;
  },

  async addPrediction(id: string, request: AddTaskPredictionRequest): Promise<TaskPrediction> {
    const { data } = await apiClient.post<TaskPrediction>(endpoints.bff.tasks.predictions(id), request);
    return data;
  },

  async removePrediction(id: string, predictionId: string): Promise<void> {
    await apiClient.delete(endpoints.bff.tasks.predictionById(id, predictionId));
  },

  async addAssignment(id: string, request: CreateTaskAssignmentRequest): Promise<TaskAssignment> {
    const { data } = await apiClient.post<TaskAssignment>(endpoints.bff.tasks.assignments(id), request);
    return data;
  },

  async addReport(id: string, request: CreateTaskReportRequest): Promise<TaskReport> {
    const { data } = await apiClient.post<TaskReport>(endpoints.bff.tasks.reports(id), request);
    return data;
  },

  async addReturn(id: string, request: CreateTaskReturnRequest): Promise<TaskReturn> {
    const { data } = await apiClient.post<TaskReturn>(endpoints.bff.tasks.returns(id), request);
    return data;
  },

  async getAssignees(role: AssigneeRole): Promise<TaskAssignee[]> {
    const { data } = await apiClient.get<TaskAssignee[]>(endpoints.bff.tasks.assignees, { params: { role } });
    return data;
  },

  // Переходы статуса; из неподходящего статуса BFF отвечает 409 invalid_status.
  async start(id: string, request: TaskTransitionRequest = {}): Promise<WorkTask> {
    const { data } = await apiClient.post<WorkTask>(endpoints.bff.tasks.start(id), request);
    return data;
  },

  async close(id: string, request: TaskTransitionRequest = {}): Promise<WorkTask> {
    const { data } = await apiClient.post<WorkTask>(endpoints.bff.tasks.close(id), request);
    return data;
  },

  async cancel(id: string, request: TaskTransitionRequest = {}): Promise<WorkTask> {
    const { data } = await apiClient.post<WorkTask>(endpoints.bff.tasks.cancel(id), request);
    return data;
  },
};
