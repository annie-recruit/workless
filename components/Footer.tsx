import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Workless. All rights reserved.
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
              href="mailto:support@workless.app"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              문의하기
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
