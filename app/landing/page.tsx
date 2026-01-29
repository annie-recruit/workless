import { Metadata } from 'next';
import LandingClient from '@/components/landing/LandingClient';

export const metadata: Metadata = {
  title: 'WORKLESS - 비정형 애자일 워크스페이스 | AI 메모앱 & 무한 캔버스 화이트보드',
  description: 'WORKLESS는 무한 캔버스 화이트보드에서 아이디어를 자유롭게 메모하고 브레인스토밍하는 생산성 도구입니다. Gmail 연동으로 이메일을 자동 메모 변환, AI 어시스턴트가 지식 맥락을 연결해 업무 효율을 높입니다. Notion, Miro 대안 협업 도구.',
  keywords: ['메모앱', '메모 정리', '아이디어 정리', '화이트보드 앱', '무한 캔버스', '브레인스토밍 도구', '생산성 도구', '협업 도구', 'AI 메모', '지식 관리', 'PKM', '할일 관리', '업무 효율', 'Gmail 연동', 'Notion 대안', 'Miro 대안', '비정형 워크스페이스', '애자일'],
  alternates: {
    canonical: 'https://www.workless.me',
  },
  openGraph: {
    title: 'WORKLESS - 맥락을 구체화하는 비정형 워크스페이스',
    description: '무한 캔버스에서 아이디어를 자유롭게 배치하고, AI와 함께 생각의 흐름을 시각화하세요.',
    url: 'https://www.workless.me',
    siteName: 'WORKLESS',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'WORKLESS - 맥락을 구체화. 비정형 애자일 워크스페이스',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WORKLESS - 비정형 애자일 워크스페이스',
    description: '무한 캔버스에서 아이디어를 자유롭게 배치하고 연결하세요.',
    images: ['/opengraph-image'],
  },
};

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WORKLESS',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    description: '무한 캔버스 화이트보드에서 메모하고 브레인스토밍하는 AI 협업 도구. 아이디어 정리와 지식 관리를 한 곳에서.',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
