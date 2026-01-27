import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 - Workless",
  description: "Workless 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2">
            ← 홈으로 돌아가기
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">개인정보처리방침</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <p className="text-slate-400 mb-6">
              <strong>최종 업데이트:</strong> 2026년 1월 27일
            </p>
            <p className="text-slate-300">
              Workless("서비스", "우리", "저희")는 사용자의 개인정보 보호를 매우 중요하게 생각합니다. 
              본 개인정보처리방침은 Workless가 수집하는 정보, 사용 방법, 보호 방법에 대해 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. 수집하는 정보</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">1.1 Google 계정 정보</h3>
            <p className="text-slate-300 mb-4">
              Google OAuth를 통해 다음 정보를 수집합니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>이메일 주소</li>
              <li>이름</li>
              <li>프로필 사진</li>
              <li>Google 계정 ID</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.2 Gmail 데이터</h3>
            <p className="text-slate-300 mb-4">
              사용자가 Gmail 연동을 선택한 경우, 다음 Gmail 데이터에 접근합니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Gmail 메시지 읽기 권한 (읽기 전용)</li>
              <li>"Workless" 라벨이 지정된 이메일의 제목, 발신자, 본문 내용</li>
              <li>이메일 메타데이터 (날짜, 메시지 ID 등)</li>
            </ul>
            <p className="text-slate-300 mt-4">
              <strong>중요:</strong> Workless는 Gmail 데이터를 <strong>읽기 전용</strong>으로만 사용하며, 
              이메일을 보내거나 수정하지 않습니다.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">1.3 사용자 생성 콘텐츠</h3>
            <p className="text-slate-300 mb-4">
              서비스 사용 중 생성하는 정보:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>메모 및 노트</li>
              <li>프로젝트 정보</li>
              <li>목표 및 작업 항목</li>
              <li>기타 사용자가 입력한 콘텐츠</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.4 기술 정보</h3>
            <p className="text-slate-300 mb-4">
              서비스 제공을 위해 자동으로 수집되는 정보:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>IP 주소</li>
              <li>브라우저 유형 및 버전</li>
              <li>디바이스 정보</li>
              <li>서비스 사용 로그</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. 정보 사용 목적</h2>
            <p className="text-slate-300 mb-4">
              수집한 정보는 다음 목적으로 사용됩니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>서비스 제공:</strong> 개인 비서 기능 제공 및 Gmail 연동 서비스 운영</li>
              <li><strong>콘텐츠 분석:</strong> Gmail에서 가져온 이메일을 AI로 분석하여 메모로 변환</li>
              <li><strong>사용자 인증:</strong> Google 계정을 통한 로그인 및 계정 관리</li>
              <li><strong>서비스 개선:</strong> 사용자 경험 개선 및 기능 개발</li>
              <li><strong>고객 지원:</strong> 문의사항 응대 및 기술 지원</li>
              <li><strong>보안:</strong> 부정 사용 방지 및 보안 강화</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. 정보 공유 및 제공</h2>
            <p className="text-slate-300 mb-4">
              Workless는 사용자의 개인정보를 제3자에게 판매하지 않습니다. 다음 경우에만 정보를 공유할 수 있습니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>서비스 제공자:</strong> OpenAI API 등 서비스 운영을 위한 제3자 서비스 제공자 (데이터 처리 목적으로만 사용)</li>
              <li><strong>법적 요구사항:</strong> 법원의 명령, 법률, 규정 준수를 위해 필요한 경우</li>
              <li><strong>사용자 동의:</strong> 사용자가 명시적으로 동의한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. 데이터 보관 및 삭제</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">4.1 보관 기간</h3>
            <p className="text-slate-300 mb-4">
              사용자의 개인정보는 서비스 이용 기간 동안 보관되며, 계정 삭제 시 즉시 삭제됩니다.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">4.2 데이터 삭제 권리</h3>
            <p className="text-slate-300 mb-4">
              사용자는 언제든지 다음 권리를 행사할 수 있습니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>개인정보 열람 요청</li>
              <li>개인정보 수정 요청</li>
              <li>개인정보 삭제 요청</li>
              <li>계정 삭제 요청</li>
              <li>Gmail 연동 해제</li>
            </ul>
            <p className="text-slate-300 mt-4">
              데이터 삭제를 원하시면 다음 이메일로 문의해주세요:{" "}
              <a href="mailto:support@workless.app" className="text-blue-400 hover:text-blue-300">
                support@workless.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. 보안 조치</h2>
            <p className="text-slate-300 mb-4">
              Workless는 사용자 정보 보호를 위해 다음과 같은 보안 조치를 취하고 있습니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>데이터 암호화 전송 (HTTPS)</li>
              <li>안전한 데이터 저장</li>
              <li>접근 제어 및 인증 시스템</li>
              <li>정기적인 보안 점검</li>
            </ul>
            <p className="text-slate-300 mt-4">
              <strong>중요:</strong> Gmail 데이터는 읽기 전용으로만 사용되며, 
              사용자가 명시적으로 요청한 경우에만 접근합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. 쿠키 및 추적 기술</h2>
            <p className="text-slate-300 mb-4">
              Workless는 서비스 제공을 위해 세션 쿠키를 사용합니다. 
              이 쿠키는 사용자 인증 및 세션 관리 목적으로만 사용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. 제3자 서비스</h2>
            <p className="text-slate-300 mb-4">
              Workless는 다음 제3자 서비스를 사용합니다:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li><strong>Google OAuth:</strong> 사용자 인증 및 Gmail API 접근</li>
              <li><strong>OpenAI API:</strong> AI 기반 콘텐츠 분석 및 요약</li>
            </ul>
            <p className="text-slate-300 mt-4">
              이러한 서비스 제공자들은 자체 개인정보처리방침을 가지고 있으며, 
              해당 정책에 따라 정보를 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. 아동의 개인정보 보호</h2>
            <p className="text-slate-300 mb-4">
              Workless는 만 13세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다. 
              만 13세 미만 아동의 정보가 수집된 것으로 확인되면 즉시 삭제하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. 개인정보처리방침 변경</h2>
            <p className="text-slate-300 mb-4">
              Workless는 필요에 따라 본 개인정보처리방침을 업데이트할 수 있습니다. 
              중요한 변경사항이 있는 경우 서비스 내 공지 또는 이메일로 알려드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. 문의사항</h2>
            <p className="text-slate-300 mb-4">
              개인정보처리방침에 대한 질문이나 요청사항이 있으시면 다음으로 연락해주세요:
            </p>
            <div className="bg-slate-900 p-4 rounded-lg mt-4">
              <p className="text-slate-300">
                <strong>이메일:</strong>{" "}
                <a href="mailto:support@workless.app" className="text-blue-400 hover:text-blue-300">
                  support@workless.app
                </a>
              </p>
            </div>
          </section>

          <section className="mt-12 pt-8 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              본 개인정보처리방침은 2026년 1월 27일부터 적용됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
