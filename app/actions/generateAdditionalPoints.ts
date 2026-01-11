'use server';

import type { Field, InstructorType, TemplateItem, FieldTemplate, Templates } from './generatePoints';

// セクション型定義（共通化）
export type Section = {
  title: string;
  points: string[];
  isFallback?: boolean;
};

// 分野別テンプレート（JSONから読み込む）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const templatesData = require('../data/templates.json') as unknown;
const templates = templatesData as Templates;

// 生成意図のタイプ
export type GenerationIntent = 
  | '論点追加' 
  | '視点変更' 
  | '理論寄り' 
  | '実務寄り' 
  | '具体例追加' 
  | '反論考慮';

export type GenerateAdditionalPointsParams = {
  field: Field;
  existingOutline: Section[];
  targetSection: '序論' | '本論' | '結論';
  intent: GenerationIntent;
  question: string;
  instructorType: InstructorType;
};

export type GenerateAdditionalPointsResult = {
  newPoints: string[];
  isFallback: boolean;
};

// テンプレート項目を取得する関数（重み付けでソート）
function getTemplateItems(
  items: TemplateItem[],
  instructorType: InstructorType,
  intent: GenerationIntent
): string[] {
  // 指導教員タイプに応じた重みを取得
  const weightKey = instructorType === '理論重視型' ? 'weight_theory' : 'weight_practical';
  
  // 生成意図に応じて重みを調整
  type ItemWithAdjustedWeight = TemplateItem & { adjustedWeight: number };
  const adjustedItems: ItemWithAdjustedWeight[] = items.map(item => ({
    ...item,
    adjustedWeight: item[weightKey] + getIntentAdjustment(intent, weightKey === 'weight_theory'),
  }));
  
  // 調整後の重みでソート（高い順）
  const sortedItems = adjustedItems.sort((a, b) => {
    return b.adjustedWeight - a.adjustedWeight;
  });
  
  // テキストのみを返す
  return sortedItems.map(item => item.text);
}

// 生成意図に応じた重みの調整値を取得
function getIntentAdjustment(intent: GenerationIntent, isTheory: boolean): number {
  switch (intent) {
    case '理論寄り':
      return isTheory ? 3 : -2;
    case '実務寄り':
      return isTheory ? -2 : 3;
    case '論点追加':
      return 1; // 既存論点と差別化するため少し重みを上げる
    case '視点変更':
      return 2; // より多様な視点を得るため重みを上げる
    case '具体例追加':
      return isTheory ? -1 : 2; // 実務寄りの具体例を優先
    case '反論考慮':
      return isTheory ? 1 : -1; // 理論的な反論を優先
    default:
      return 0;
  }
}

// 既存の論点を除外して新しい論点を取得
function filterExistingPoints(
  allPoints: string[],
  existingPoints: string[]
): string[] {
  // 既存の論点と似たものを除外（簡易的な重複チェック）
  return allPoints.filter(point => {
    return !existingPoints.some(existing => {
      // 文字列の類似度を簡易チェック（50%以上一致する場合は除外）
      const similarity = calculateSimilarity(point, existing);
      return similarity > 0.5;
    });
  });
}

// 文字列の類似度を計算（簡易版）
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  return intersection.length / union.length;
}

