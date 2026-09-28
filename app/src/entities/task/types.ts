export type TaskSourceType = 'prediction' | 'fact' | 'call' | 'external';

export type WorkTaskStatus =
  | 'new'
  | 'inWork'
  | 'assigned'
  | 'engineerWorking'
  | 'completed'
  | 'closed'
  | 'returnedToWork'
  | 'cancelled';

export type ReturnTargetType = 'dispatcher' | 'queue' | 'incident';

export interface WorkTaskListItem {
  id: string;
  number: string;
  sourceType: TaskSourceType;
  objectId: number;
  topic: string;
  status: WorkTaskStatus;
  dispatcherId: string | null;
  createdAt: string;
}

export interface TaskPrediction {
  predictionId: string;
  attachedBy: string;
  attachedAt: string;
  detachedAt: string | null;
  isPrimary: boolean;
}

export interface TaskAssignment {
  id: string;
  engineerId: string;
  assignedBy: string;
  assignedAt: string;
  status: string;
  comment: string | null;
}

export interface TaskReport {
  id: string;
  engineerId: string;
  actualState: string | null;
  worksDone: string | null;
  resultCode: string;
  comment: string | null;
  createdAt: string;
}

export interface TaskReturn {
  id: string;
  returnedBy: string;
  targetType: ReturnTargetType;
  targetUserId: string | null;
  comment: string | null;
  returnedAt: string;
}

export interface WorkTask extends WorkTaskListItem {
  picketId: string | null;
  description: string | null;
  workType: string | null;
  faultClassification: string | null;
  sensorIds: number[];
  comment: string | null;
  priority: number;
  takenAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  predictions: TaskPrediction[];
  assignments: TaskAssignment[];
  reports: TaskReport[];
  returns: TaskReturn[];
}

export interface CreateWorkTaskRequest {
  number: string;
  sourceType: TaskSourceType;
  objectId: number;
  picketId?: string | null;
  topic: string;
  description?: string | null;
  workType?: string | null;
  faultClassification?: string | null;
  sensorIds?: number[];
  priority: number;
}

export interface UpdateWorkTaskRequest {
  topic: string;
  description?: string | null;
  workType?: string | null;
  faultClassification?: string | null;
  comment?: string | null;
  priority: number;
}

export interface AddTaskPredictionRequest {
  predictionId: string;
  isPrimary: boolean;
}

export interface CreateTaskAssignmentRequest {
  engineerId: string;
  comment?: string | null;
}

export interface CreateTaskReportRequest {
  actualState?: string | null;
  worksDone?: string | null;
  resultCode: string;
  comment?: string | null;
}

// Исполнители: role=engineers — кого назначить, dispatchers — кому вернуть.
// Участники группы с подгруппами; прав users/groups не требует.
export type AssigneeRole = 'engineers' | 'dispatchers';

export interface TaskAssignee {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
}

// Переходы без данных: начать работу, закрыть, отменить. Комментарий
// дописывается к заявке.
export interface TaskTransitionRequest {
  comment?: string | null;
}

export interface CreateTaskReturnRequest {
  targetType: ReturnTargetType;
  targetUserId?: string | null;
  comment?: string | null;
}
