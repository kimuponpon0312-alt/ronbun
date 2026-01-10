'use server';

import OpenAI from 'openai';

export type Field = '法学' | '経済学' | '文学' | '社会学';
export type InstructorType = '厳格型' | '実務重視型' | '理論重視型' | '柔軟型';

export type GeneratePointsResult = {
  points: string[];
  isFallback: boolean;
};

// フォールバック論点テンプレート（分野 × セクション）
const fallbackPoints: Record<Field, Record<string, string[]>> = {
  法学: {
    序論: [
      '問題提起と研究背景の明確化',
      '研究の目的と意義の提示',
      '検討範囲の限定とアプローチ方法の説明',
    ],
    本論: [
      '関連する法規・条項の整理と解釈',
      '判例の整理と分析',
      '学説の対立点と主要な論点の整理',
      '現行制度における問題点の指摘',
    ],
    結論: [
      '検討結果の総括',
      '今後の課題と展望の提示',
    ],
  },
  経済学: {
    序論: [
      '研究テーマの設定と背景の説明',
      '問題意識と研究目的の明確化',
      '分析の視角とフレームワークの提示',
    ],
    本論: [
      '理論モデルの説明と先行研究の整理',
      'データの説明と分析手法の提示',
      '実証分析の結果と解釈',
      '政策的含意の検討',
    ],
    結論: [
      '分析結果の要約と主要な知見',
      '今後の研究課題と限界の提示',
    ],
  },
  文学: {
    序論: [
      '作家の文学史的位置づけ',
      '作品の執筆背景と時代的文脈',
      '問題意識と先行研究の整理',
      '本論で検討する視点の提示',
    ],
    本論: [
      '作品世界の主題分析',
      '文体・表現技法の特徴',
      '同時代文学との比較',
      '作品の構造と構成の分析',
      '作品の現代的意義',
    ],
    結論: [
      '分析結果の総括と解釈のまとめ',
      '作品の文学的意義の提示',
      '今後の研究課題',
    ],
  },
  社会学: {
    序論: [
      '社会的背景と問題の所在',
      '研究課題の設定と研究目的',
      '分析の枠組みと調査方法の説明',
    ],
    本論: [
      '先行研究の整理と理論的視座の明確化',
      '社会構造の分析とデータの解釈',
      '社会現象の意味づけと考察',
      '制度的含意の検討',
    ],
    結論: [
      '考察のまとめと主要な知見',
      '残された課題と今後の研究への示唆',
    ],
  },
};

// エラータイプを定義
class APIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIKeyError';
  }
}

class APICallError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'APICallError';
  }
}

class ResponseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseFormatError';
  }
}

// フォールバック論点を取得する関数
function getFallbackPoints(field: Field, sectionTitle: string): string[] {
  const fieldFallbacks = fallbackPoints[field];
  const points = fieldFallbacks[sectionTitle] || fieldFallbacks['本論'] || [];
  console.log(`[generatePoints] フォールバック論点を使用 - 分野: ${field}, セクション: ${sectionTitle}`);
  return points;
}

