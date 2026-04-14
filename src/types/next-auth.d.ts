import { UserType, StaffRole } from './index';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      userType: UserType;
      staffRole?: StaffRole;
      radioStationId?: string;
      isContentProducer?: boolean;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    staffRole?: StaffRole;
    radioStationId?: string;
    isContentProducer?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    staffRole?: StaffRole;
    radioStationId?: string;
    isContentProducer?: boolean;
  }
} 