export interface AssignedObject {
  userId: string;
  objectId: number;
  assignedBy: string;
  assignedAt: string;
  note: string | null;
}

export interface CreateAssignedObjectRequest {
  objectId: number;
  note?: string | null;
}