export async function generatePoints(
  field: Field,
  question: string,
  wordCount: number,
  sectionTitle: string,
  instructorType: InstructorType
): Promise<GeneratePointsResult> {
  // APIキーのチェックとログ（boolean形式）
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('[generatePoints] process.env.OPENAI_API_KEY (boolean):', !!apiKey);
  console.log('[generatePoints] process.env.OPENAI_API_KEY is undefined:', apiKey === undefined);
  
  if (!apiKey) {
    console.error('[generatePoints] OPENAI_API_KEY is not set - フォールバック論点を返します');
    return {
      points: getFallbackPoints(field, sectionTitle),
      isFallback: true,
    };
  }

  // OpenAI SDK v6.16.0 を使用
  // モデル: gpt-4o-mini (最新の推奨モデル)
  // API: chat.completions.create (Chat Completions API)
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // 指導教員タイプに応じた指示を追加
  const instructorGuidance = {
    厳格型: '厳密な論理構成を重視し、批判的検討を必ず含めてください。',
    実務重視型: '実務的な観点を重視し、具体的な事例やデータを意識した論点を提示してください。',
    理論重視型: '理論的フレームワークを重視し、概念的な分析や抽象的な考察を優先してください。',
    柔軟型: '創造的な視点を重視し、多様なアプローチや新しい観点を含めてください。',
  };

  const prompt = `あなたは${field}分野の学術レポート作成の専門家です。
以下の条件に基づいて、レポートの「${sectionTitle}」セクションで扱うべき論点を箇条書きで3〜5個提示してください。

【条件】
- 分野: ${field}
- 課題文: ${question}
- 目標字数: ${wordCount}字
- セクション: ${sectionTitle}
- 指導教員タイプ: ${instructorType}
- 指導教員タイプに応じた注意: ${instructorGuidance[instructorType]}

【要件】
- 日本語で記述
- 学術レポート向けの論点
- 各論点は簡潔に（1文程度）
- 箇条書き形式で返答
- 数字や記号の接頭辞（1. 2. など）は不要
- JSON配列形式ではなく、プレーンテキストで返答（各行が1つの論点）

【出力形式】
各論点を改行で区切ったテキストとして返してください。`;

  try {
    console.error('[generatePoints] OpenAI API呼び出し前 - セクション:', sectionTitle);
    console.error('[generatePoints] 使用SDK: openai (npm) v6.16.0');
    console.error('[generatePoints] 使用モデル: gpt-4o-mini');
    console.error('[generatePoints] API: chat.completions.create');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは${field}分野の学術レポート作成を支援する専門家です。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.error('[generatePoints] OpenAI API呼び出し後 - セクション:', sectionTitle);

    // レスポンス形式の検証
    if (!response || !response.choices || response.choices.length === 0) {
      console.error('[generatePoints] レスポンス形式不正 - choices が存在しないか空 - フォールバック論点を返します');
      console.error('[generatePoints] response:', JSON.stringify(response, null, 2));
      return {
        points: getFallbackPoints(field, sectionTitle),
        isFallback: true,
      };
    }

    const firstChoice = response.choices[0];
    if (!firstChoice || !firstChoice.message) {
      console.error('[generatePoints] レスポンス形式不正 - message が存在しない - フォールバック論点を返します');
      console.error('[generatePoints] firstChoice:', JSON.stringify(firstChoice, null, 2));
      return {
        points: getFallbackPoints(field, sectionTitle),
        isFallback: true,
      };
    }

    const content = firstChoice.message.content;
    
    if (content === null || content === undefined) {
      console.error('[generatePoints] レスポンス形式不正 - content が null または undefined - フォールバック論点を返します');
      return {
        points: getFallbackPoints(field, sectionTitle),
        isFallback: true,
      };
    }

    // 改行で分割し、空行や記号を除去
    const points = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        // 空行、数字+ピリオドで始まる行、記号のみの行を除外
        if (!line) return false;
        if (/^\d+[\.\)]/.test(line)) return false; // "1. " や "1) " で始まる
        if (/^[-\*•]/.test(line)) {
          // 箇条書き記号を除去
          return line.substring(1).trim().length > 0;
        }
        return line.length > 0;
      })
      .map((line) => line.replace(/^[-\*•]\s*/, '').trim()) // 箇条書き記号を除去
      .filter((line) => line.length > 0);

    if (points.length === 0) {
      console.error('[generatePoints] レスポンス形式不正 - パース後の論点が空 - フォールバック論点を返します');
      return {
        points: getFallbackPoints(field, sectionTitle),
        isFallback: true,
      };
    }

    return {
      points,
      isFallback: false,
    };
  } catch (error: unknown) {
    console.error('[generatePoints] OpenAI API Error - セクション:', sectionTitle);
    
    // API呼び出しエラー
    if (error instanceof OpenAI.APIError) {
      console.error('[generatePoints] OpenAI.APIError 発生 - フォールバック論点を返します');
      console.error('[generatePoints] error.message:', error.message);
      console.error('[generatePoints] error.status:', error.status);
      console.error('[generatePoints] error.response:', error.response);
      return {
        points: getFallbackPoints(field, sectionTitle),
        isFallback: true,
      };
    }
    
    // その他のエラー
    console.error('[generatePoints] 予期しないエラー - フォールバック論点を返します');
    console.error('[generatePoints] error.message:', error instanceof Error ? error.message : 'N/A');
    console.error('[generatePoints] error.response:', (error as any)?.response || 'N/A');
    console.error('[generatePoints] full error:', error);
    return {
      points: getFallbackPoints(field, sectionTitle),
      isFallback: true,
    };
  }
}
