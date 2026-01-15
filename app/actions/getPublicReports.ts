'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type PublicReport = {
  id: string;
  field: string;
  topic: string;
  createdAt: string;
};

// 公開レポート一覧を取得
export async function getPublicReports(): Promise<PublicReport[]> {
  if (!supabaseUrl || !supabaseKey) {
    console.error('[getPublicReports] 環境変数が不足しています:', {
      url: !!supabaseUrl,
      key: !!supabaseKey,
    });
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // content全体を取得して、必要なフィールドを抽出
    // パフォーマンスを考慮して、最新6件のみ取得
    // is_publicがtrueのものだけを取得（プライバシー保護）
    const { data, error } = await supabase
      .from('shared_reports')
      .select('id, created_at, content')
      .eq('is_public', true) // 公開設定がtrueのものだけを取得
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('[getPublicReports] 取得エラー:', error);
      console.error('[getPublicReports] エラー詳細:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // contentから必要なフィールドを抽出
    const reports: PublicReport[] = data
      .map((item) => {
        const content = item.content as {
          field?: string;
          question?: string;
        };
        
        if (!content || !content.field || !content.question) {
          return null;
        }

        return {
          id: item.id,
          field: content.field,
          topic: content.question,
          createdAt: item.created_at,
        };
      })
      .filter((report): report is PublicReport => report !== null);

    return reports;
  } catch (error) {
    console.error('[getPublicReports] エラーが発生しました:', error);
    if (error instanceof Error) {
      console.error('[getPublicReports] エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    } else {
      console.error('[getPublicReports] エラーオブジェクト:', JSON.stringify(error, null, 2));
    }
    return [];
  }
}
