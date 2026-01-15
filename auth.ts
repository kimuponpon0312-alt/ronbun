import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        // セッションにユーザーIDを追加
        const userId = token.sub as string;
        (session.user as { id?: string }).id = userId;
        
        // Supabaseから最新のプラン情報を取得してセッションに含める
        // セッションが呼び出されるたびに必ずDBから最新情報を取得
        if (session.user.email && supabaseUrl && supabaseServiceKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            });

            // profilesテーブルからemailでプラン情報を取得
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('plan, email, id')
              .eq('email', session.user.email)
              .maybeSingle();

            // デバッグ情報を出力
            console.log('[auth] プラン情報取得結果:', {
              email: session.user.email,
              profileData: profileData,
              profileError: profileError,
              planValue: profileData?.plan,
              planType: typeof profileData?.plan,
            });

            if (profileError) {
              console.warn('[auth] profilesテーブル検索エラー:', profileError);
            }

            // DBの値をそのまま反映（ProならPro、FreeならFree）
            if (profileData?.plan === 'free' || profileData?.plan === 'pro') {
              (session.user as { plan?: string }).plan = profileData.plan;
              console.log('[auth] セッションにプラン情報を設定:', { 
                email: session.user.email, 
                plan: profileData.plan 
              });
            } else {
              // データが見つからない場合のみ、デフォルトで'free'を設定
              (session.user as { plan?: string }).plan = 'free';
              console.warn('[auth] プラン情報が見つかりませんでした。デフォルトでfreeを設定:', {
                email: session.user.email,
                profileDataExists: !!profileData,
                planValue: profileData?.plan,
                planIsNull: profileData?.plan === null,
                planIsUndefined: profileData?.plan === undefined,
              });
            }
          } catch (error) {
            console.error('[auth] プラン情報の取得に失敗:', error);
            // エラー時はデフォルトでfree
            (session.user as { plan?: string }).plan = 'free';
          }
        } else {
          // Supabaseが設定されていない場合はデフォルトでfree
          console.warn('[auth] Supabase設定が不足しています:', {
            email: session.user.email,
            supabaseUrl: !!supabaseUrl,
            supabaseServiceKey: !!supabaseServiceKey,
          });
          (session.user as { plan?: string }).plan = 'free';
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
