import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} WORKLESS. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              서비스 약관
            </Link>
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              개인정보처리방침
            </Link>
            <a
              href="mailto:rkdhs326@gmail.com"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              문의하기
            </a>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Icons by{' '}
            <a
              href="https://streamlinehq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              Streamline
            </a>
            {' '}licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              CC BY 4.0
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
