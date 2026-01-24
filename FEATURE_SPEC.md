# Workless 기능명세서

**작성일**: 2026-01-24  
**프로젝트**: Workless - 사고의 흐름을 보는 비정형 워크스페이스  
**버전**: 1.0

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [핵심 기능](#2-핵심-기능)
3. [메모리 관리](#3-메모리-관리)
4. [무한 캔버스 보드](#4-무한-캔버스-보드)
5. [위젯 블록](#5-위젯-블록)
6. [AI 기능](#6-ai-기능)
7. [그룹 관리](#7-그룹-관리)
8. [연결 및 링크](#8-연결-및-링크)
9. [인사이트 및 분석](#9-인사이트-및-분석)
10. [페르소나 시스템](#10-페르소나-시스템)
11. [인증 및 사용자](#11-인증-및-사용자)
12. [PWA 기능](#12-pwa-기능)
13. [API 엔드포인트](#13-api-엔드포인트)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적
Workless는 생각과 아이디어를 자유롭게 펼쳐놓고 연결할 수 있는 비정형 워크스페이스입니다. 전통적인 폴더 구조나 계층적 조직 없이, 무한 캔버스 위에서 메모리, 위젯, 아이디어를 자유롭게 배치하고 AI가 자동으로 연결 관계를 찾아줍니다.

### 1.2 핵심 철학
- **비정형 구조**: 폴더나 계층 없이 자유로운 배치
- **시각적 연결**: 생각과 아이디어 간의 관계를 선으로 시각화
- **AI 기반 발견**: 숨겨진 연결과 패턴을 AI가 자동으로 발견
- **무한 캔버스**: 제한 없는 공간에서 사고를 확장

### 1.3 기술 스택
- **Frontend**: Next.js 16.1, React 19, TypeScript, Tailwind CSS 4.0
- **Backend**: Next.js API Routes, Better SQLite3
- **AI**: OpenAI GPT (분석, 요약), OpenAI Whisper (음성 전사)
- **인증**: NextAuth.js (Google OAuth)
- **PWA**: next-pwa

---

## 2. 핵심 기능

### 2.1 메모리 생성 및 관리
- 텍스트 기반 메모리 카드 생성
- 리치 에디터를 통한 서식 있는 텍스트 편집
- 파일 첨부 (이미지, PDF, 문서 등)
- 음성 녹음 및 자동 전사
- 위치 정보 자동 기록

### 2.2 무한 캔버스
- 자유로운 드래그 앤 드롭 배치
- 줌 & 팬 기능 (0.5x ~ 1.6x)
- 다중 선택 및 일괄 이동
- 연결선 시각화
- 미니맵을 통한 전체 보기

### 2.3 AI 기반 자동화
- 메모리 자동 분류 (주제, 성격, 시간 맥락)
- 관련 메모리 자동 연결 제안
- 자동 그룹화 제안
- 패턴 및 트렌드 발견
- 인사이트 생성

---

## 3. 메모리 관리

### 3.1 메모리 생성

#### 입력 방식
- **텍스트 입력**: 리치 에디터를 통한 서식 있는 텍스트
- **제목**: 선택적 제목 입력
- **파일 첨부**: 드래그 앤 드롭 또는 파일 선택
  - 지원 형식: 이미지, PDF, TXT, MD, DOC, DOCX
- **음성 녹음**: 실시간 녹음 및 자동 전사
- **위치 정보**: GPS 기반 자동 위치 기록

#### 리치 에디터 기능
- **서식**: 굵게 (B), 기울임 (I)
- **링크**: 하이퍼링크 삽입
- **멘션**: `@` 태그로 다른 메모리 연결
- **자동 저장**: 입력 내용 자동 저장

#### API 엔드포인트
- `POST /api/memories` - 메모리 생성
  - 요청: `title`, `content`, `files`, `location`, `relatedMemoryIds`
  - 응답: 생성된 메모리 및 연결 제안

### 3.2 메모리 조회

#### 필터링
- **그룹별 필터**: 선택한 그룹의 메모리만 표시
- **전체 보기**: 모든 메모리 표시
- **검색**: 전역 검색 기능

#### 정렬
- **시간순**: 최신순 정렬 (기본)
- **관련성**: AI 기반 관련성 정렬

#### API 엔드포인트
- `GET /api/memories` - 메모리 목록 조회
  - 쿼리: `groupId` (선택)

### 3.3 메모리 수정 및 삭제

#### 수정
- 제목 및 내용 수정
- 파일 추가/삭제
- 위치 정보 수정/삭제

#### 삭제
- 메모리 삭제
- 연결된 링크 자동 정리

#### API 엔드포인트
- `PUT /api/memories?id={id}` - 메모리 수정
- `DELETE /api/memories?id={id}` - 메모리 삭제

### 3.4 메모리 분류 (AI 자동)

#### 자동 분류 항목
- **주제 (topic)**: 아이디어/업무/커리어/감정/기록
- **성격 (nature)**: 단순기록/아이디어/요청/고민
- **시간 맥락 (timeContext)**: 당장/언젠가/특정시점

#### API 엔드포인트
- `POST /api/memories/[id]/summarize` - 메모리 요약 및 분류

---

## 4. 무한 캔버스 보드

### 4.1 캔버스 기본 기능

#### 보드 크기
- **기본 크기**: 1600px × 1200px
- **동적 확장**: 콘텐츠에 따라 자동 확장

#### 줌 기능
- **범위**: 0.5x ~ 1.6x
- **조절**: +/- 버튼 또는 단축키
- **초기화**: 1.0x로 리셋
- **저장**: 그룹별 줌 레벨 저장

#### 팬 기능
- **스크롤**: 마우스 휠 또는 드래그
- **키보드**: 방향키로 이동

### 4.2 메모리 카드 배치

#### 드래그 앤 드롭
- **단일 드래그**: 개별 카드 이동
- **다중 선택**: Ctrl/Cmd + 클릭으로 다중 선택
- **박스 선택**: 드래그로 영역 선택
- **일괄 이동**: 선택된 카드들 동시 이동

#### 카드 크기
- **Small (s)**: 200px × 160px
- **Medium (m)**: 240px × 180px (기본값)
- **Large (l)**: 280px × 200px

#### 카드 색상
- **Green** (Orange 계열): `#FFF7ED` 배경
- **Pink** (Indigo 계열): `#EEF2FF` 배경
- **Purple**: `#F5F3FF` 배경 (기본값)

### 4.3 자동 배열

#### 맞춤 배열
- **연결선 기반**: 연결 관계를 고려한 자동 배열
- **그룹화**: 관련 메모리들을 가까이 배치
- **레이아웃 알고리즘**: Force-directed layout

#### API 엔드포인트
- `POST /api/board/arrange` - 자동 배열 실행

### 4.4 미니맵

#### 미니맵 기능
- **전체 보기**: 보드 전체를 축소하여 표시
- **현재 위치 표시**: 파란 박스로 현재 뷰포트 표시
- **노드 표시**: 메모리카드와 블록을 점으로 표시
- **블롭 표시**: 연결된 그룹을 블롭으로 표시
- **연결선 표시**: 메모리 간 연결 관계 표시

#### 미니맵 블록
- 보드 위에 위젯 블록으로 배치 가능
- 크기: 240px × 180px (기본값)
- 실시간 업데이트

#### 상세 스펙
- [MINIMAP_VISUAL_SPEC.md](./MINIMAP_VISUAL_SPEC.md) 참고

### 4.5 위치 저장

#### 자동 저장
- 드래그 종료 시 자동 저장
- 위치 정보는 `/api/board/positions`에 저장

#### API 엔드포인트
- `GET /api/board/positions` - 위치 정보 조회
- `PUT /api/board/positions` - 위치 정보 저장

---

## 5. 위젯 블록

### 5.1 캘린더 블록

#### 기능
- **뷰 모드**: 월/주/일 뷰
- **일정 관리**: 투두 리스트 추가/수정/삭제
- **메모리 연결**: 일정에 메모리 태그
- **날짜 선택**: 특정 날짜로 이동

#### 설정
- `view`: 'month' | 'week' | 'day'
- `selectedDate`: 선택된 날짜 (timestamp)
- `linkedMemoryIds`: 연결된 메모리 ID들
- `todos`: 일정 목록

#### API 엔드포인트
- `POST /api/board/blocks` - 캘린더 블록 생성
- `PUT /api/board/blocks?id={id}` - 캘린더 블록 수정

### 5.2 데이터베이스 블록

#### 기능
- **속성 정의**: 다양한 타입의 컬럼 생성
  - text, number, date, checkbox, select, multi-select, person, file, url, email, phone
- **레코드 관리**: 행 추가/수정/삭제
- **정렬**: 컬럼 기준 정렬 (오름차순/내림차순)
- **필터**: 조건별 필터링
- **뷰 타입**: 테이블 뷰 (향후 보드, 캘린더 뷰 추가 예정)
- **메모리 연결**: 레코드에 메모리 태그

#### 설정
- `name`: 데이터베이스 이름
- `properties`: 속성(컬럼) 목록
- `rows`: 행(레코드) 목록
- `sortBy`: 정렬 기준
- `sortOrder`: 정렬 방향
- `filters`: 필터 목록
- `viewType`: 뷰 타입
- `linkedMemoryIds`: 연결된 메모리 ID들

#### API 엔드포인트
- `POST /api/board/blocks` - 데이터베이스 블록 생성
- `PUT /api/board/blocks?id={id}` - 데이터베이스 블록 수정

### 5.3 뷰어 블록

#### 기능
- **파일 미리보기**: PDF, DOCX 파일을 캔버스에서 바로 보기
- **URL 미리보기**: 웹 페이지 미리보기
- **히스토리**: 이전에 본 파일/URL 히스토리
- **뒤로/앞으로**: 히스토리 네비게이션
- **Pin 기능**: 블록을 고정하여 항상 보이게

#### 지원 형식
- **PDF**: PDF.js를 통한 렌더링
- **DOCX**: Mammoth를 통한 HTML 변환
- **이미지**: 직접 표시
- **URL**: iframe 또는 링크

#### 설정
- `currentSource`: 현재 표시 중인 소스
- `history`: 히스토리 목록
- `historyIndex`: 현재 히스토리 인덱스
- `pinned`: Pin 상태

#### API 엔드포인트
- `POST /api/board/blocks` - 뷰어 블록 생성
- `PUT /api/board/blocks?id={id}` - 뷰어 블록 수정

### 5.4 회의록 블록

#### 기능
- **음성 녹음**: 실시간 음성 녹음
- **자동 전사**: OpenAI Whisper를 통한 자동 전사
- **AI 요약**: 회의록 자동 요약
- **일시정지/재개**: 녹음 중 일시정지
- **녹음 시간 표시**: 실시간 녹음 시간 표시

#### 설정
- `script`: 전체 스크립트
- `summary`: AI 요약
- `isRecording`: 녹음 중 여부
- `isPaused`: 일시정지 여부
- `recordingTime`: 녹음 시간 (초)
- `createdAt`: 생성 시간

#### API 엔드포인트
- `POST /api/board/blocks` - 회의록 블록 생성
- `PUT /api/board/blocks?id={id}` - 회의록 블록 수정
- `POST /api/transcribe` - 음성 전사

### 5.5 미니맵 블록

#### 기능
- 보드 위에 미니맵을 위젯으로 배치
- 실시간 업데이트
- 크기 조정 가능 (200px ~ 280px)

#### 제한
- 보드당 하나만 생성 가능

#### API 엔드포인트
- `POST /api/board/blocks` - 미니맵 블록 생성
- `PUT /api/board/blocks?id={id}` - 미니맵 블록 수정

### 5.6 블록 공통 기능

#### 드래그 앤 드롭
- 모든 블록은 드래그로 이동 가능
- 위치는 자동 저장

#### 크기 조정
- 일부 블록은 크기 조정 가능 (우하단 핸들)
- 최소/최대 크기 제한

#### 삭제
- 각 블록에 삭제 버튼 제공
- 삭제 시 확인 없이 즉시 삭제

#### API 엔드포인트
- `GET /api/board/blocks` - 블록 목록 조회
- `DELETE /api/board/blocks?id={id}` - 블록 삭제

---

## 6. AI 기능

### 6.1 메모리 분석 및 분류

#### 자동 분류
- **주제 분류**: 아이디어/업무/커리어/감정/기록
- **성격 분류**: 단순기록/아이디어/요청/고민
- **시간 맥락**: 당장/언젠가/특정시점

#### API 엔드포인트
- `POST /api/memories/[id]/summarize` - 메모리 요약 및 분류

### 6.2 연결 제안

#### 자동 연결 발견
- 관련된 메모리들을 AI가 자동으로 찾아 제안
- 연결 이유 설명 제공
- 사용자가 선택적으로 연결 수락

#### API 엔드포인트
- `POST /api/memories/[id]/auto-group` - 자동 그룹화 및 연결 제안
- `POST /api/memories/[id]/suggestions` - 연결 제안 조회

### 6.3 자동 그룹화

#### 그룹 제안
- 비슷한 주제나 아이디어를 자동으로 그룹화 제안
- 그룹 이름 자동 생성
- 관련 메모리 목록 제공

#### API 엔드포인트
- `POST /api/groups/suggest` - AI 그룹 제안
  - 쿼리: `personaId` (선택)

### 6.4 요약 기능

#### 메모리 요약
- 긴 메모리를 자동으로 요약
- 핵심 내용 추출

#### API 엔드포인트
- `POST /api/summarize` - 일반 요약
- `POST /api/memories/[id]/summarize` - 메모리 요약

### 6.5 음성 전사

#### 실시간 전사
- OpenAI Whisper를 사용한 음성 → 텍스트 변환
- 회의록 블록에서 사용

#### API 엔드포인트
- `POST /api/transcribe` - 음성 파일 전사

---

## 7. 그룹 관리

### 7.1 그룹 생성

#### 수동 생성
- 사용자가 직접 그룹 생성
- 그룹 이름 지정
- 색상 선택 (blue, purple, green, orange, pink, red, yellow)
- 메모리 선택

#### AI 제안 생성
- AI가 제안한 그룹을 수락하여 생성
- 그룹 이름 및 메모리 목록 자동 생성

#### API 엔드포인트
- `POST /api/groups` - 그룹 생성
- `POST /api/groups/suggest` - AI 그룹 제안

### 7.2 그룹 조회

#### 그룹 목록
- 사용자의 모든 그룹 표시
- 그룹별 메모리 개수 표시
- 최근 업데이트 시간 표시

#### 그룹 필터
- 특정 그룹 선택 시 해당 그룹의 메모리만 표시
- 전체 보기 옵션

#### API 엔드포인트
- `GET /api/groups` - 그룹 목록 조회

### 7.3 그룹 수정

#### 수정 가능 항목
- 그룹 이름
- 그룹 색상
- 메모리 목록 (추가/삭제)

#### API 엔드포인트
- `PUT /api/groups` - 그룹 수정

### 7.4 그룹 삭제

#### 삭제 기능
- 그룹 삭제 시 메모리는 삭제되지 않음
- 연결된 링크는 유지

#### API 엔드포인트
- `DELETE /api/groups?id={id}` - 그룹 삭제

### 7.5 그룹 설명

#### AI 생성 설명
- 그룹의 내용을 AI가 분석하여 설명 생성
- 그룹의 주제와 특징 요약

#### API 엔드포인트
- `GET /api/groups/[id]/description` - 그룹 설명 조회

---

## 8. 연결 및 링크

### 8.1 명시적 연결

#### 멘션 (@ 태그)
- 메모리 내에서 `@메모리제목` 형식으로 다른 메모리 멘션
- 멘션된 메모리와 자동으로 연결 생성

#### 수동 연결
- 메모리 간 수동으로 연결 생성
- 연결 노트 추가 가능

### 8.2 자동 연결

#### AI 제안 연결
- 메모리 생성 시 AI가 관련 메모리를 찾아 연결 제안
- 사용자가 선택적으로 수락

#### 연결 이유
- 각 연결에 AI가 생성한 연결 이유 표시

### 8.3 연결 시각화

#### 연결선
- 보드에서 연결된 메모리 간 선으로 표시
- 연결 그룹별 색상 구분
- 병렬 연결선 처리 (여러 연결이 있으면 오프셋)

#### 연결 네트워크
- 미니맵에서 연결 관계를 네트워크로 표시

### 8.4 링크 관리

#### 링크 조회
- 특정 메모리의 모든 연결 조회
- 양방향 연결 표시

#### 링크 삭제
- 연결 삭제 기능
- 연결 노트 수정

#### API 엔드포인트
- `POST /api/memories/link` - 링크 생성
- `GET /api/memories/links` - 링크 목록 조회
- `DELETE /api/memories/links?id={id}` - 링크 삭제

---

## 9. 인사이트 및 분석

### 9.1 인사이트 패널

#### 통계 정보
- 전체 메모리 개수
- 그룹 개수
- 연결 개수
- 최근 활동

#### 주제 분석
- 상위 주제 목록
- 주제별 메모리 개수
- 키워드 클라우드

#### 트렌드 분석
- 시간에 따른 메모리 생성 추이
- 반복되는 주제 발견
- 패턴 분석

#### 제안
- AI가 생성한 행동 제안
- 관련 메모리 그룹화 제안

#### API 엔드포인트
- `GET /api/insights` - 인사이트 조회
  - 쿼리: `personaId` (선택)

### 9.2 클러스터링

#### 자동 클러스터링
- 비슷한 메모리들을 자동으로 클러스터링
- 클러스터 이름 자동 생성
- 클러스터 요약 제공

#### API 엔드포인트
- `GET /api/clusters` - 클러스터 목록 조회

---

## 10. 페르소나 시스템

### 10.1 페르소나 개념

#### 페르소나 정의
- 다양한 관점의 AI 페르소나
- 각 페르소나는 다른 관심사와 역할을 가짐
- 페르소나별로 다른 인사이트와 제안 제공

#### 페르소나 속성
- `name`: 페르소나 이름
- `icon`: 이모티콘 (👨‍💼, 👨‍🍳 등)
- `description`: 페르소나 설명
- `context`: AI 컨텍스트 (관심사/역할)

### 10.2 페르소나 관리

#### 페르소나 생성
- 사용자가 직접 페르소나 생성
- 이름, 아이콘, 설명, 컨텍스트 설정

#### 페르소나 선택
- 인사이트 패널에서 페르소나 선택
- 선택한 페르소나의 관점에서 인사이트 제공

#### API 엔드포인트
- `GET /api/personas` - 페르소나 목록 조회
- `POST /api/personas` - 페르소나 생성
- `PUT /api/personas` - 페르소나 수정
- `DELETE /api/personas?id={id}` - 페르소나 삭제

---

## 11. 인증 및 사용자

### 11.1 인증 방식

#### Google OAuth
- NextAuth.js를 통한 Google 소셜 로그인
- OAuth 2.0 인증 플로우

#### 세션 관리
- 서버 사이드 세션 관리
- 자동 세션 갱신

### 11.2 사용자 데이터

#### 데이터 격리
- 사용자별 데이터 완전 격리
- 모든 데이터는 `userId`로 필터링

#### 사용자 정보
- Google 계정 정보 사용
- 이름, 이메일, 프로필 이미지

#### API 엔드포인트
- `GET /api/auth/session` - 현재 세션 조회
- `POST /api/auth/signin` - 로그인
- `POST /api/auth/signout` - 로그아웃

---

## 12. PWA 기능

### 12.1 오프라인 지원

#### 서비스 워커
- next-pwa를 통한 서비스 워커 등록
- 오프라인 캐싱

#### 오프라인 기능
- 기본 UI 오프라인에서도 동작
- 캐시된 데이터 표시

### 12.2 설치 기능

#### 홈 화면 추가
- iOS Safari: 공유 → 홈 화면에 추가
- Android Chrome: 메뉴 → 앱 설치

#### 앱 아이콘
- `icon-192.png`: 192×192px
- `icon-512.png`: 512×512px

### 12.3 반응형 디자인

#### 모바일 최적화
- 터치 최적화
- 스와이프 제스처 지원
- 반응형 레이아웃

---

## 13. API 엔드포인트

### 13.1 인증 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/auth/session` | 현재 세션 조회 |
| POST | `/api/auth/signin` | 로그인 |
| POST | `/api/auth/signout` | 로그아웃 |

### 13.2 메모리 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/memories` | 메모리 목록 조회 |
| POST | `/api/memories` | 메모리 생성 |
| PUT | `/api/memories?id={id}` | 메모리 수정 |
| DELETE | `/api/memories?id={id}` | 메모리 삭제 |
| POST | `/api/memories/[id]/summarize` | 메모리 요약 |
| POST | `/api/memories/[id]/auto-group` | 자동 그룹화 |
| POST | `/api/memories/[id]/suggestions` | 연결 제안 |
| POST | `/api/memories/[id]/convert-to-goal` | 목표로 변환 |
| POST | `/api/memories/link` | 링크 생성 |
| GET | `/api/memories/links` | 링크 목록 조회 |
| DELETE | `/api/memories/links?id={id}` | 링크 삭제 |

### 13.3 그룹 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/groups` | 그룹 목록 조회 |
| POST | `/api/groups` | 그룹 생성 |
| PUT | `/api/groups` | 그룹 수정 |
| DELETE | `/api/groups?id={id}` | 그룹 삭제 |
| POST | `/api/groups/suggest` | AI 그룹 제안 |
| GET | `/api/groups/[id]/description` | 그룹 설명 조회 |

### 13.4 보드 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/board/positions` | 위치 정보 조회 |
| PUT | `/api/board/positions` | 위치 정보 저장 |
| GET | `/api/board/blocks` | 블록 목록 조회 |
| POST | `/api/board/blocks` | 블록 생성 |
| PUT | `/api/board/blocks?id={id}` | 블록 수정 |
| DELETE | `/api/board/blocks?id={id}` | 블록 삭제 |
| POST | `/api/board/arrange` | 자동 배열 |
| GET | `/api/board/colors` | 색상 설정 조회 |
| PUT | `/api/board/colors` | 색상 설정 저장 |
| GET | `/api/board/settings` | 보드 설정 조회 |
| PUT | `/api/board/settings` | 보드 설정 저장 |

### 13.5 인사이트 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/insights` | 인사이트 조회 |
| GET | `/api/clusters` | 클러스터 목록 조회 |

### 13.6 페르소나 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/personas` | 페르소나 목록 조회 |
| POST | `/api/personas` | 페르소나 생성 |
| PUT | `/api/personas` | 페르소나 수정 |
| DELETE | `/api/personas?id={id}` | 페르소나 삭제 |

### 13.7 기타 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/transcribe` | 음성 전사 |
| POST | `/api/summarize` | 일반 요약 |
| GET | `/api/goals` | 목표 목록 조회 |
| POST | `/api/goals` | 목표 생성 |
| PUT | `/api/goals` | 목표 수정 |
| DELETE | `/api/goals?id={id}` | 목표 삭제 |
| POST | `/api/console-logs` | 콘솔 로그 전송 |

---

## 14. 데이터 모델

### 14.1 메모리 (Memory)
```typescript
{
  id: string;
  title?: string;
  content: string;
  createdAt: number;
  topic?: string;
  nature?: string;
  timeContext?: string;
  relatedMemoryIds?: string[];
  clusterTag?: string;
  repeatCount?: number;
  lastMentionedAt?: number;
  attachments?: Attachment[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
  };
}
```

### 14.2 그룹 (Group)
```typescript
{
  id: string;
  userId: string;
  name: string;
  color?: string;
  memoryIds: string[];
  isAIGenerated: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 14.3 캔버스 블록 (CanvasBlock)
```typescript
{
  id: string;
  userId: string;
  type: BlockType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  config: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}
```

### 14.4 페르소나 (Persona)
```typescript
{
  id: string;
  name: string;
  icon: string;
  description?: string;
  context?: string;
  createdAt: number;
  updatedAt: number;
}
```

---

## 15. 향후 계획

### 15.1 예정된 기능
- [ ] 다크 모드 지원
- [ ] 데이터베이스 블록의 보드/캘린더 뷰
- [ ] 목표 관리 기능 강화
- [ ] 협업 기능 (멀티 유저)
- [ ] 템플릿 시스템
- [ ] 내보내기/가져오기 기능

### 15.2 개선 예정
- [ ] 성능 최적화 (가상화, 메모이제이션)
- [ ] 오프라인 기능 강화
- [ ] 모바일 UX 개선
- [ ] 접근성 향상

---

## 16. 파일 위치

**기능명세서 파일**: `/Users/mac/workless/FEATURE_SPEC.md`  
**관련 파일**:
- `README.md` - 프로젝트 개요
- `VISUAL_DESIGN_SPEC.md` - 시각적 디자인 스펙
- `MINIMAP_VISUAL_SPEC.md` - 미니맵 상세 스펙
- `types/index.ts` - 타입 정의

---

## 17. 변경 이력

### 2026-01-24
- ✅ 전체 기능명세서 초안 작성
- ✅ 모든 API 엔드포인트 문서화
- ✅ 데이터 모델 정리
- ✅ 향후 계획 추가

---

**작성자**: AI Assistant  
**검토 필요**: 개발 팀, 프로덕트 팀
