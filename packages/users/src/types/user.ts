import { z } from 'zod';
import type { BaseEntity } from '@jtl/shared';

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export interface User extends BaseEntity {
  username: string;
}
