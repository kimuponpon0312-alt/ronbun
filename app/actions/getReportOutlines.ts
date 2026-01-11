'use server';

import { createClient } from '@supabase/supabase-js';
import { auth } from '../../auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type Section = {
  title: string;
  points: string[];
};

export type ReportOutline = {
  id: string;
  field: string;
  topic: string;
  wordCount: number;
  supervisorType: string;
  sections: Section[];
  coreQuestion?: string;
  createdAt: string;
  updatedAt: string;
};

export async function getReportOutlines(): Promise<ReportOutline[]> {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.email) {
    console.error('[getReportOutlines] ユーザーがログインしていません');
    return [];
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials are not set. Report outlines will not be retrieved.');
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data, error } = await supabase
      .from('report_outlines')
      .select('*')
      .eq('user_id', session.user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getReportOutlines] 取得エラー:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // データを変換
    const outlines: ReportOutline[] = data.map((item) => ({
      id: item.id,
      field: item.field,
      topic: item.topic,
      wordCount: item.word_count,
      supervisorType: item.supervisor_type,
      sections: item.sections as Section[],
      coreQuestion: item.core_question || undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return outlines;
  } catch (error) {
    console.error('[getReportOutlines] エラーが発生しました:', error);
    return [];
  }
}
