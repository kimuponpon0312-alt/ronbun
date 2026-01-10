import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴとブランド名 */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                AXON
              </span>
              <span className="text-xs text-gray-500">文系レポ助</span>
            </div>
          </Link>

          {/* キャッチコピー */}
          <div className="hidden md:flex items-center">
            <p className="text-sm text-gray-600 italic">
              書けないを、構造で解決する。
            </p>
          </div>

          {/* ナビゲーション */}
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              ホーム
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
            >
              料金プラン
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
