// 論点分類（タグ付け）ユーティリティ

export type PointTag = 
  | '理論' 
  | '実務' 
  | '歴史' 
  | '比較' 
  | '事例' 
  | '反論' 
  | '定義' 
  | '分析'
  | '方法論'
  | '検証';

export type TaggedPoint = {
  text: string;
  tags: Array<{ tag: PointTag; confidence: number }>;
};

// タグとキーワードのマッピング
const TAG_KEYWORDS: Record<PointTag, string[]> = {
  '理論': ['理論', '概念', 'フレームワーク', 'モデル', '仮説', '学説', '理論的'],
  '実務': ['実務', '実践', '適用', '運用', '実際', '具体的', '実践的'],
  '歴史': ['歴史', '史料', '時代', '背景', '史的', '過去', '歴史的'],
  '比較': ['比較', '対比', '相違', '類似', '差異', '対照', '比較的'],
  '事例': ['事例', '例', '具体', 'ケース', 'サンプル', '実例'],
  '反論': ['反論', '批判', '異論', '問題', '限界', '課題', '批判的'],
  '定義': ['定義', '意味', '概念', '規定', '解釈'],
  '分析': ['分析', '検討', '考察', '解釈', '検証', '評価'],
  '方法論': ['方法', '手法', 'アプローチ', '方法論', '手順'],
  '検証': ['検証', '検証', '実証', '立証', '証明', '確認'],
};

// 論点にタグを付与
export function classifyPoint(pointText: string): TaggedPoint {
  const tags: Array<{ tag: PointTag; confidence: number }> = [];

  // 各タグについてキーワードマッチング
  Object.entries(TAG_KEYWORDS).forEach(([tag, keywords]) => {
    const matchedKeywords = keywords.filter(keyword => 
      pointText.includes(keyword)
    );
    
    if (matchedKeywords.length > 0) {
      // キーワードの一致数に基づいて信頼度を計算
      const confidence = Math.min(matchedKeywords.length / keywords.length * 2, 1.0);
      tags.push({
        tag: tag as PointTag,
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  });

  // 信頼度でソート（高い順）
  tags.sort((a, b) => b.confidence - a.confidence);

  // 信頼度が0.3以上のタグのみを返す（最大3つ）
  const filteredTags = tags
    .filter(t => t.confidence >= 0.3)
    .slice(0, 3);

  return {
    text: pointText,
    tags: filteredTags.length > 0 ? filteredTags : [{ tag: '分析', confidence: 0.5 }], // デフォルトタグ
  };
}

// 複数の論点にタグを付与
export function classifyPoints(points: string[]): TaggedPoint[] {
  return points.map(point => classifyPoint(point));
}

// タグでフィルタリング
export function filterByTags(
  taggedPoints: TaggedPoint[],
  selectedTags: PointTag[]
): TaggedPoint[] {
  if (selectedTags.length === 0) {
    return taggedPoints;
  }

  return taggedPoints.filter(taggedPoint => {
    return taggedPoint.tags.some(tagInfo => 
      selectedTags.includes(tagInfo.tag)
    );
  });
}
