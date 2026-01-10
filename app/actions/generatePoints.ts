'use server';

import OpenAI from 'openai';

type Field = '法学' | '経済学' | '文学' | '社会学';
type InstructorType = '厳格型' | '実務重視型' | '理論重視型' | '柔軟型';

export async function generatePoints(
  field: Field,
  question: string,
  wordCount: number,
  sectionTitle: string,
  instructorType: InstructorType
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

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

    const content = response.choices[0]?.message?.content || '';
    
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

    return points.length > 0 ? points : ['論点の生成に失敗しました'];
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('論点の生成に失敗しました');
  }
}
