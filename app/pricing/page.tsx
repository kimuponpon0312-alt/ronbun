'use client';

import Link from 'next/link';

export default function PricingPage() {
  const features = {
    free: [
      '1日5回までの生成',
      '基本的なレポート構成',
      '3つのセクション（序論・本論・結論）',
      '基本的な分野サポート',
      '理論重視型のみ',
    ],
    pro: [
      '無制限生成',
      '高度なレポート構成',
      'カスタムセクション数',
      '全分野サポート（法学・経済学・文学・社会学）',
      '4種類の指導教員タイプ',
      '優先サポート',
      '最新機能への早期アクセス',
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AXON 料金プラン
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            あなたの学術レポート作成を支援します。学生の皆様に最適なプランをお選びください。
          </p>
        </div>

        {/* プラン比較表 */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Free プラン */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 relative">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Free</h2>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600 ml-2">/月</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">個人利用向け</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/"
              className="block w-full bg-gray-900 text-white text-center py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              今すぐ始める
            </Link>
          </div>

          {/* Pro プラン */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl border-2 border-purple-500 p-8 relative transform md:scale-105">
            {/* 人気バッジ */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                おすすめ
              </span>
            </div>

            <div className="mb-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Pro</h2>
              <div className="flex items-baseline">
                <span className="text-4xl font-bold">$9.90</span>
                <span className="text-purple-200 ml-2">/月</span>
              </div>
              <p className="text-sm text-purple-200 mt-2">学生・研究者向け</p>
            </div>

            <ul className="space-y-4 mb-8 text-white">
              {features.pro.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="block w-full bg-white text-purple-600 text-center py-3 px-6 rounded-lg font-bold hover:bg-gray-50 transition-colors cursor-not-allowed opacity-90"
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* 機能比較表 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            詳細比較
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">
                    機能
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">
                    Free
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-purple-600">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-6 text-gray-700">1日の生成回数</td>
                  <td className="py-4 px-6 text-center text-gray-600">5回まで</td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    無制限
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 text-gray-700">対応分野</td>
                  <td className="py-4 px-6 text-center text-gray-600">全分野</td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    全分野
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-gray-700">指導教員タイプ</td>
                  <td className="py-4 px-6 text-center text-gray-600">
                    理論重視型のみ
                  </td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    全4種類
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 text-gray-700">セクション数</td>
                  <td className="py-4 px-6 text-center text-gray-600">3セクション</td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    カスタム可能
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-gray-700">AI生成</td>
                  <td className="py-4 px-6 text-center text-gray-600">✓</td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    ✓
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 text-gray-700">フォールバック論点</td>
                  <td className="py-4 px-6 text-center text-gray-600">✓</td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    ✓
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-gray-700">サポート</td>
                  <td className="py-4 px-6 text-center text-gray-600">-</td>
                  <td className="py-4 px-6 text-center text-purple-600 font-medium">
                    優先サポート
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ セクション */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            よくある質問
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Freeプランから始められますか？
              </h3>
              <p className="text-gray-600">
                はい、Freeプランはすぐにご利用いただけます。アカウント登録は不要で、そのままレポート構成の生成を開始できます。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Proプランはいつ利用可能になりますか？
              </h3>
              <p className="text-gray-600">
                Proプランは現在準備中です。詳細は「Coming Soon」と表示されているボタンからお知らせをお待ちください。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                学生割引はありますか？
              </h3>
              <p className="text-gray-600">
                Proプランは学生・研究者向けに設計されており、$9.90/月の価格で提供予定です。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                プランの途中変更は可能ですか？
              </h3>
              <p className="text-gray-600">
                はい、いつでもFreeプランとProプランの切り替えが可能です。課金は実際の利用に基づいて行われます。
              </p>
            </div>
          </div>
        </div>

        {/* フッターCTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block text-purple-600 hover:text-purple-700 font-medium"
          >
            ← トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
