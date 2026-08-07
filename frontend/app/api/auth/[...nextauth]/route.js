import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              pass: credentials.password,
            }),
            headers: { 'Content-Type': 'application/json' },
          });

          const data = await res.json();

          if (res.ok && data.access_token) {
            // Decode the payload manually
            const token = data.access_token;
            const parts = token.split('.');
            if (parts.length !== 3) {
              throw new Error('Invalid JWT format');
            }
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

            return {
              id: payload.sub,
              email: credentials.email,
              role: payload.role,
              employeeId: payload.employeeId || null,
              accessToken: token,
            };
          }
          return null;
        } catch (error) {
          console.error('NextAuth authorize error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.role = token.role;
      session.user.employeeId = token.employeeId;
      session.user.id = token.sub;
      return session;
    }
  },
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'devauthsecret321456',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
