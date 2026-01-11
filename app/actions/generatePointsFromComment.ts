'use server';

import type { Field, InstructorType, TemplateItem, FieldTemplate, Templates } from './generatePoints';
import type { Section } from './generateAdditionalPoints';

// 分野別テンプレート（JSONから読み込む）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const templatesData = require('../data/templates.json') as unknown;
const templates = templatesData as Templates;

// コメントタイプ
export type CommentType = 'criticism' | 'addition' | 'modification' | 'deletion';

// コメント解析結果
export type CommentAnalysis = {
  intent: 'add' | 'modify' | 'delete' | 'strengthen';
  targetKeywords: string[];
  suggestedChanges: string[];
};

export type GeneratePointsFromCommentParams = {
  field: Field;
  existingOutline: Section[];
  targetSection: '序論' | '本論' | '結論';
  commentText: string;
  commentType: CommentType;
  question: string;
  instructorType: InstructorType;
  targetPointIndex?: number; // 特定論点へのコメント
};

export type GeneratePointsFromCommentResult = {
  updatedPoints: string[];
  addedPoints: string[];
  modifiedPoints: Array<{ before: string; after: string }>;
  removedPointIndices: number[];
  isFallback: boolean;
};

// コメント解析関数（テンプレートベース）
function analyzeComment(commentText: string, commentType: CommentType): CommentAnalysis {
  const keywords = extractKeywords(commentText);
  let intent: CommentAnalysis['intent'] = 'add';
  
  switch (commentType) {
    case 'criticism':
      // 批判的なコメント: 修正または強化が必要
      if (commentText.includes('弱い') || commentText.includes('不足') || commentText.includes('不十分')) {
        intent = 'strengthen';
      } else if (commentText.includes('修正') || commentText.includes('変更')) {
        intent = 'modify';
      } else {
        intent = 'strengthen';
      }
      break;
    case 'addition':
      intent = 'add';
      break;
    case 'modification':
      intent = 'modify';
      break;
    case 'deletion':
      intent = 'delete';
      break;
  }

  return {
    intent,
    targetKeywords: keywords,
    suggestedChanges: generateSuggestedChanges(commentText, commentType, keywords),
  };
}

// コメントからキーワードを抽出
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // 学術的なキーワードパターン
  const patterns = [
    /文体分析|修辞技法|表現技法|言語分析/g,
    /理論|実務|事例|具体例/g,
    /比較|対比|相違|類似/g,
    /先行研究|既存研究|関連研究/g,
    /歴史的背景|文化的文脈/g,
    /解釈|検証|妥当性/g,
    /反論|批判|異論/g,
    /実証|データ|統計/g,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  });

  return [...new Set(keywords)]; // 重複を除去
}

// コメントに基づいて変更案を生成
function generateSuggestedChanges(
  commentText: string,
  commentType: CommentType,
  keywords: string[]
): string[] {
  const suggestions: string[] = [];

  // キーワードに基づいて具体的な変更案を生成
  if (keywords.some(k => k.includes('文体') || k.includes('修辞'))) {
    suggestions.push('修辞技法の分析と意味生成への影響を検討する');
    suggestions.push('文体の特徴と解釈の妥当性を検証する');
  }
  
  if (keywords.some(k => k.includes('比較') || k.includes('対比'))) {
    suggestions.push('先行研究との比較による位置づけを明確化する');
    suggestions.push('同時代作品との比較による解釈の妥当性を検証する');
  }

  if (keywords.some(k => k.includes('事例') || k.includes('具体'))) {
    suggestions.push('具体的事例を用いて理論的観点を補強する');
    suggestions.push('実証データに基づく検証を追加する');
  }

  if (keywords.some(k => k.includes('理論'))) {
    suggestions.push('理論的フレームワークの適用を明確化する');
  }

  if (keywords.some(k => k.includes('歴史') || k.includes('文化的'))) {
    suggestions.push('歴史的背景と文化的文脈の整理を追加する');
  }

  // コメントから直接抽出できる変更案
  if (commentText.includes('追加') || commentText.includes('付け加え')) {
    const match = commentText.match(/追加してほしい|付け加えてほしい|加えてほしい/);
    if (match) {
      const context = commentText.substring(match.index! - 20, match.index! + match[0].length + 20);
      suggestions.push(`${context}を反映した論点を追加する`);
    }
  }

  return suggestions.length > 0 ? suggestions : ['コメントに基づく改善を反映する'];
}

// テンプレート項目を取得（generateAdditionalPoints.tsと同じロジック）
function getTemplateItems(
  items: TemplateItem[],
  instructorType: InstructorType,
  intent: 'add' | 'modify' | 'delete' | 'strengthen'
): string[] {
  const weightKey = instructorType === '理論重視型' ? 'weight_theory' : 'weight_practical';
  
  type ItemWithAdjustedWeight = TemplateItem & { adjustedWeight: number };
  const adjustedItems: ItemWithAdjustedWeight[] = items.map(item => ({
    ...item,
    adjustedWeight: item[weightKey] + (intent === 'strengthen' ? 2 : 0),
  }));
  
  const sortedItems = adjustedItems.sort((a, b) => b.adjustedWeight - a.adjustedWeight);
  return sortedItems.map(item => item.text);
}

