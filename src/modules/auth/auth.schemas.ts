import { z } from 'zod';

// Normalized as the `account` rate limit keys it (src/infra/throttler).
const email = z.string().trim().normalize('NFC').toLowerCase().pipe(z.email());

export const signUpSchema = z.object({
  email,
  password: z.string().min(12).max(128),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type SignUp = z.infer<typeof signUpSchema>;
export type SignIn = z.infer<typeof signInSchema>;
