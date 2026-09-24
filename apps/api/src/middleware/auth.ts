import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma, Role } from '@muza/database';
import { sendError } from '../utils/response.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string };
    user: AuthenticatedUser;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && (request.cookies as any).muza_token) {
      token = (request.cookies as any).muza_token;
    }

    if (!token) {
      return sendError(reply, 401, 'UNAUTHORIZED', 'Authentication token is required');
    }

    const decoded = await request.jwtVerify<{ userId: string }>();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return sendError(reply, 401, 'UNAUTHORIZED', 'User not found or account is deactivated');
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (err: any) {
    return sendError(reply, 401, 'UNAUTHORIZED', 'Invalid or expired session token');
  }
}

export function requireRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return sendError(reply, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      return sendError(
        reply,
        403,
        'FORBIDDEN',
        `Access denied. Role "${request.user.role}" does not have required permissions.`
      );
    }
  };
}
