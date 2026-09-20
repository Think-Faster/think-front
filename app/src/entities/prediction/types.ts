export type Risk = 'high' | 'med' | 'low';

export type PredictionStatus = 'new' | 'work' | 'rejected';

export interface Prediction {
  id: string;
  risk: Risk;
  object: string;
  segment: string;
  title: string;
  probability: number;
  horizon: string;
  status: PredictionStatus;
  rejectReason?: string;
  why: string[];
  recommendation: string;
}
