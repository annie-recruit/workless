'use client';

import type { Metadata } from "next";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";

export default function TermsPage() {
  const { language, t } = useLanguage();

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto font-galmuri11">
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2">
            ← {t('common.backToHome')}
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">{t('terms.title')}</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          {language === 'ko' ? (
            <>
              <section>
                <p className="text-slate-400 mb-6">
                  <strong>최종 업데이트:</strong> 2026년 1월 27일
                </p>
                <p className="text-slate-300">
                  본 서비스 약관("약관")은 Workless("서비스", "우리", "저희")의 이용과 관련하여 
                  사용자("귀하", "사용자")와 Workless 간의 권리, 의무 및 책임사항을 규정합니다. 
                  본 서비스를 이용하시면 본 약관에 동의하는 것으로 간주됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. 서비스 이용</h2>
                <p className="text-slate-300 mb-4">
                  Workless는 개인 비서 및 워크스페이스 서비스를 제공합니다. 본 서비스를 이용하기 위해서는:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Google 계정을 통한 로그인이 필요합니다</li>
                  <li>본 약관 및 개인정보처리방침에 동의해야 합니다</li>
                  <li>법적으로 서비스를 이용할 수 있는 권한이 있어야 합니다</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">2. 사용자 계정</h2>
                <p className="text-slate-300 mb-4">
                  사용자는 다음 사항에 대해 책임을 집니다:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>계정 정보의 정확성 유지</li>
                  <li>계정 보안 유지 (비밀번호 및 접근 권한 관리)</li>
                  <li>계정을 통한 모든 활동에 대한 책임</li>
                  <li>계정이 무단 사용되었을 경우 즉시 Workless에 통지</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. 서비스 이용 규칙</h2>
                <p className="text-slate-300 mb-4">
                  사용자는 다음 행위를 해서는 안 됩니다:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>법령, 공공질서 또는 미풍양속에 위배되는 행위</li>
                  <li>타인의 권리나 명예를 침해하거나 타인에게 불편을 주는 행위</li>
                  <li>서비스의 안정적 운영을 방해하거나 서버에 과부하를 주는 행위</li>
                  <li>바이러스, 악성 코드 등을 업로드하거나 전송하는 행위</li>
                  <li>서비스를 상업적 목적으로 무단 사용하는 행위</li>
                  <li>타인의 개인정보를 무단으로 수집, 이용하거나 유출하는 행위</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">4. 지적재산권</h2>
                <p className="text-slate-300 mb-4">
                  Workless 서비스에 포함된 모든 콘텐츠, 디자인, 로고, 텍스트, 그래픽, 소프트웨어는 
                  Workless 또는 해당 라이선스 제공자의 소유입니다. 사용자는 본 서비스를 개인적, 
                  비상업적 목적으로만 사용할 수 있으며, 사전 서면 동의 없이 복제, 배포, 수정할 수 없습니다.
                </p>
                <p className="text-slate-300 mt-4">
                  사용자가 생성한 콘텐츠(메모, 노트 등)에 대한 권리는 사용자에게 있으며, 
                  Workless는 서비스 제공을 위해 필요한 범위 내에서만 해당 콘텐츠를 사용합니다.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">5. 서비스 제공 및 변경</h2>
                <p className="text-slate-300 mb-4">
                  Workless는 다음과 같은 경우 서비스 제공을 중단하거나 변경할 수 있습니다:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>서비스 점검, 보수, 교체 등 기술적 필요가 있는 경우</li>
                  <li>천재지변, 전쟁, 폭동 등 불가항력적인 사유가 있는 경우</li>
                  <li>기타 서비스 운영상 필요한 경우</li>
                </ul>
                <p className="text-slate-300 mt-4">
                  서비스 중단 시 사전 공지를 원칙으로 하되, 긴급한 경우 사후 공지할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">6. 면책 조항</h2>
                <p className="text-slate-300 mb-4">
                  Workless는 다음에 대해 책임을 지지 않습니다:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>서비스 이용 중 발생한 데이터 손실, 오류, 중단 등</li>
                  <li>사용자의 귀책사유로 인한 서비스 이용 장애</li>
                  <li>제3자 서비스(Google OAuth, OpenAI API 등)의 장애로 인한 서비스 중단</li>
                  <li>사용자가 생성한 콘텐츠의 정확성, 완전성, 유용성</li>
                  <li>사용자 간 또는 사용자와 제3자 간의 분쟁</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">7. 서비스 이용료</h2>
                <p className="text-slate-300 mb-4">
                  현재 Workless는 무료 서비스를 제공하고 있습니다. 향후 유료 서비스가 도입될 경우 
                  사전 공지 후 시행하며, 기존 무료 사용자에게는 적절한 전환 기간을 제공합니다.
                </p>
                <p className="text-slate-300 mt-4">
                  <strong>참고:</strong> 사용자는 OpenAI API 등 제3자 서비스 이용에 따른 비용을 
                  직접 부담해야 할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">8. 계정 해지</h2>
                <p className="text-slate-300 mb-4">
                  사용자는 언제든지 계정을 삭제하고 서비스 이용을 중단할 수 있습니다. 
                  계정 삭제 시 다음 사항이 적용됩니다:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>계정과 연관된 모든 데이터가 삭제됩니다</li>
                  <li>삭제된 데이터는 복구할 수 없습니다</li>
                  <li>계정 삭제 후에도 본 약관의 일부 조항은 계속 적용될 수 있습니다</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">9. 약관 변경</h2>
                <p className="text-slate-300 mb-4">
                  Workless는 필요에 따라 본 약관을 변경할 수 있습니다. 중요한 변경사항이 있는 경우 
                  서비스 내 공지 또는 이메일로 알려드립니다. 변경된 약관은 공지 후 7일 이후부터 
                  효력을 발생합니다.
                </p>
                <p className="text-slate-300 mt-4">
                  변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. 준거법 및 관할법원</h2>
                <p className="text-slate-300 mb-4">
                  본 약관은 대한민국 법률에 따라 해석되고 적용됩니다. 서비스 이용과 관련하여 
                  발생한 분쟁에 대해서는 대한민국 법원의 관할로 합니다.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">11. 문의사항</h2>
                <p className="text-slate-300 mb-4">
                  본 약관에 대한 질문이나 서비스 이용과 관련된 문의사항이 있으시면 다음으로 연락해주세요:
                </p>
                <div className="bg-slate-900 p-4 rounded-lg mt-4">
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
                  본 서비스 약관은 2026년 1월 27일부터 적용됩니다.
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
                  These Terms of Service ("Terms") govern the relationship between Workless ("Service", "we", "us") and the user ("you", "user") regarding the use of Workless. By using this service, you are deemed to have agreed to these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Use of Service</h2>
                <p className="text-slate-300 mb-4">
                  Workless provides personal assistant and workspace services. To use this service:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Login via Google account is required</li>
                  <li>You must agree to these Terms and the Privacy Policy</li>
                  <li>You must have the legal authority to use the service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">2. User Account</h2>
                <p className="text-slate-300 mb-4">
                  Users are responsible for:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Maintaining the accuracy of account information</li>
                  <li>Maintaining account security (password and access management)</li>
                  <li>Responsibility for all activities conducted through the account</li>
                  <li>Notifying Workless immediately if the account is used without authorization</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Rules of Conduct</h2>
                <p className="text-slate-300 mb-4">
                  Users shall not:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Violate laws, public order, or good customs</li>
                  <li>Infringe upon the rights or reputation of others or cause inconvenience</li>
                  <li>Interfere with the stable operation of the service or overload the server</li>
                  <li>Upload or transmit viruses or malicious code</li>
                  <li>Use the service for unauthorized commercial purposes</li>
                  <li>Collect, use, or leak personal information of others without authorization</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Intellectual Property</h2>
                <p className="text-slate-300 mb-4">
                  All content, design, logos, text, graphics, and software included in the Workless service are owned by Workless or its licensors. Users may use this service for personal, non-commercial purposes only, and may not reproduce, distribute, or modify it without prior written consent.
                </p>
                <p className="text-slate-300 mt-4">
                  Rights to user-generated content (memos, notes, etc.) belong to the user, and Workless uses such content only within the scope necessary to provide the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Provision and Modification of Service</h2>
                <p className="text-slate-300 mb-4">
                  Workless may suspend or modify the provision of the service in the following cases:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>When there is a technical need such as service inspection, repair, or replacement</li>
                  <li>When there are force majeure reasons such as natural disasters, war, or riots</li>
                  <li>When otherwise necessary for service operation</li>
                </ul>
                <p className="text-slate-300 mt-4">
                  In principle, prior notice will be given in case of service interruption, but post-notice may be given in urgent cases.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Disclaimer</h2>
                <p className="text-slate-300 mb-4">
                  Workless is not responsible for:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Data loss, errors, or interruptions occurring during service use</li>
                  <li>Service use obstacles caused by the user's fault</li>
                  <li>Service interruption due to failures in third-party services (Google OAuth, OpenAI API, etc.)</li>
                  <li>Accuracy, completeness, or usefulness of user-generated content</li>
                  <li>Disputes between users or between users and third parties</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Service Fees</h2>
                <p className="text-slate-300 mb-4">
                  Currently, Workless provides a free service. If paid services are introduced in the future, they will be implemented after prior notice, and a suitable transition period will be provided to existing free users.
                </p>
                <p className="text-slate-300 mt-4">
                  <strong>Note:</strong> Users may be responsible for costs associated with the use of third-party services such as OpenAI API.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">8. Account Termination</h2>
                <p className="text-slate-300 mb-4">
                  Users may delete their account and stop using the service at any time. Upon account deletion:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>All data associated with the account will be deleted</li>
                  <li>Deleted data cannot be recovered</li>
                  <li>Some provisions of these Terms may continue to apply even after account deletion</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">9. Amendments to Terms</h2>
                <p className="text-slate-300 mb-4">
                  Workless may amend these Terms as necessary. If there are important changes, we will notify you through service announcements or email. Amended Terms will take effect 7 days after the announcement.
                </p>
                <p className="text-slate-300 mt-4">
                  If you do not agree to the amended Terms, you may stop using the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. Governing Law and Jurisdiction</h2>
                <p className="text-slate-300 mb-4">
                  These Terms shall be interpreted and applied in accordance with the laws of the Republic of Korea. Any disputes arising in connection with the use of the service shall be subject to the jurisdiction of the courts of the Republic of Korea.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">11. Inquiries</h2>
                <p className="text-slate-300 mb-4">
                  If you have any questions about these Terms or inquiries related to service use, please contact us at:
                </p>
                <div className="bg-slate-900 p-4 rounded-lg mt-4">
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
                  These Terms of Service are effective as of January 27, 2026.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
