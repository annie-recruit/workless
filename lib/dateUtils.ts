/**
 * 날짜 포매팅 유틸리티
 *
 * `language === 'ko' ? 'ko-KR' : 'en-US'` 같은 반복 패턴을
 * 하나의 함수로 캡슐화합니다.
 */

import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

/** 언어 코드를 로케일 문자열로 변환 */
export function getLocaleString(language: string): string {
  return language === 'ko' ? 'ko-KR' : 'en-US';
}

/** date-fns용 로케일 객체 반환 */
export function getDateFnsLocale(language: string) {
  return language === 'ko' ? ko : enUS;
}

/** 날짜를 로케일에 맞는 문자열로 변환 */
export function formatLocalDate(
  date: Date | number | string,
  language: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(getLocaleString(language), options);
}

/** 날짜-시간을 로케일에 맞는 문자열로 변환 */
export function formatLocalDateTime(
  date: Date | number | string,
  language: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(getLocaleString(language), options);
}

/** '~전' 형식의 상대 시간 문자열 반환 */
export function formatTimeAgo(
  date: Date | number | string,
  language: string
): string {
  const timestamp = typeof date === 'number' ? date : new Date(date).getTime();
  return formatDistanceToNow(timestamp, {
    addSuffix: true,
    locale: getDateFnsLocale(language),
  });
}