// 既存の論点を除外
function filterExistingPoints(allPoints: string[], existingPoints: string[]): string[] {
  return allPoints.filter(point => {
    return !existingPoints.some(existing => {
      const similarity = calculateSimilarity(point, existing);
      return similarity > 0.5;
    });
  });
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  return intersection.length / union.length;
}

export async function generatePointsFromComment(
  params: GeneratePointsFromCommentParams
): Promise<GeneratePointsFromCommentResult> {
  try {
    const { field, existingOutline, targetSection, commentText, commentType, question, instructorType, targetPointIndex } = params;

    // コメントを解析
    const analysis = analyzeComment(commentText, commentType);

    // 既存のセクションを取得
    const existingSection = existingOutline.find(s => s.title === targetSection);
    if (!existingSection) {
      console.error(`[generatePointsFromComment] セクション "${targetSection}" が見つかりません`);
      return {
        updatedPoints: [],
        addedPoints: [],
        modifiedPoints: [],
        removedPointIndices: [],
        isFallback: true,
      };
    }

    const existingPoints = existingSection.points || [];
    let updatedPoints = [...existingPoints];
    const addedPoints: string[] = [];
    const modifiedPoints: Array<{ before: string; after: string }> = [];
    const removedPointIndices: number[] = [];

    // テンプレートから新しい論点を取得
    const fieldTemplate = templates[field];
    if (!fieldTemplate) {
      console.error(`[generatePointsFromComment] 分野 "${field}" のテンプレートが見つかりません`);
      return {
        updatedPoints,
        addedPoints,
        modifiedPoints,
        removedPointIndices,
        isFallback: true,
      };
    }

    const sectionMap: Record<string, keyof Omit<FieldTemplate, 'coreQuestion'>> = {
      '序論': 'intro',
      '本論': 'body',
      '結論': 'conclusion',
    };

    const sectionKey = sectionMap[targetSection];
    if (!sectionKey || !fieldTemplate[sectionKey]) {
      return {
        updatedPoints,
        addedPoints,
        modifiedPoints,
        removedPointIndices,
        isFallback: true,
      };
    }

    const items = fieldTemplate[sectionKey] as TemplateItem[];
    const allPoints = getTemplateItems(items, instructorType, analysis.intent);

    // コメントの意図に応じて処理
    switch (analysis.intent) {
      case 'add':
        // 新しい論点を追加
        const newPoints = filterExistingPoints(allPoints, existingPoints);
        // コメントのキーワードに関連する論点を優先
        const relevantPoints = newPoints.filter(point => {
          return analysis.targetKeywords.some(keyword => point.includes(keyword));
        });
        const pointsToAdd = relevantPoints.length > 0 
          ? relevantPoints.slice(0, 2) 
          : newPoints.slice(0, 2);
        
        updatedPoints = [...updatedPoints, ...pointsToAdd];
        addedPoints.push(...pointsToAdd);
        break;

      case 'modify':
        // 特定の論点を修正（targetPointIndexが指定されている場合）
        if (targetPointIndex !== undefined && targetPointIndex < existingPoints.length) {
          const pointToModify = existingPoints[targetPointIndex];
          // キーワードに関連する新しい論点で置き換え
          const replacementOptions = allPoints.filter(p => 
            analysis.targetKeywords.some(k => p.includes(k)) && 
            calculateSimilarity(p, pointToModify) < 0.7
          );
          
          if (replacementOptions.length > 0) {
            const replacement = replacementOptions[0];
            updatedPoints[targetPointIndex] = replacement;
            modifiedPoints.push({ before: pointToModify, after: replacement });
          }
        } else {
          // 全体を強化（新しい論点を追加）
          const strengthenPoints = filterExistingPoints(allPoints, existingPoints);
          const selectedPoints = strengthenPoints.slice(0, 2);
          updatedPoints = [...updatedPoints, ...selectedPoints];
          addedPoints.push(...selectedPoints);
        }
        break;

      case 'delete':
        // 指定された論点を削除
        if (targetPointIndex !== undefined && targetPointIndex < existingPoints.length) {
          updatedPoints.splice(targetPointIndex, 1);
          removedPointIndices.push(targetPointIndex);
        }
        break;

      case 'strengthen':
        // 既存論点を強化（新しい論点を追加して補強）
        const strengthenPoints = filterExistingPoints(allPoints, existingPoints);
        // コメントのキーワードに関連する論点を優先
        const strengthenRelevant = strengthenPoints.filter(point => {
          return analysis.targetKeywords.some(keyword => point.includes(keyword));
        });
        const strengthenSelected = strengthenRelevant.length > 0
          ? strengthenRelevant.slice(0, 2)
          : strengthenPoints.slice(0, 2);
        
        updatedPoints = [...updatedPoints, ...strengthenSelected];
        addedPoints.push(...strengthenSelected);
        break;
    }

    return {
      updatedPoints,
      addedPoints,
      modifiedPoints,
      removedPointIndices,
      isFallback: false,
    };
  } catch (error) {
    console.error('[generatePointsFromComment] エラーが発生しました:', error);
    
    // フォールバック: 既存の論点をそのまま返す
    const existingSection = params.existingOutline.find(s => s.title === params.targetSection);
    return {
      updatedPoints: existingSection?.points || [],
      addedPoints: [],
      modifiedPoints: [],
      removedPointIndices: [],
      isFallback: true,
    };
  }
}
