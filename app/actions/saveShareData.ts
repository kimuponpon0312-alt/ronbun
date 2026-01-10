'use server';

// 共有データの保存（メモリベース - 本番環境ではRedis/DBに移行推奨）
// 簡単な実装のため、Mapを使用（サーバー再起動で消える）
const shareDataStore = new Map<string, ShareData>();

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
export async function saveShareData(data: ShareData): Promise<string> {
  // reportIdを生成（タイムスタンプ + ランダム文字列）
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  const reportId = `${timestamp}-${randomStr}`;

  shareDataStore.set(reportId, data);

  // 30日後に自動削除（メモリ節約のため）
  setTimeout(() => {
    shareDataStore.delete(reportId);
  }, 30 * 24 * 60 * 60 * 1000);

  return reportId;
}

// 共有データを取得
export async function getShareData(reportId: string): Promise<ShareData | null> {
  const data = shareDataStore.get(reportId);
  return data || null;
}