export async function generateAdditionalPoints(
  params: GenerateAdditionalPointsParams
): Promise<GenerateAdditionalPointsResult> {
  try {
    const { field, existingOutline, targetSection, intent, question, instructorType } = params;

    // テンプレートから該当するセクションの項目を取得
    const fieldTemplate = templates[field];
    if (!fieldTemplate) {
      console.error(`[generateAdditionalPoints] 分野 "${field}" のテンプレートが見つかりません`);
      return {
        newPoints: ['テンプレートの読み込みに失敗しました'],
        isFallback: false,
      };
    }

    // セクションタイトルを英語キーにマッピング
    const sectionMap: Record<string, keyof Omit<FieldTemplate, 'coreQuestion'>> = {
      '序論': 'intro',
      '本論': 'body',
      '結論': 'conclusion',
    };

    const sectionKey = sectionMap[targetSection];
    if (!sectionKey || !fieldTemplate[sectionKey]) {
      console.error(`[generateAdditionalPoints] セクション "${targetSection}" のテンプレートが見つかりません`);
      return {
        newPoints: ['テンプレートの読み込みに失敗しました'],
        isFallback: false,
      };
    }

    // 既存の指定セクションの論点を取得
    const existingSection = existingOutline.find(s => s.title === targetSection);
    const existingPoints = existingSection?.points || [];

    // テンプレートから全論点を取得（重み付け済み）
    const items = fieldTemplate[sectionKey] as TemplateItem[];
    const allPoints = getTemplateItems(items, instructorType, intent);

    // 既存の論点を除外して新しい論点を生成
    const newPoints = filterExistingPoints(allPoints, existingPoints);

    // 生成意図に応じて論点を調整
    const adjustedPoints = adjustPointsByIntent(newPoints, intent, existingPoints);

    // 最大3つの新しい論点を返す
    const selectedPoints = adjustedPoints.slice(0, 3);

    return {
      newPoints: selectedPoints.length > 0 ? selectedPoints : ['新しい論点を生成中...'],
      isFallback: false,
    };
  } catch (error) {
    console.error('[generateAdditionalPoints] エラーが発生しました:', error);
    
    // フォールバック：既存の論点に1つ追加
    const existingSection = params.existingOutline.find(s => s.title === params.targetSection);
    const fallbackPoints = existingSection?.points || [];
    
    return {
      newPoints: fallbackPoints.length > 0 
        ? [`既存の論点を発展させる新たな視点（${params.intent}）`]
        : ['論点の追加生成中...'],
      isFallback: true,
    };
  }
}

// 生成意図に応じて論点を調整
function adjustPointsByIntent(
  points: string[],
  intent: GenerationIntent,
  existingPoints: string[]
): string[] {
  switch (intent) {
    case '論点追加':
      // 既存と異なる角度の論点を優先
      return points;
    case '視点変更':
      // 多様な視点を持つ論点を優先（既存と異なる用語を含むものを優先）
      return points.sort((a, b) => {
        const aDiversity = calculateDiversity(a, existingPoints);
        const bDiversity = calculateDiversity(b, existingPoints);
        return bDiversity - aDiversity;
      });
    case '理論寄り':
      // 理論的な用語を含む論点を優先
      return points.sort((a, b) => {
        const aTheory = containsTheoryTerms(a);
        const bTheory = containsTheoryTerms(b);
        return bTheory - aTheory;
      });
    case '実務寄り':
      // 実務的な用語を含む論点を優先
      return points.sort((a, b) => {
        const aPractical = containsPracticalTerms(a);
        const bPractical = containsPracticalTerms(b);
        return bPractical - aPractical;
      });
    case '具体例追加':
      // 具体例や事例に関連する論点を優先
      return points.filter(p => 
        p.includes('事例') || p.includes('例') || p.includes('具体')
      ).concat(points.filter(p => 
        !p.includes('事例') && !p.includes('例') && !p.includes('具体')
      ));
    case '反論考慮':
      // 反論や批判を含む論点を優先
      return points.filter(p =>
        p.includes('反論') || p.includes('批判') || p.includes('異論') || p.includes('問題')
      ).concat(points.filter(p =>
        !p.includes('反論') && !p.includes('批判') && !p.includes('異論') && !p.includes('問題')
      ));
    default:
      return points;
  }
}

// 既存論点との多様性を計算
function calculateDiversity(point: string, existingPoints: string[]): number {
  if (existingPoints.length === 0) return 1;
  
  const pointWords = new Set(point.split(/\s+/));
  let totalSimilarity = 0;
  
  for (const existing of existingPoints) {
    const existingWords = new Set(existing.split(/\s+/));
    const intersection = new Set([...pointWords].filter(w => existingWords.has(w)));
    const union = new Set([...pointWords, ...existingWords]);
    totalSimilarity += intersection.size / union.size;
  }
  
  return 1 - (totalSimilarity / existingPoints.length); // 類似度の逆数（多様性）
}

// 理論的用語を含むかチェック
function containsTheoryTerms(text: string): number {
  const theoryTerms = ['理論', '概念', 'フレームワーク', '枠組み', 'モデル', '分析', '検証'];
  return theoryTerms.filter(term => text.includes(term)).length;
}

// 実務的用語を含むかチェック
function containsPracticalTerms(text: string): number {
  const practicalTerms = ['実務', '実践', '適用', '事例', '具体', '実際', '運用'];
  return practicalTerms.filter(term => text.includes(term)).length;
}
