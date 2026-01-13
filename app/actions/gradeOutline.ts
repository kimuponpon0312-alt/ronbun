'use server';

import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;

export type Field = 'literature' | 'law' | 'philosophy' | 'sociology' | 'history';

export type ReportOutline = {
  sections: Array<{
    title: string;
    points: string[];
  }>;
  coreQuestion?: string;
};

export type GradeResult = {
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  comment: string;
  missingPoints: string[];
};

const FIELD_DISPLAY_NAMES: Record<Field, string> = {
  literature: '文学',
  law: '法学',
  philosophy: '哲学',
  sociology: '社会学',
  history: '歴史学',
};

// ダミーデータを返す関数（開発用）
function getDummyGradeResult(): GradeResult {
  return {
    grade: 'B',
    comment: '構成は基本的な要素を押さえていますが、理論的な深掘りが不足しています。もう少し先行研究との対話を意識してください。',
    missingPoints: [
      '先行研究の批判的検討',
      '理論的フレームワークの明確化',
    ],
  };
}

export async function gradeOutline(
  field: Field,
  question: string,
  outline: ReportOutline
): Promise<GradeResult | null> {
  // OpenAI APIキーの確認
  if (!openaiApiKey) {
    console.warn('[gradeOutline] OPENAI_API_KEYが設定されていません。ダミーデータを返します。');
    return getDummyGradeResult();
  }

  try {
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // 構成をテキストに変換
    const outlineText = outline.sections
      .map((section) => {
        const pointsText = section.points.map((point, index) => `${index + 1}. ${point}`).join('\n');
        return `【${section.title}】\n${pointsText}`;
      })
      .join('\n\n');

    const fieldName = FIELD_DISPLAY_NAMES[field];
    const prompt = `あなたは${fieldName}の厳格な教授です。学生のレポート構成案を厳しく評価してください。

【課題文】
${question}

【レポート構成】
${outlineText}

以下のJSON形式で評価結果を返してください：
{
  "grade": "S" | "A" | "B" | "C" | "D"（S=最高、D=不可）,
  "comment": "辛口のフィードバックコメント（100文字程度）",
  "missingPoints": ["不足している視点1", "不足している視点2"]
}

JSONのみを返してください。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは${fieldName}の厳格な教授です。学生のレポート構成を厳しく、しかし建設的に評価してください。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error('[gradeOutline] レスポンスが空です');
      return getDummyGradeResult();
    }

    try {
      const result = JSON.parse(responseText) as GradeResult;
      
      // バリデーション
      if (!['S', 'A', 'B', 'C', 'D'].includes(result.grade)) {
        console.error('[gradeOutline] 不正な評価グレード:', result.grade);
        return getDummyGradeResult();
      }

      if (!result.comment || !Array.isArray(result.missingPoints)) {
        console.error('[gradeOutline] 不正なレスポンス形式');
        return getDummyGradeResult();
      }

      return result;
    } catch (parseError) {
      console.error('[gradeOutline] JSONパースエラー:', parseError);
      console.error('[gradeOutline] レスポンステキスト:', responseText);
      return getDummyGradeResult();
    }
  } catch (error) {
    console.error('[gradeOutline] エラーが発生しました:', error);
    if (error instanceof Error) {
      console.error('[gradeOutline] エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    } else {
      console.error('[gradeOutline] エラーオブジェクト:', JSON.stringify(error, null, 2));
    }
    return getDummyGradeResult();
  }
}
