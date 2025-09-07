import { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Porkchop Workflow Validator
          </h1>
          <p className="text-gray-600">
            ワークフローファイルとコードファイルのセキュリティ・品質検証システム
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <Link
                to="/"
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentPath === '/'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ファイルアップロード
              </Link>
              <Link
                to="/log"
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentPath === '/log'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                検証ログ
              </Link>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        {children}

        {/* Features Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">セキュリティ検証</h3>
            </div>
            <p className="text-gray-600 text-sm">
              ハードコードされた認証情報、不適切な権限設定、インジェクション脆弱性などを検出
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">品質分析</h3>
            </div>
            <p className="text-gray-600 text-sm">
              非効率な処理、可読性の問題、エラーハンドリングの不備などを分析
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">ベストプラクティス</h3>
            </div>
            <p className="text-gray-600 text-sm">
              コーディング標準、保守性、ドキュメント化の観点からコードを評価
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}