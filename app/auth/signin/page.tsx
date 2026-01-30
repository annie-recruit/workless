import { Metadata } from 'next';
import SignInClient from '@/components/auth/SignInClient';

export const metadata: Metadata = {
  title: 'WORKLESS 로그인 - Google 계정으로 시작하기',
  description: 'WORKLESS에 Google 계정으로 로그인하고 무한 캔버스에서 아이디어를 정리하세요. Gmail 연동으로 이메일을 자동으로 메모로 변환하고 AI 어시스턴트와 함께 작업하세요.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://workless.me/auth/signin',
  },
};

export default function SignInPage() {
  return <SignInClient />;
}
