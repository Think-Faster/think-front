export interface Presence {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastAction: string | null;
}
