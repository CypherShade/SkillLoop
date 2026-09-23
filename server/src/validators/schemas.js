const { z } = require('zod');

const id = z.string().trim().min(1, 'Required').max(40);
const email = z.email('Enter a valid email address').trim().toLowerCase().max(120);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[0-9]/, 'Password needs a number');
const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long');

const register = z.object({ name, email, password });

const login = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

const updateProfile = z
  .object({
    name: name.optional(),
    bio: z.string().trim().max(280, 'Bio must be 280 characters or fewer').optional(),
    location: z.string().trim().max(80, 'Location is too long').optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const skillBody = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(60, 'Title is too long'),
  description: z.string().trim().max(400, 'Description must be 400 characters or fewer').default(''),
  type: z.enum(['OFFER', 'WANT'], 'Choose teach or learn'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT'], 'Choose a level').default('INTERMEDIATE'),
  categoryId: id,
});

const skillUpdate = skillBody.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const skillQuery = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  type: z.enum(['OFFER', 'WANT']).default('OFFER'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const createSwap = z
  .object({
    offeredSkillId: id,
    requestedSkillId: id,
    message: z.string().trim().min(10, 'Say a little more (at least 10 characters)').max(500, 'Message is too long'),
  })
  .refine((v) => v.offeredSkillId !== v.requestedSkillId, { message: 'Pick two different skills', path: ['requestedSkillId'] });

const swapStatus = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED'], 'Unknown status'),
});

const swapQuery = z.object({
  box: z.enum(['incoming', 'outgoing', 'all']).default('all'),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED']).optional(),
});

const category = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(40, 'Name is too long'),
  icon: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Use a lucide icon name like "code" or "music"')
    .max(30)
    .default('sparkles'),
});

const adminUserUpdate = z
  .object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const adminUserQuery = z.object({
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  register,
  login,
  updateProfile,
  skillBody,
  skillUpdate,
  skillQuery,
  createSwap,
  swapStatus,
  swapQuery,
  category,
  adminUserUpdate,
  adminUserQuery,
};
