export type EngineerStatus = 'available' | 'assigned' | 'busy' | 'unavailable';

export interface EngineerProfile {
  userId: string;
  brigadeId: string | null;
  phone: string | null;
  telegram: string | null;
  specialization: string[];
  status: EngineerStatus;
}

export interface UpdateEngineerProfileRequest {
  brigadeId?: string | null;
  phone?: string | null;
  telegram?: string | null;
  specialization: string[];
  status: EngineerStatus;
}
