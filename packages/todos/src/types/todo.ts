import { z } from 'zod';
import type { BaseEntity } from '@jtl/shared';

export const createTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(120, 'Title cannot exceed 120 characters'),
  assigneeId: z
    .string()
    .trim()
    .min(1, 'Please select or provide an assignee'),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export interface TodoItem extends BaseEntity {
  title: string;
  assigneeId: string;
  completed: boolean;
  /**
   * Set to true when this item exists in the cache optimistically before server confirmation.
   */
  isOptimistic?: boolean;
}
