export type EntityId = string;

export interface BaseEntity {
  id: EntityId;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSummary {
  id: EntityId;
  username: string;
}
