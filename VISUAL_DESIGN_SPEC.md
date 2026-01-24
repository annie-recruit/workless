# Workless 전체 프로젝트 시각적 스펙 명세서

**작성일**: 2026-01-24  
**프로젝트**: Workless - 사고의 흐름을 보는 비정형 워크스페이스  
**버전**: 1.0

---

## 목차

1. [디자인 시스템 개요](#1-디자인-시스템-개요)
2. [색상 시스템](#2-색상-시스템)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 & 간격](#4-레이아웃--간격)
5. [컴포넌트 스타일 가이드](#5-컴포넌트-스타일-가이드)
6. [애니메이션](#6-애니메이션)
7. [반응형 디자인](#7-반응형-디자인)
8. [미니맵 시각적 스펙](#8-미니맵-시각적-스펙)

---

## 1. 디자인 시스템 개요

### 1.1 디자인 철학
- **비정형 워크스페이스**: 폴더나 계층 없이 자유로운 배치
- **시각적 연결**: 생각과 아이디어 간의 관계를 선으로 시각화
- **직선과 명확한 테두리**: 카툰 스타일의 직선적 디자인
- **명확한 경계선**: 둥근 모서리 최소화, 직관적인 인터랙션

### 1.2 키 컬러
- **주황 (Orange)**: `#fb923c` - 주요 액션, 강조
- **인디고 (Indigo)**: `#6366f1` - 보조 액션, 링크, 연결

### 1.3 기술 스택
- **CSS Framework**: Tailwind CSS 4.0
- **폰트**: Pretendard Variable (한글 최적화)
- **아이콘**: Pixel Icon Library (@hackernoon/pixel-icon-library)

---

## 2. 색상 시스템

### 2.1 CSS 변수 (globals.css)

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  
  /* 주황 계열 */
  --color-primary-orange: #fb923c;
  --color-primary-orange-light: #fed7aa;
  --color-primary-orange-dark: #ea580c;
  
  /* 인디고 계열 */
  --color-primary-indigo: #6366f1;
  --color-primary-indigo-light: #c7d2fe;
  --color-primary-indigo-dark: #4338ca;
}
```

### 2.2 배경 그라데이션

#### 메인 페이지 배경
- **클래스**: `bg-gradient-to-br from-blue-50 via-white to-purple-50`
- **색상**: 파란색 → 흰색 → 보라색 그라데이션
- **용도**: 로딩 화면, 로그인 화면

### 2.3 메모리카드 색상

#### 카드 색상 타입
| 타입 | 배경 | 테두리 | 점 색상 | 용도 |
|------|------|--------|---------|------|
| **Green** (Orange 계열) | `#FFF7ED` | `#FDBA74` | `#FB923C` | 일반 메모리 |
| **Pink** (Indigo 계열) | `#EEF2FF` | `#A5B4FC` | `#818CF8` | 일반 메모리 |
| **Purple** | `#F5F3FF` | `#C4B5FD` | `#A78BFA` | 기본값 |

#### 현재 위치 메모리카드 (뷰포트 내)
- **점 색상**: `#3B82F6` (blue-500)
- **테두리**: `#2563EB` (blue-600)
- **배경**: `#DBEAFE` (blue-100)

### 2.4 블록 색상

| 블록 타입 | 점 색상 | 테두리 | 배경 |
|-----------|---------|--------|------|
| **Viewer** | `#A78BFA` (purple-400) | `#C4B5FD` (purple-300) | `#F5F3FF` (purple-50) |
| **Calendar** | `#60A5FA` (blue-400) | `#93C5FD` (blue-300) | `#DBEAFE` (blue-100) |
| **Database** | `#34D399` (emerald-400) | `#6EE7B7` (emerald-300) | `#D1FAE5` (emerald-100) |
| **Meeting Recorder** | `#F472B6` (pink-400) | `#F9A8D4` (pink-300) | `#FCE7F3` (pink-100) |
| **Default** | `#94A3B8` (slate-400) | `#CBD5E1` (slate-300) | `#F1F5F9` (slate-100) |

### 2.5 그룹 색상 옵션

| 색상 | 배경 | 텍스트 | 테두리 |
|------|------|--------|--------|
| **Blue** | `bg-indigo-100` | `text-indigo-800` | `border-indigo-300` |
| **Purple** | `bg-indigo-100` | `text-indigo-800` | `border-indigo-300` |
| **Green** | `bg-green-100` | `text-green-800` | `border-green-300` |
| **Orange** | `bg-orange-100` | `text-orange-800` | `border-orange-300` |
| **Pink** | `bg-pink-100` | `text-pink-800` | `border-pink-300` |
| **Red** | `bg-red-100` | `text-red-800` | `border-red-300` |
| **Yellow** | `bg-yellow-100` | `text-yellow-800` | `border-yellow-300` |

### 2.6 버튼 색상

#### 주요 버튼
- **인디고 버튼**: `bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600`
- **회색 버튼**: `bg-gray-200 text-gray-700 hover:bg-gray-300`
- **흰색 버튼**: `bg-white border-gray-200 hover:bg-gray-50`

#### 상태별 색상
- **비활성화**: `disabled:opacity-50 disabled:cursor-not-allowed`
- **로딩**: `animate-spin` + 회색 테두리

### 2.7 링크 및 멘션 (@ 태그)

#### 멘션 스타일 (.mention)
- **배경**: `var(--color-primary-indigo-light)` (`#c7d2fe`)
- **텍스트**: `var(--color-primary-indigo-dark)` (`#4338ca`)
- **테두리**: `1px solid var(--color-primary-indigo)` (`#6366f1`)
- **border-radius**: `2px` (직선 느낌)
- **호버**: 배경 `var(--color-primary-indigo)`, 텍스트 `white`
- **액티브**: 배경 `var(--color-primary-indigo-dark)`

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
font-family: "Pretendard Variable", Pretendard, -apple-system, 
             BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", 
             "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", 
             "Malgun Gothic", sans-serif;
```

- **주 폰트**: Pretendard Variable (한글 최적화)
- **폴백**: 시스템 폰트

### 3.2 텍스트 크기

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `text-xs` | 12px | 작은 라벨, 버튼 텍스트 |
| `text-sm` | 14px | 본문, 카드 내용 |
| `text-base` | 16px | 기본 텍스트 |
| `text-lg` | 18px | 제목 |
| `text-xl` | 20px | 큰 제목 |
| `text-2xl` | 24px | 이모지, 아이콘 |

### 3.3 폰트 굵기

- `font-normal` (400): 기본 텍스트
- `font-medium` (500): 강조 텍스트
- `font-semibold` (600): 제목, 버튼
- `font-bold` (700): 강한 강조

---

## 4. 레이아웃 & 간격

### 4.1 컨테이너

#### 메인 컨테이너
- **최대 너비**: `max-w-3xl` (768px)
- **중앙 정렬**: `mx-auto`
- **패딩**: `px-4 py-6` (기본)

#### 메모리 입력 영역
- **너비**: `w-full max-w-3xl`
- **간격**: `space-y-4`

### 4.2 간격 시스템 (Tailwind)

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `gap-0.5` | 2px | 매우 작은 간격 (버튼 그룹) |
| `gap-1` | 4px | 작은 간격 |
| `gap-2` | 8px | 기본 간격 |
| `gap-4` | 16px | 섹션 간격 |
| `gap-6` | 24px | 큰 섹션 간격 |

### 4.3 패딩

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `px-2 py-1` | 8px × 4px | 작은 버튼 |
| `px-3 py-1.5` | 12px × 6px | 입력 필드 |
| `px-4 py-2` | 16px × 8px | 기본 버튼 |
| `px-4 py-3` | 16px × 12px | 카드 내부 |

### 4.4 화이트보드 레이아웃

#### 보드 크기
- **기본 크기**: `1600px × 1200px`
- **동적 조정**: 콘텐츠에 따라 확장 가능

#### 컨트롤 바 (Sticky Header)
- **위치**: `sticky top-0 z-10`
- **배경**: `bg-white border-b border-gray-200`
- **높이**: 약 `40px`
- **패딩**: `px-3 py-2`

---

## 5. 컴포넌트 스타일 가이드

### 5.1 메모리 입력 컴포넌트 (MemoryInput)

#### 제목 입력
- **스타일**: `w-full px-3 py-1.5 text-sm font-medium border-b-2 border-gray-200`
- **포커스**: `focus:outline-none focus:border-indigo-500`
- **플레이스홀더**: "제목 (선택)"

#### 에디터 영역
- **기본 테두리**: `border-gray-200`
- **포커스**: `focus-within:border-indigo-500`
- **드래그 상태**: `border-indigo-500 bg-indigo-50 border-dashed`
- **최소 높이**: `120px` (동적 조정 가능)

#### 툴바
- **배경**: `bg-white/70 border-b-2 border-gray-200`
- **버튼**: `px-1.5 py-0.5 text-xs rounded hover:bg-gray-100`
- **아이콘**: 이모지 사용 (B, I, 🔗, @)

#### 하단 버튼 영역
- **배경**: `bg-gray-50/50 border-t border-gray-100`
- **저장 버튼**: `bg-blue-500 text-white hover:bg-blue-600`

### 5.2 메모리 카드 (MemoryView)

#### 카드 스타일
- **배경**: 카드 색상 타입에 따라 (green/pink/purple)
- **테두리**: `border-2` + 색상별 테두리
- **그림자**: `shadow-lg` 또는 `shadow-xl`
- **border-radius**: `rounded-lg` (8px)

#### 카드 크기
- **Small (s)**: `200px × 160px`
- **Medium (m)**: `240px × 180px` (기본값)
- **Large (l)**: `280px × 200px`

#### 카드 내부
- **제목**: `text-sm font-semibold` (최대 2줄)
- **내용**: `text-xs text-gray-700` (최대 3줄)
- **타임스탬프**: `text-[10px] text-gray-400`

### 5.3 그룹 매니저 (GroupManager)

#### 그룹 카드
- **배경**: 그룹 색상에 따라 (예: `bg-indigo-100`)
- **테두리**: `border-2` + 색상별 테두리
- **패딩**: `p-4`
- **호버**: `hover:shadow-md`

#### 그룹 생성 모달
- **배경**: `bg-white rounded-lg shadow-xl`
- **최소 너비**: `min-w-[400px]`
- **최대 너비**: `max-w-[500px]`

### 5.4 인사이트 패널 (InsightsPanel)

#### 패널 레이아웃
- **너비**: `420px` (고정)
- **배경**: `bg-white` 또는 `bg-gray-50`
- **높이**: `100vh` (전체 화면)

#### 섹션 스타일
- **제목**: `text-sm font-semibold text-gray-800`
- **내용**: `text-xs text-gray-600`
- **구분선**: `border-b border-gray-200`

### 5.5 쿼리 패널 (QueryPanel)

#### 입력 영역
- **배경**: `bg-white border border-gray-300`
- **포커스**: `focus:outline-none focus:ring-2 focus:ring-indigo-500`
- **플레이스홀더**: "무엇이든 물어보세요..."

#### 결과 영역
- **배경**: `bg-gray-50`
- **패딩**: `p-4`
- **스크롤**: `overflow-y-auto max-h-96`

### 5.6 뷰어 블록 (ViewerBlock)

#### 블록 헤더
- **배경**: `bg-white border-b border-gray-300`
- **패딩**: `px-3 py-2`
- **높이**: `40px`

#### 콘텐츠 영역
- **배경**: `bg-white`
- **패딩**: `p-4`
- **스크롤**: `overflow-auto`

### 5.7 캘린더 블록 (CalendarBlock)

#### 캘린더 그리드
- **셀 크기**: `40px × 40px`
- **테두리**: `border border-gray-200`
- **호버**: `hover:bg-indigo-50`

#### 오늘 날짜
- **배경**: `bg-indigo-500 text-white`
- **테두리**: `border-2 border-indigo-600`

### 5.8 데이터베이스 블록 (DatabaseBlock)

#### 테이블 스타일
- **헤더**: `bg-gray-100 font-semibold`
- **셀**: `border border-gray-200 px-2 py-1`
- **호버**: `hover:bg-gray-50`

---

## 6. 애니메이션

### 6.1 CSS 애니메이션 (globals.css)

#### 반짝 애니메이션 (sparkle-single)
```css
@keyframes sparkle-single {
  0%, 100% { opacity: 0.8; transform: scale(1) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(10deg); }
}
```
- **용도**: 이모지, 아이콘 강조
- **지속 시간**: `1.5s`
- **이징**: `ease-in-out`
- **반복**: `infinite`

#### 문서 모으기 애니메이션 (gather-1, gather-2, gather-3)
```css
@keyframes gather-1 {
  0% { opacity: 1; transform: translate(-100px, -80px) scale(0.8) rotate(-15deg); }
  70% { opacity: 0.8; transform: translate(0, 0) scale(0.4) rotate(0deg); }
  100% { opacity: 0; transform: translate(0, 0) scale(0.2); }
}
```
- **용도**: 그룹 생성 시 문서들이 폴더로 모이는 효과
- **지속 시간**: `1.5s`
- **지연**: `0.3s`, `0.5s`, `0.7s` (각각)

#### 폴더 나타나기 (folder-appear)
```css
@keyframes folder-appear {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 0.5; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}
```
- **용도**: 그룹 생성 완료 시 폴더 아이콘 등장
- **지속 시간**: `2s`
- **지연**: `1.2s`

#### 페이드 인 (fade-in)
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```
- **용도**: 일반적인 페이드 인 효과
- **지속 시간**: `0.5s`

#### 슬라이드 업 (slide-up)
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```
- **용도**: 토스트, 모달 등장
- **지속 시간**: `0.3s`

#### 느린 회전 (spin-slow)
```css
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```
- **용도**: 로딩 아이콘
- **지속 시간**: `4s`
- **반복**: `infinite`

### 6.2 Tailwind 애니메이션

- `animate-spin`: 빠른 회전 (로딩)
- `animate-pulse`: 펄스 효과 (녹음 중)
- `animate-bounce`: 바운스 효과

### 6.3 인터랙션 애니메이션

#### 버튼 클릭
```css
button:active, a:active {
  transform: scale(0.98);
  transition: transform 0.1s ease-in-out;
}
```

#### 호버 효과
- **버튼**: `hover:bg-gray-100` 또는 색상별 호버
- **카드**: `hover:shadow-md`
- **링크**: `hover:underline`

---

## 7. 반응형 디자인

### 7.1 브레이크포인트 (Tailwind 기본)

| 크기 | 최소 너비 | 용도 |
|------|-----------|------|
| `sm` | 640px | 작은 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 데스크톱 |
| `xl` | 1280px | 큰 데스크톱 |

### 7.2 모바일 최적화

#### 터치 최적화
```css
-webkit-tap-highlight-color: rgba(0, 0, 0, 0);
-webkit-touch-callout: none;
touch-action: manipulation;
```

#### 스크롤
```css
-webkit-overflow-scrolling: touch;
```

#### 스와이프 제스처
- 클래스: `.swipeable`
- 속성: `touch-action: pan-y`

### 7.3 레이아웃 조정

#### 메인 레이아웃
- **인사이트 패널 표시 시**: `calc(100vw - 420px)`
- **인사이트 패널 숨김 시**: `calc(100vw - 40px)`

#### 카드 그리드
- **모바일**: 1열
- **태블릿**: 2열
- **데스크톱**: 3열 이상

---

## 8. 미니맵 시각적 스펙

> 상세한 미니맵 스펙은 [MINIMAP_VISUAL_SPEC.md](./MINIMAP_VISUAL_SPEC.md) 참고

### 8.1 미니맵 컨테이너
- **일반 모드**: 고정 너비 `220px`
- **위젯 모드**: `containerWidth × containerHeight`
- **배경**: `#ffffff`

### 8.2 노드 (점) 크기
- **메모리카드**: 최소 `4px`, 비율 `12%`
- **블록**: 최소 `8px`, 비율 `22%`

### 8.3 블롭 색상
- **중앙 투명도**: `80%`
- **중간 투명도**: `50%`
- **외곽**: `transparent`

### 8.4 뷰포트 박스
- **배경**: `rgba(59, 130, 246, 0.1)` (blue-500/10)
- **테두리**: `2px solid #3B82F6` (blue-500)

---

## 9. 다크 모드

### 9.1 현재 상태
- **지원 여부**: CSS 변수만 정의됨 (미구현)
- **배경**: `#0a0a0a`
- **전경**: `#ededed`

### 9.2 향후 계획
- 다크 모드 토글 기능 추가 예정
- 모든 컴포넌트 다크 모드 스타일 적용 필요

---

## 10. 접근성

### 10.1 키보드 네비게이션
- 모든 버튼은 키보드로 접근 가능
- 포커스 표시: `focus:outline-none focus:ring-2 focus:ring-indigo-500`

### 10.2 색상 대비
- 텍스트와 배경의 대비율: WCAG AA 기준 준수
- 색상만으로 정보 전달하지 않음 (아이콘, 텍스트 병행)

### 10.3 터치 타겟
- 최소 크기: `44px × 44px` (모바일)
- 충분한 간격: 버튼 간 최소 `8px`

---

## 11. 아이콘 시스템

### 11.1 이모지 사용
- **용도**: 버튼, 카테고리, 상태 표시
- **예시**: 📅 (캘린더), 🗺️ (미니맵), 📺 (뷰어), 🎙️ (녹음), 📊 (데이터베이스)

### 11.2 Pixel Icon Library
- **패키지**: `@hackernoon/pixel-icon-library`
- **용도**: 특정 UI 요소
- **위치**: `public/icons/pixel/`

---

## 12. 그림자 시스템

### 12.1 그림자 크기

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `shadow-sm` | 작은 그림자 | 버튼, 입력 필드 |
| `shadow` | 기본 그림자 | 카드 |
| `shadow-md` | 중간 그림자 | 호버 상태 |
| `shadow-lg` | 큰 그림자 | 모달, 드롭다운 |
| `shadow-xl` | 매우 큰 그림자 | 중요 모달 |

---

## 13. 테두리 시스템

### 13.1 테두리 두께

| 클래스 | 두께 | 용도 |
|--------|------|------|
| `border` | 1px | 기본 테두리 |
| `border-2` | 2px | 강조 테두리 (카드, 블록) |
| `border-4` | 4px | 매우 강한 강조 |

### 13.2 테두리 스타일

- **실선**: `border-solid` (기본값)
- **점선**: `border-dashed` (드래그 영역)
- **없음**: `border-none`

---

## 14. Z-index 레이어

| 레이어 | Z-index | 용도 |
|--------|---------|------|
| **기본** | `0` | 일반 콘텐츠 |
| **뷰포트 박스** | `10` | 미니맵 뷰포트 표시 |
| **스티키 헤더** | `10` | 컨트롤 바 |
| **카드 선택** | `30` | 선택된 카드 |
| **드래그 선택** | `40` | 드래그 선택 박스 |
| **블록 (기본)** | `30` | 블록 기본 |
| **블록 (선택)** | `100` | 선택된 블록 |
| **블록 (클릭)** | `5000` | 클릭된 블록 |
| **블록 (드래그)** | `10000` | 드래그 중 블록 |
| **토스트** | `9999` | 토스트 알림 |

---

## 15. 상태 표시

### 15.1 로딩 상태
- **스피너**: `animate-spin rounded-full border-b-2`
- **텍스트**: "로딩 중...", "분석 중...", "저장 중..."

### 15.2 에러 상태
- **색상**: `text-red-500`
- **아이콘**: ⚠️
- **배경**: `bg-red-50` (선택적)

### 15.3 성공 상태
- **색상**: `text-green-500`
- **아이콘**: ✅
- **배경**: `bg-green-50` (선택적)

---

## 16. 파일 위치

**명세서 파일**: `/Users/mac/workless/VISUAL_DESIGN_SPEC.md`  
**관련 파일**:
- `app/globals.css` - 전역 스타일
- `components/*.tsx` - 각 컴포넌트 스타일
- `MINIMAP_VISUAL_SPEC.md` - 미니맵 상세 스펙

---

## 17. 변경 이력

### 2026-01-24
- ✅ 전체 프로젝트 시각적 스펙 명세서 초안 작성
- ✅ 색상 시스템, 타이포그래피, 레이아웃 정리
- ✅ 주요 컴포넌트 스타일 가이드 작성
- ✅ 애니메이션 및 반응형 디자인 문서화

---

**작성자**: AI Assistant  
**검토 필요**: 디자인 팀, 프론트엔드 팀
