import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ブランド情報 */}
          <div>
            <div className="flex flex-col mb-4">
              <span className="text-2xl font-bold text-white mb-1">AXON</span>
              <span className="text-sm text-gray-400">文系レポ助</span>
            </div>
            <p className="text-sm text-gray-400 italic mb-4">
              書けないを、構造で解決する。
            </p>
            <p className="text-xs text-gray-500">
              学術レポート作成を支援するAIツール
            </p>
          </div>

          {/* リンク */}
          <div>
            <h3 className="text-white font-semibold mb-4">リンク</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ホーム
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  料金プラン
                </Link>
              </li>
            </ul>
          </div>

          {/* その他 */}
          <div>
            <h3 className="text-white font-semibold mb-4">その他</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>利用規約</li>
              <li>プライバシーポリシー</li>
              <li>お問い合わせ</li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2024 AXON (文系レポ助). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
