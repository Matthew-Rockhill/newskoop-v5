import { prisma } from './prisma';
import type { AuditLog } from '@prisma/client';

interface CreateAuditLogParams {
  userId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  targetId?: string;
  targetType?: string;
}

export async function logAudit({
  userId,
  action,
  details,
  ipAddress,
  userAgent,
  targetId,
  targetType,
}: CreateAuditLogParams): Promise<AuditLog> {
  // Sanitize details to prevent storing sensitive information
  const sanitizedDetails = details ? sanitizeAuditDetails(details) : undefined;

  return prisma.auditLog.create({
    data: {
      userId,
      action,
      details: sanitizedDetails,
      ipAddress,
      userAgent,
      targetId,
      targetType,
    },
  });
}

interface GetAuditLogsParams {
  userId?: string;
  action?: string;
  targetId?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  perPage?: number;
}

export async function getAuditLogs({
  userId,
  action,
  targetId,
  targetType,
  startDate,
  endDate,
  page = 1,
  perPage = 50,
}: GetAuditLogsParams = {}) {
  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    ...(targetId && { targetId }),
    ...(targetType && { targetType }),
    ...(startDate || endDate) && {
      createdAt: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    },
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    logs: logs.map(log => ({
      ...log,
      user: {
        ...log.user,
        name: `${log.user.firstName} ${log.user.lastName}`,
      },
    })),
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

// Helper function to sanitize audit details
function sanitizeAuditDetails(details: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  return Object.entries(details).reduce((acc, [key, value]) => {
    // Skip sensitive fields
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      return acc;
    }

    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[key] = sanitizeAuditDetails(value);
      return acc;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      acc[key] = value.map(item =>
        typeof item === 'object' ? sanitizeAuditDetails(item) : item
      );
      return acc;
    }

    // Include non-sensitive fields
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);
}

// Constants for audit actions
export const AuditActions = {
  // Auth
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  PASSWORD_RESET: 'auth.password.reset',
  PASSWORD_CHANGE: 'auth.password.change',

  // Users
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ACTIVATE: 'user.activate',
  USER_DEACTIVATE: 'user.deactivate',

  // Stations
  STATION_CREATE: 'station.create',
  STATION_UPDATE: 'station.update',
  STATION_DELETE: 'station.delete',
  STATION_ACTIVATE: 'station.activate',
  STATION_DEACTIVATE: 'station.deactivate',

  // Content
  CONTENT_CREATE: 'content.create',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  CONTENT_UNPUBLISH: 'content.unpublish',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions]; 