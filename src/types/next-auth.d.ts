import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: 'admin' | 'asesor';
      airtableId: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'admin' | 'asesor';
    airtableId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'admin' | 'asesor';
    airtableId: string | null;
  }
}
