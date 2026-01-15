import 'next-auth';

declare module 'next-auth' {
  interface User {
    id?: string;
    plan?: 'free' | 'pro';
  }

  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      plan?: 'free' | 'pro';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    plan?: 'free' | 'pro';
  }
}
