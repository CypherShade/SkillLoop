import { z } from 'zod';

// Mirrors server/src/validators/schemas.js so users get instant feedback;
// the server still validates everything.
const email = z.email('Enter a valid email address').trim().max(120);
const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long');

export const passwordRules = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[a-z]/.test(p), label: 'A lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'An uppercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'A number' },
];

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[0-9]/, 'Password needs a number');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({ name, email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export const profileSchema = z.object({
  name,
  bio: z.string().trim().max(280, 'Bio must be 280 characters or fewer'),
  location: z.string().trim().max(80, 'Location is too long'),
});

export const skillSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(60, 'Title is too long'),
  description: z.string().trim().max(400, 'Description must be 400 characters or fewer'),
  type: z.enum(['OFFER', 'WANT']),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']),
  categoryId: z.string().min(1, 'Pick a category'),
});

export const swapSchema = z.object({
  offeredSkillId: z.string().min(1, 'Choose a skill you will teach'),
  requestedSkillId: z.string().min(1, 'Choose a skill to learn'),
  message: z.string().trim().min(10, 'Say a little more (at least 10 characters)').max(500, 'Message is too long'),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(40, 'Name is too long'),
  icon: z.string().min(1, 'Pick an icon'),
});
