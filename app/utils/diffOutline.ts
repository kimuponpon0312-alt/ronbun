// レポート構成の差分計算ユーティリティ

export type Section = {
  title: string;
  points: string[];
  isFallback?: boolean;
};

export type ReportOutline = {
  sections: Section[];
  coreQuestion?: string;
};

export type OutlineDiff = {
  sectionTitle: string;
  addedPoints: string[];
  removedPoints: string[];
  modifiedPoints: Array<{ before: string; after: string; index: number }>;
};

export type OutlineDiffResult = {
  diffs: OutlineDiff[];
  hasChanges: boolean;
};

// 文字列の類似度を計算（Jaccard係数）
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

// 2つのレポート構成の差分を計算
export function diffOutline(
  oldOutline: ReportOutline,
  newOutline: ReportOutline
): OutlineDiffResult {
  const diffs: OutlineDiff[] = [];
  let hasChanges = false;

  // セクションごとに差分を計算
  oldOutline.sections.forEach((oldSection, sectionIndex) => {
    const newSection = newOutline.sections.find(s => s.title === oldSection.title);
    
    if (!newSection) {
      // セクションが削除された場合
      diffs.push({
        sectionTitle: oldSection.title,
        addedPoints: [],
        removedPoints: oldSection.points,
        modifiedPoints: [],
      });
      hasChanges = true;
      return;
    }

    const oldPoints = oldSection.points || [];
    const newPoints = newSection.points || [];
    
    const addedPoints: string[] = [];
    const removedPoints: string[] = [];
    const modifiedPoints: Array<{ before: string; after: string; index: number }> = [];

    // 新しい論点を検出（類似度が低いもの）
    newPoints.forEach(newPoint => {
      const isExisting = oldPoints.some(oldPoint => {
        const similarity = calculateSimilarity(newPoint, oldPoint);
        return similarity > 0.7; // 70%以上類似していれば既存とみなす
      });

      if (!isExisting) {
        // 既存の論点に似ているが、修正されている可能性をチェック
        const similarOldPoint = oldPoints.find(oldPoint => {
          const similarity = calculateSimilarity(newPoint, oldPoint);
          return similarity > 0.3 && similarity <= 0.7; // 30-70%の類似度は修正とみなす
        });

        if (similarOldPoint) {
          modifiedPoints.push({
            before: similarOldPoint,
            after: newPoint,
            index: oldPoints.indexOf(similarOldPoint),
          });
        } else {
          addedPoints.push(newPoint);
        }
      }
    });

    // 削除された論点を検出
    oldPoints.forEach(oldPoint => {
      const isRemaining = newPoints.some(newPoint => {
        const similarity = calculateSimilarity(newPoint, oldPoint);
        return similarity > 0.7;
      });

      if (!isRemaining) {
        // 修正された可能性をチェック
        const wasModified = modifiedPoints.some(mp => mp.before === oldPoint);
        if (!wasModified) {
          removedPoints.push(oldPoint);
        }
      }
    });

    if (addedPoints.length > 0 || removedPoints.length > 0 || modifiedPoints.length > 0) {
      diffs.push({
        sectionTitle: oldSection.title,
        addedPoints,
        removedPoints,
        modifiedPoints,
      });
      hasChanges = true;
    }
  });

  // 新しく追加されたセクションを検出
  newOutline.sections.forEach(newSection => {
    const oldSection = oldOutline.sections.find(s => s.title === newSection.title);
    if (!oldSection && (newSection.points || []).length > 0) {
      diffs.push({
        sectionTitle: newSection.title,
        addedPoints: newSection.points || [],
        removedPoints: [],
        modifiedPoints: [],
      });
      hasChanges = true;
    }
  });

  return {
    diffs,
    hasChanges,
  };
}
