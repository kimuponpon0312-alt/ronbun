'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type ShareData = {
  field: string;
  question: string;
  wordCount: number;
  instructorType: string;
  outline: {
    sections: Array<{
      title: string;
      points: string[];
    }>;
    coreQuestion?: string;
  };
  createdAt: string;
};

// 共有データを保存
export async function saveShareData(data: ShareData): Promise<string | null> {
  // 環境変数の確認（開発環境のみログ出力）
  if (process.env.NODE_ENV === 'development') {
    console.log('[saveShareData] 環境変数チェック:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('[saveShareData] 環境変数が不足しています:', {
      url: !!supabaseUrl,
      key: !!supabaseKey,
    });
    console.error('[saveShareData] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'undefined');
    console.error('[saveShareData] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '***設定済み***' : 'undefined');
    return null;
  }

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (clientError) {
    console.error('[saveShareData] Supabaseクライアントの初期化に失敗:', clientError);
    if (clientError instanceof Error) {
      console.error('[saveShareData] クライアント初期化エラー詳細:', {
        message: clientError.message,
        stack: clientError.stack,
        name: clientError.name,
      });
    } else {
      console.error('[saveShareData] クライアント初期化エラーオブジェクト:', JSON.stringify(clientError, null, 2));
    }
    return null;
  }

  try {
    const { data: savedData, error } = await supabase
      .from('shared_reports')
      .insert({
        content: data,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[saveShareData] Supabase保存エラー:', error);
      console.error('[saveShareData] エラー詳細:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        errorObject: JSON.stringify(error, null, 2),
      });
      return null;
    }

    if (!savedData || !savedData.id) {
      console.error('[saveShareData] 保存データが不正です:', savedData);
      return null;
    }

    console.log('[saveShareData] 共有データを保存しました:', savedData.id);
    return savedData.id;
  } catch (error) {
    console.error('[saveShareData] 予期しないエラーが発生しました:', error);
    // エラーオブジェクト全体を詳細に出力
    if (error instanceof Error) {
      console.error('[saveShareData] エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      });
    } else {
      console.error('[saveShareData] エラーオブジェクト:', JSON.stringify(error, null, 2));
    }
    return null;
  }
}

// 共有データを取得
export async function getShareData(reportId: string): Promise<ShareData | null> {
  if (!supabaseUrl || !supabaseKey) {
    console.error('[getShareData] 環境変数が不足しています:', {
      url: !!supabaseUrl,
      key: !!supabaseKey,
    });
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data, error } = await supabase
      .from('shared_reports')
      .select('content')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('[getShareData] 取得エラー:', error);
      return null;
    }

    if (!data || !data.content) {
      return null;
    }

    // JSONBは自動的にパースされるので、そのまま返す
    return data.content as ShareData;
  } catch (error) {
    console.error('[getShareData] エラーが発生しました:', error);
    return null;
  }
}
