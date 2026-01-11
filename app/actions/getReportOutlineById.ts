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

export async function getReportOutlineById(id: string): Promise<ReportOutline | null> {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.email) {
    console.error('[getReportOutlineById] ユーザーがログインしていません');
    return null;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials are not set. Report outline will not be retrieved.');
    return null;
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
      .eq('id', id)
      .eq('user_id', session.user.email)
      .single();

    if (error || !data) {
      console.error('[getReportOutlineById] 取得エラー:', error);
      return null;
    }

    // データを変換
    const outline: ReportOutline = {
      id: data.id,
      field: data.field,
      topic: data.topic,
      wordCount: data.word_count,
      supervisorType: data.supervisor_type,
      sections: data.sections as Section[],
      coreQuestion: data.core_question || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return outline;
  } catch (error) {
    console.error('[getReportOutlineById] エラーが発生しました:', error);
    return null;
  }
}
