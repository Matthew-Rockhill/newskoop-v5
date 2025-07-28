import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ZodError } from 'zod';
import { prisma } from './prisma';
import { logAudit } from './audit';

export type ApiHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
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
    (req as NextRequest & { user: typeof user }).user = user;

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
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        });
      }

      return response;
    };
  };
};

export const withValidation = <T>(schema: { parse: (data: unknown) => T }): ApiMiddleware => {
  return (handler) => {
    return async (req, context) => {
      const body = await req.json();
      console.log('Raw request body:', JSON.stringify(body, null, 2));
      console.log('Translation language value:', body.translationLanguage, typeof body.translationLanguage);
      
      const validated = schema.parse(body);
      console.log('Validated data:', JSON.stringify(validated, null, 2));
      
      // Attach validated data to the request
      (req as NextRequest & { validatedData: T }).validatedData = validated;
      
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