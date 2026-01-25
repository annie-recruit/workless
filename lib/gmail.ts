import { google } from 'googleapis';
import { userDb } from './db';
import { GmailEmail } from '@/types';

export async function getGmailClient(userId: string) {
    const user = userDb.getById(userId);
    if (!user || !user.googleAccessToken) {
        throw new Error('User not found or not authenticated with Google');
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken || undefined,
        expiry_date: user.googleTokenExpiresAt || undefined,
    });

    // 토큰 갱신 시 DB 업데이트를 위한 리스너
    oauth2Client.on('tokens', (tokens) => {
        if (tokens.access_token) {
            userDb.updateTokens(
                userId,
                tokens.access_token,
                tokens.refresh_token || undefined,
                tokens.expiry_date || undefined
            );
        }
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function fetchWorklessEmails(userId: string, limit: number = 10): Promise<GmailEmail[]> {
    const gmail = await getGmailClient(userId);

    // 1. "Workless" 라벨 찾기
    const labelsRes = await gmail.users.labels.list({ userId: 'me' });
    const labels = labelsRes.data.labels || [];
    const worklessLabel = labels.find((l) => l.name?.toLowerCase() === 'workless');

    if (!worklessLabel || !worklessLabel.id) {
        console.log('Workless label not found');
        return [];
    }

    // 2. 라벨에 해당하는 메시지 목록 가져오기
    const messagesRes = await gmail.users.messages.list({
        userId: 'me',
        labelIds: [worklessLabel.id],
        maxResults: limit,
    });

    const messages = messagesRes.data.messages || [];
    const result: GmailEmail[] = [];

    // 3. 각 메시지 상세 정보 가져오기
    for (const message of messages) {
        if (!message.id) continue;

        const detailRes = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
        });

        const msg = detailRes.data;
        const headers = msg.payload?.headers || [];

        const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find((h) => h.name === 'From')?.value || '(Unknown)';
        const dateValue = headers.find((h) => h.name === 'Date')?.value;
        const dateString = dateValue ? new Date(dateValue).toISOString() : new Date().toISOString();

        const bodyText = extractBody(msg.payload);
        const snippet = msg.snippet || '';
        const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${msg.id}`;

        result.push({
            messageId: msg.id!,
            threadId: msg.threadId || undefined,
            subject,
            from,
            date: dateString,
            snippet,
            bodyText,
            gmailLink,
        });
    }

    return result;
}

function extractBody(payload: any): string {
    if (!payload) return '';

    // 1. text/plain 파트 찾기
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // 2. Multipart인 경우
    if (payload.parts) {
        // text/plain 우선
        const plainPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
        if (plainPart && plainPart.body?.data) {
            return Buffer.from(plainPart.body.data, 'base64').toString('utf-8');
        }

        // text/html만 있는 경우 (간단한 처리)
        const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
        if (htmlPart && htmlPart.body?.data) {
            const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            // 정규식으로 간단히 태그 제거 (정교한 stripHtml은 lib/text.ts에 있을 것임)
            return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        // 중첩된 파트 재귀 호출
        for (const part of payload.parts) {
            const nested = extractBody(part);
            if (nested) return nested;
        }
    }

    return '';
}
