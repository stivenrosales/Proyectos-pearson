import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Airtable from 'airtable';
import bcrypt from 'bcryptjs';

// Configurar Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

const equipoTable = base('tblxeJD9pPvdj1MJW'); // Equipo Main

// Tipo extendido para el usuario
export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'asesor';
  airtableId: string | null; // ID del record en Airtable (para filtrar proyectos)
}

// Función para buscar usuario en Airtable
async function findUserByEmail(email: string): Promise<UserWithRole | null> {
  try {
    const records = await equipoTable
      .select({
        filterByFormula: `AND({Email} = "${email}", {Cargo} = "Asesor")`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      const record = records[0];
      const fields = record.fields;

      return {
        id: record.id,
        name: (fields['Nombre'] as string) || 'Usuario',
        email: (fields['Email'] as string) || email,
        role: 'asesor',
        airtableId: record.id,
      };
    }

    return null;
  } catch (error) {
    console.error('Error buscando usuario en Airtable:', error);
    return null;
  }
}

// Función para verificar contraseña
async function verifyPassword(email: string, password: string): Promise<boolean> {
  try {
    const records = await equipoTable
      .select({
        filterByFormula: `{Email} = "${email}"`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      const storedPassword = records[0].fields['Password'] as string;

      if (!storedPassword) return false;

      // Si la contraseña está hasheada (empieza con $2)
      if (storedPassword.startsWith('$2')) {
        return await bcrypt.compare(password, storedPassword);
      }

      // Si es texto plano (para migración inicial), comparar directamente
      // NOTA: En producción, todas las contraseñas deben estar hasheadas
      return storedPassword === password;
    }

    return false;
  } catch (error) {
    console.error('Error verificando contraseña:', error);
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'tu@email.com' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        // 1. Verificar si es el admin (desde env vars)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@pearson.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'pearson2024';

        if (email === adminEmail.toLowerCase() && password === adminPassword) {
          return {
            id: 'admin',
            name: 'Administrador',
            email: adminEmail,
            role: 'admin',
            airtableId: null,
          } as UserWithRole;
        }

        // 2. Buscar usuario en Airtable (asesoras)
        const user = await findUserByEmail(email);

        if (!user) {
          console.log('Usuario no encontrado:', email);
          return null;
        }

        // 3. Verificar contraseña
        const isValidPassword = await verifyPassword(email, password);

        if (!isValidPassword) {
          console.log('Contraseña inválida para:', email);
          return null;
        }

        return user as UserWithRole;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userWithRole = user as UserWithRole;
        token.id = userWithRole.id;
        token.role = userWithRole.role;
        token.airtableId = userWithRole.airtableId;
        token.name = userWithRole.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as UserWithRole).id = token.id as string;
        (session.user as UserWithRole).role = token.role as 'admin' | 'asesor';
        (session.user as UserWithRole).airtableId = token.airtableId as string | null;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};

// Función helper para hashear contraseñas (usar en scripts de setup)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
