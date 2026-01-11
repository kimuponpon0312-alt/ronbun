// 新機能の追加実装
// このファイルは段階的にpage.tsxに統合される予定の機能です

import type { Field, InstructorType } from './actions/generatePoints';
import type { GenerationIntent } from './actions/generateAdditionalPoints';
import type { CommentType } from './actions/generatePointsFromComment';
import type { PointTag, TaggedPoint } from './utils/classifyPoints';
import type { ReportOutline, Section } from './utils/diffOutline';

// コメント反映型生成のハンドラー
export async function handleCommentGeneration(
  field: Field,
  existingOutline: Section[],
  commentSection: '序論' | '本論' | '結論',
  commentText: string,
  commentType: CommentType,
  question: string,
  instructorType: InstructorType,
  targetPointIndex?: number
) {
  const { generatePointsFromComment } = await import('./actions/generatePointsFromComment');
  
  const result = await generatePointsFromComment({
    field,
    existingOutline,
    targetSection: commentSection,
    commentText,
    commentType,
    question,
    instructorType,
    targetPointIndex,
  });

  return result;
}

// 段階的アウトライン拡張のハンドラー
export async function handleLevelExpansion(
  field: Field,
  currentOutline: ReportOutline,
  targetLevel: 1 | 2 | 3,
  question: string,
  instructorType: InstructorType
) {
  // Level 3の実装（具体例・引用・脚注）は後で追加
  if (targetLevel === 3) {
    // 現在はLevel 2まで対応
    return {
      ...currentOutline,
      level: 2,
    };
  }
  
  return {
    ...currentOutline,
    level: targetLevel,
  };
}

// 履歴差分表示のハンドラー
export function handleDiffDisplay(
  oldOutline: ReportOutline,
  newOutline: ReportOutline
) {
  const { diffOutline } = require('./utils/diffOutline');
  return diffOutline(oldOutline, newOutline);
}

// セクション単位再生成のハンドラー（置き換えモード対応）
export async function handleSectionRegenerate(
  field: Field,
  existingOutline: Section[],
  targetSection: '序論' | '本論' | '結論',
  mode: 'add' | 'replace',
  intent: GenerationIntent,
  question: string,
  instructorType: InstructorType,
  commentText?: string
) {
  const { generateAdditionalPoints } = await import('./actions/generateAdditionalPoints');
  
  const result = await generateAdditionalPoints({
    field,
    existingOutline,
    targetSection,
    intent,
    question,
    instructorType,
  });

  if (mode === 'replace') {
    // 既存論点を置き換える
    const updatedSections = existingOutline.map((section) => {
      if (section.title === targetSection) {
        return {
          ...section,
          points: result.newPoints || [],
        };
      }
      return section;
    });
    return { sections: updatedSections, newPoints: result.newPoints };
  } else {
    // 既存論点に追加（既存のロジック）
    const updatedSections = existingOutline.map((section) => {
      if (section.title === targetSection) {
        const existingPoints = section.points || [];
        const newPoints = result.newPoints.filter(
          (newPoint) => !existingPoints.some((existing) => existing === newPoint)
        );
        return {
          ...section,
          points: [...existingPoints, ...newPoints],
        };
      }
      return section;
    });
    return { sections: updatedSections, newPoints: result.newPoints };
  }
}
