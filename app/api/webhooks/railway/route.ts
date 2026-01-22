import { NextRequest, NextResponse } from 'next/server';

/**
 * Railway 배포 웹훅을 받아서 처리하는 엔드포인트
 * Railway에서 배포 실패 시 이 엔드포인트로 알림을 보냅니다.
 * GitHub API를 통해 자동으로 이슈를 생성합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Railway 웹훅 페이로드 파싱
    const deploymentStatus = body.deployment?.status || body.status;
    const buildLogs = body.build?.logs || body.logs || body.output || '';
    const errorMessage = body.error || body.message || '';
    const deploymentId = body.deployment?.id || body.id;
    
    // 배포 실패 감지
    if (deploymentStatus === 'FAILED' || deploymentStatus === 'ERROR' || deploymentStatus === 'FAILURE' || errorMessage) {
      console.error('🚨 Railway 배포 실패 감지:', {
        status: deploymentStatus,
        error: errorMessage,
        deploymentId,
        logsLength: buildLogs.length,
      });
      
      // GitHub API로 이슈 생성
      const githubToken = process.env.GITHUB_TOKEN;
      if (githubToken) {
        try {
          const errorLog = buildLogs || errorMessage || 'No error log available';
          
          // 일반적인 오류 패턴 분석
          const errorPatterns = [
            { pattern: /Cannot find name '(\w+)'/, fix: '변수/함수 이름 오타 또는 import 누락' },
            { pattern: /Type error: Cannot find name/, fix: '타입 정의 누락 또는 import 누락' },
            { pattern: /Module not found.*'(\w+)'/, fix: '패키지 설치 필요 또는 import 경로 오류' },
            { pattern: /is not defined/, fix: '변수/함수 정의 누락' },
            { pattern: /Unexpected token/, fix: '문법 오류 (괄호, 세미콜론 등)' },
            { pattern: /Property '(\w+)' does not exist/, fix: '타입 정의에 속성 추가 필요' },
          ];
          
            const detectedIssues: string[] = [];
          for (const { pattern, fix } of errorPatterns) {
            const match = errorLog.match(pattern);
            if (match) {
              detectedIssues.push(`- **${match[0]}**: ${fix}`);
            }
          }
          
          const title = `🚨 Railway 배포 실패 - ${new Date().toISOString().split('T')[0]}`;
          let issueBody = `## Railway 배포 실패 알림\n\n`;
          issueBody += `**시간:** ${new Date().toISOString()}\n`;
          issueBody += `**배포 ID:** ${deploymentId || 'N/A'}\n`;
          issueBody += `**상태:** ${deploymentStatus}\n\n`;
          issueBody += `### 오류 로그:\n\`\`\`\n${errorLog.substring(0, 8000)}\n\`\`\`\n\n`;
          
          if (detectedIssues.length > 0) {
            issueBody += `### 가능한 원인 및 해결 방법:\n${detectedIssues.join('\n')}\n\n`;
          }
          
          issueBody += `### 다음 단계:\n`;
          issueBody += `1. 로컬에서 \`npm run build\`로 오류 재현\n`;
          issueBody += `2. 오류를 수정하고 커밋\n`;
          issueBody += `3. Railway에서 재배포\n`;
          
          // GitHub API 호출
          const repo = process.env.GITHUB_REPO || 'annie-recruit/workless';
          const [owner, repoName] = repo.split('/');
          
          const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              body: issueBody,
              labels: ['bug', 'deployment', 'railway'],
            }),
          });
          
          if (response.ok) {
            const issue = await response.json();
            console.log(`✅ GitHub 이슈 생성 완료: ${issue.html_url}`);
          } else {
            console.error('GitHub 이슈 생성 실패:', await response.text());
          }
        } catch (githubError) {
          console.error('GitHub API 호출 오류:', githubError);
        }
      } else {
        console.warn('GITHUB_TOKEN이 설정되지 않아 이슈를 생성할 수 없습니다.');
      }
      
      return NextResponse.json({ 
        received: true,
        message: '배포 실패 알림을 받았습니다. GitHub 이슈를 확인하세요.' 
      });
    }
    
    return NextResponse.json({ received: true, message: '배포 상태 업데이트를 받았습니다.' });
  } catch (error) {
    console.error('Railway 웹훅 처리 오류:', error);
    return NextResponse.json(
      { error: '웹훅 처리 실패', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Railway 웹훅 검증을 위한 GET 엔드포인트
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Railway webhook endpoint is ready' 
  });
}
