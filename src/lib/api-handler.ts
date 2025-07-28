import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ZodError } from 'zod';
import { prisma } from './prisma';
import { logAudit } from './audit';

export type ApiHandler = (
  req: NextRequest,
  context: { params: Promise<any> }
) => Promise<NextResponse> | NextResponse;

type ApiMiddleware = (handler: ApiHandler) => ApiHandler;

export const withErrorHandling: ApiMiddleware = (handler) => {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
};

export const withAuth: ApiMiddleware = (handler) => {
  return async (req, context) => {
    const token = await getToken({ req });
    console.log('🔐 Auth Token:', token ? 'Present' : 'Missing');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        staffRole: true,
        isActive: true,
      },
    });

    console.log('👤 User Data:', user ? `${user.email} (${user.staffRole || 'no staff role'})` : 'Not found');

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Attach user to request
    (req as any).user = user;

    return handler(req, context);
  };
};

export const withAudit = (action: string): ApiMiddleware => {
  return (handler) => {
    return async (req, context) => {
      const token = await getToken({ req });
      const response = await handler(req, context);
      
      if (response.ok && token?.sub) {
        await logAudit({
          userId: token.sub,
          action,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        });
      }

      return response;
    };
  };
};

export const withValidation = <T>(schema: any): ApiMiddleware => {
  return (handler) => {
    return async (req, context) => {
      const body = await req.json();
      const validated = schema.parse(body);
      
      // Attach validated data to the request
      (req as any).validatedData = validated;
      
      return handler(req, context);
    };
  };
};

export const createHandler = (
  handler: ApiHandler,
  middlewares: ApiMiddleware[] = []
) => {
  return middlewares.reduceRight(
    (handler, middleware) => middleware(handler),
    handler
  );
}; 