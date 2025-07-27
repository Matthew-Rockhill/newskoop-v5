import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        if (!user.isActive) {
          throw new Error('This account has been deactivated');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        // Update last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: user.id,
            metadata: {
              method: 'credentials',
            },
          },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          staffRole: user.staffRole,
          radioStationId: user.radioStationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.userType = user.userType;
        token.staffRole = user.staffRole;
        token.radioStationId = user.radioStationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.userType = token.userType;
        session.user.staffRole = token.staffRole;
        session.user.radioStationId = token.radioStationId;
      }
      return session;
    },
  },
};

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateMagicLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/auth/set-password?token=${token}`;
}

export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'changeme';
const RESET_TOKEN_EXPIRY = '1h';

export function generateResetToken(userId: string): string {
  return jwt.sign({ userId }, RESET_TOKEN_SECRET, { expiresIn: RESET_TOKEN_EXPIRY });
}

export function verifyResetToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, RESET_TOKEN_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
} 