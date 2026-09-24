import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma, Role, UserStatus } from '@muza/database';
import { RegisterRequestSchema, LoginRequestSchema, AuditAction } from '@muza/shared';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const parseResult = RegisterRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid registration parameters', parseResult.error.format());
    }

    const { email, password, name, role } = parseResult.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(reply, 409, 'USER_EXISTS', 'A user with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: role as Role,
        status: UserStatus.ACTIVE,
      },
    });

    // Create default brand profile
    await prisma.brandProfile.create({
      data: {
        userId: user.id,
        brandName: `${user.name}'s Studio`,
        niche: 'Digital Content Creation',
        language: 'English',
        tone: 'Professional, Engaging, and Authentic',
        isDefault: true,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_REGISTERED,
        entity: 'User',
        entityId: user.id,
      },
    });

    const token = fastify.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    reply.setCookie('muza_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return sendSuccess(reply, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const parseResult = LoginRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid login credentials', parseResult.error.format());
    }

    const { email, password } = parseResult.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return sendError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return sendError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = fastify.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    reply.setCookie('muza_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_LOGGED_IN,
        entity: 'User',
        entityId: user.id,
      },
    });

    return sendSuccess(reply, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  // Logout
  fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    reply.clearCookie('muza_token');
    if (request.user) {
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: AuditAction.USER_LOGGED_OUT,
          entity: 'User',
          entityId: request.user.id,
        },
      });
    }
    return sendSuccess(reply, { message: 'Logged out successfully' });
  });

  // Me
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return sendSuccess(reply, user);
  });
}
