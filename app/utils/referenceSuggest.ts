// 参考文献サジェストユーティリティ

import type { Field } from '../actions/generatePoints';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const referencesData = require('../data/references.json') as unknown;

type ReferenceCategory = '理論的基盤' | '方法論・アプローチ' | '具体的検討';
type FieldReferences = Record<ReferenceCategory, string[]>;
type ReferencesData = Record<Field, FieldReferences>;

const references = referencesData as ReferencesData;

// 論点から関連文献を抽出
export function suggestReferences(
  field: Field,
  points: string[]
): Array<{ category: ReferenceCategory; references: string[] }> {
  const fieldRefs = references[field];
  if (!fieldRefs) {
    return [];
  }

  // 論点のキーワードを抽出
  const keywords = extractKeywordsFromPoints(points);

  // カテゴリごとにキーワードマッチングで関連文献を抽出
  const suggestions: Array<{ category: ReferenceCategory; references: string[] }> = [];

  Object.entries(fieldRefs).forEach(([category, refs]) => {
    const matchedRefs = refs.filter(ref => {
      // 論点のキーワードと文献タイトルの関連性をチェック
      return keywords.some(keyword => ref.includes(keyword));
    });

    if (matchedRefs.length > 0) {
      suggestions.push({
        category: category as ReferenceCategory,
        references: matchedRefs.slice(0, 3), // 最大3件
      });
    }
  });

  // マッチしない場合は、各カテゴリから最初の文献を提案
  if (suggestions.length === 0) {
    suggestions.push({
      category: '理論的基盤',
      references: fieldRefs['理論的基盤'].slice(0, 2),
    });
    suggestions.push({
      category: '方法論・アプローチ',
      references: fieldRefs['方法論・アプローチ'].slice(0, 2),
    });
  }

  return suggestions;
}

// 論点からキーワードを抽出
function extractKeywordsFromPoints(points: string[]): string[] {
  const keywords: string[] = [];

  // 学術的なキーワードパターン
  const patterns = [
    /理論|概念|フレームワーク|モデル/g,
    /分析|検討|考察|解釈/g,
    /方法|手法|アプローチ|技法/g,
    /事例|具体|例|ケース/g,
    /比較|対比|相違|類似/g,
    /歴史|史料|時代|背景/g,
    /実務|実践|適用|運用/g,
  ];

  points.forEach(point => {
    patterns.forEach(pattern => {
      const matches = point.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    });
  });

  return [...new Set(keywords)]; // 重複を除去
}
