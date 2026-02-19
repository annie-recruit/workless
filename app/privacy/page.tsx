'use client';

import type { Metadata } from "next";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";

export default function PrivacyPage() {
  const { language, t } = useLanguage();

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto font-galmuri11">
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2">
            ← {t('common.backToHome')}
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">{t('privacy.title')}</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          {language === 'ko' ? (
            <>
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

                <h3 className="text-xl font-medium mt-6 mb-3">1.2 사용자 생성 콘텐츠</h3>
                <p className="text-slate-300 mb-4">
                  서비스 사용 중 생성하는 정보:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>메모 및 노트</li>
                  <li>프로젝트 정보</li>
                  <li>목표 및 작업 항목</li>
                  <li>기타 사용자가 입력한 콘텐츠</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">1.3 기술 정보</h3>
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
                  <li><strong>서비스 제공:</strong> 개인 비서 기능 및 워크스페이스 제공</li>
                  <li><strong>사용자 인증:</strong> Google 계정을 통한 로그인 및 계정 관리</li>
                  <li><strong>서비스 개선:</strong> 사용자 경험 개선 및 기능 개발</li>
                  <li><strong>고객 지원:</strong> 문의사항 응대 및 기술 지원</li>
                  <li><strong>보안:</strong> 부정 사용 방지 및 보안 강화</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. 정보 공유 및 제공</h2>
                <p className="text-slate-300 mb-4">
                  Workless는 사용자의 개인정보를 제3자에게 판매하지 않습니다. 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다:
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-700 text-slate-300 mb-6">
                    <thead>
                      <tr className="bg-slate-900">
                        <th className="border border-slate-700 p-2">수탁자</th>
                        <th className="border border-slate-700 p-2">위탁 업무 내용</th>
                        <th className="border border-slate-700 p-2">개인정보 보유 및 이용 기간</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-700 p-2">OpenAI, Inc.</td>
                        <td className="border border-slate-700 p-2">AI 기반 콘텐츠 분석, 요약 및 질의응답 기능 제공</td>
                        <td className="border border-slate-700 p-2">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-700 p-2">Google LLC</td>
                        <td className="border border-slate-700 p-2">사용자 인증 (OAuth)</td>
                        <td className="border border-slate-700 p-2">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-medium mt-6 mb-3">3.1 개인정보의 국외 이전</h3>
                <p className="text-slate-300 mb-4">
                  서비스 제공을 위해 개인정보가 다음과 같이 국외로 이전될 수 있습니다:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li><strong>이전되는 국가:</strong> 미국</li>
                  <li><strong>이전 항목:</strong> 이메일 주소, 이름, 사용자 생성 콘텐츠(메모 등)</li>
                  <li><strong>이전 방법:</strong> API 호출 시 네트워크를 통한 전송</li>
                  <li><strong>이전 목적:</strong> 서비스 기능 제공(AI 분석 및 Google 인증)</li>
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
                </ul>
                <p className="text-slate-300 mt-4">
                  데이터 삭제를 원하시면 다음 이메일로 문의해주세요:{" "}
                  <a href="mailto:rkdhs326@gmail.com" className="text-blue-400 hover:text-blue-300">
                    rkdhs326@gmail.com
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
                  <li><strong>Google OAuth:</strong> 사용자 인증</li>
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
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. 개인정보 보호책임자 및 문의처</h2>
                <p className="text-slate-300 mb-4">
                  사용자의 개인정보를 보호하고 관련 불만을 처리하기 위하여 다음과 같이 개인정보 보호책임자를 지정하고 있습니다:
                </p>
                <div className="bg-slate-900 p-4 rounded-lg mt-4 space-y-2">
                  <p className="text-slate-300">
                    <strong>개인정보 보호책임자:</strong> Workless 운영팀
                  </p>
                  <p className="text-slate-300">
                    <strong>이메일:</strong>{" "}
                    <a href="mailto:rkdhs326@gmail.com" className="text-blue-400 hover:text-blue-300">
                      rkdhs326@gmail.com
                    </a>
                  </p>
                </div>
              </section>

              <section className="mt-12 pt-8 border-t border-slate-800">
                <p className="text-slate-400 text-sm">
                  본 개인정보처리방침은 2026년 1월 27일부터 적용됩니다.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <p className="text-slate-400 mb-6">
                  <strong>Last Updated:</strong> January 27, 2026
                </p>
                <p className="text-slate-300">
                  Workless ("Service", "we", "us") takes user privacy very seriously. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">1.1 Google Account Information</h3>
                <p className="text-slate-300 mb-4">
                  We collect the following information via Google OAuth:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Email address</li>
                  <li>Name</li>
                  <li>Profile picture</li>
                  <li>Google Account ID</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">1.2 User-Generated Content</h3>
                <p className="text-slate-300 mb-4">
                  Information you create while using the service:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Memos and notes</li>
                  <li>Project information</li>
                  <li>Goals and task items</li>
                  <li>Other content you input</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">1.3 Technical Information</h3>
                <p className="text-slate-300 mb-4">
                  Information automatically collected for service provision:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Service usage logs</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Purpose of Information Use</h2>
                <p className="text-slate-300 mb-4">
                  The collected information is used for:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li><strong>Service Provision:</strong> Providing personal assistant features and workspace services</li>
                  <li><strong>User Authentication:</strong> Login and account management via Google</li>
                  <li><strong>Service Improvement:</strong> Improving user experience and developing new features</li>
                  <li><strong>Customer Support:</strong> Responding to inquiries and providing technical support</li>
                  <li><strong>Security:</strong> Preventing unauthorized use and enhancing security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Information Sharing and Provision</h2>
                <p className="text-slate-300 mb-4">
                  Workless does not sell your personal information to third parties. We entrust the processing of personal information as follows:
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-700 text-slate-300 mb-6">
                    <thead>
                      <tr className="bg-slate-900">
                        <th className="border border-slate-700 p-2">Entrustee</th>
                        <th className="border border-slate-700 p-2">Content of Entrusted Work</th>
                        <th className="border border-slate-700 p-2">Retention and Use Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-700 p-2">OpenAI, Inc.</td>
                        <td className="border border-slate-700 p-2">Providing AI-based content analysis, summarization, and Q&A features</td>
                        <td className="border border-slate-700 p-2">Until account deletion or end of contract</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-700 p-2">Google LLC</td>
                        <td className="border border-slate-700 p-2">User authentication (OAuth)</td>
                        <td className="border border-slate-700 p-2">Until account deletion or end of contract</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-medium mt-6 mb-3">3.1 International Transfer of Personal Information</h3>
                <p className="text-slate-300 mb-4">
                  Information may be transferred abroad as follows:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li><strong>Recipient Country:</strong> USA</li>
                  <li><strong>Transferred Items:</strong> Email address, name, user-generated content (memos, etc.)</li>
                  <li><strong>Transfer Method:</strong> Transmission via network during API calls</li>
                  <li><strong>Transfer Purpose:</strong> Providing service features (AI analysis and Google authentication)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Retention and Deletion</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">4.1 Retention Period</h3>
                <p className="text-slate-300 mb-4">
                  Your information is retained for the duration of service use and deleted immediately upon account deletion.
                </p>

                <h3 className="text-xl font-medium mt-6 mb-3">4.2 Right to Data Deletion</h3>
                <p className="text-slate-300 mb-4">
                  You may exercise the following rights at any time:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Request to view personal information</li>
                  <li>Request to correct personal information</li>
                  <li>Request to delete personal information</li>
                  <li>Request for account deletion</li>
                </ul>
                <p className="text-slate-300 mt-4">
                  To request data deletion, please contact us at:{" "}
                  <a href="mailto:rkdhs326@gmail.com" className="text-blue-400 hover:text-blue-300">
                    rkdhs326@gmail.com
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Security Measures</h2>
                <p className="text-slate-300 mb-4">
                  Workless takes the following measures to protect user information:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Encrypted data transmission (HTTPS)</li>
                  <li>Secure data storage</li>
                  <li>Access control and authentication systems</li>
                  <li>Regular security audits</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Cookies and Tracking</h2>
                <p className="text-slate-300 mb-4">
                  Workless uses session cookies for service provision. These cookies are used solely for authentication and session management.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Third-Party Services</h2>
                <p className="text-slate-300 mb-4">
                  Workless uses the following third-party services:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li><strong>Google OAuth:</strong> User authentication</li>
                  <li><strong>OpenAI API:</strong> AI-based content analysis and summarization</li>
                </ul>
                <p className="text-slate-300 mt-4">
                  These providers have their own privacy policies and process information accordingly.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children's Privacy</h2>
                <p className="text-slate-300 mb-4">
                  Workless does not knowingly collect information from children under 13. If we find such information has been collected, we will delete it immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">9. Amendments to Privacy Policy</h2>
                <p className="text-slate-300 mb-4">
                  Workless may update this policy as necessary. Significant changes will be announced via the service or email.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. Privacy Officer and Contact</h2>
                <p className="text-slate-300 mb-4">
                  We have designated a privacy officer to protect your information and handle complaints:
                </p>
                <div className="bg-slate-900 p-4 rounded-lg mt-4 space-y-2">
                  <p className="text-slate-300">
                    <strong>Privacy Officer:</strong> Workless Team
                  </p>
                  <p className="text-slate-300">
                    <strong>Email:</strong>{" "}
                    <a href="mailto:rkdhs326@gmail.com" className="text-blue-400 hover:text-blue-300">
                      rkdhs326@gmail.com
                    </a>
                  </p>
                </div>
              </section>

              <section className="mt-12 pt-8 border-t border-slate-800">
                <p className="text-slate-400 text-sm">
                  This Privacy Policy is effective as of January 27, 2026.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
