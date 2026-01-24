# Minimap 시각적 스펙 명세서

**작성일**: 2026-01-24  
**컴포넌트**: `components/Minimap.tsx`  
**버전**: 1.0

---

## 1. 전체 레이아웃

### 1.1 미니맵 컨테이너
- **일반 모드**: 고정 너비 `220px`, 높이는 콘텐츠에 따라 동적
- **위젯 모드**: `containerWidth` × `containerHeight` (보드 내부 블록으로 사용)
- **배경색**: `#ffffff` (흰색)
- **패딩**: 콘텐츠 주변 `80px` 여백 (`CONTENT_PADDING`)

### 1.2 보드 좌표계
- 보드 전체 크기 기준으로 스케일링
- 원점: `(-CONTENT_PADDING, -CONTENT_PADDING)`
- 스케일: 보드 크기 + 패딩을 미니맵 컨테이너에 맞춰 계산

---

## 2. 노드 (점) 스타일

### 2.1 메모리카드 점

#### 크기
- **계산식**: `Math.max(4, Math.min(cardDims.width, cardDims.height) * 0.12 * bounds.scale)`
- **최소 크기**: `4px`
- **비율**: 카드 크기의 `12%` × 스케일

#### 색상 규칙
1. **현재 뷰포트 내 메모리카드** (파란색 계열)
   - **점 색상**: `#3B82F6` (blue-500)
   - **테두리**: `#2563EB` (blue-600)
   - **그림자 배경**: `#DBEAFE` (blue-100)
   - **조건**: `viewportBounds` 내에 완전히 포함된 메모리카드

2. **일반 메모리카드** (카드 색상 매핑)
   - **Green 계열** (orange 계열로 표시)
     - 점: `#FB923C` (orange-400)
     - 테두리: `#FDBA74` (orange-300)
     - 배경: `#FFF7ED` (orange-50)
   
   - **Pink 계열** (indigo 계열로 표시)
     - 점: `#818CF8` (indigo-400)
     - 테두리: `#A5B4FC` (indigo-300)
     - 배경: `#EEF2FF` (indigo-50)
   
   - **Purple 계열** (기본값)
     - 점: `#A78BFA` (purple-400)
     - 테두리: `#C4B5FD` (purple-300)
     - 배경: `#F5F3FF` (purple-50)

#### 스타일 속성
- **테두리 두께**: `2.5px`
- **그림자**: `0 0 0 ${dotSize * 0.25}px ${colors.bg}40`
  - 그림자 크기: 점 크기의 `25%`
  - 투명도: `40%`

### 2.2 블록 점

#### 크기
- **계산식**: `Math.max(8, Math.min(blockWidth, blockHeight) * 0.22 * bounds.scale)`
- **최소 크기**: `8px`
- **비율**: 블록 크기의 `22%` × 스케일

#### 색상 (블록 타입별)
- **Viewer 블록**
  - 점: `#A78BFA` (purple-400)
  - 테두리: `#C4B5FD` (purple-300)
  - 배경: `#F5F3FF` (purple-50)

- **Calendar 블록**
  - 점: `#60A5FA` (blue-400)
  - 테두리: `#93C5FD` (blue-300)
  - 배경: `#DBEAFE` (blue-100)

- **Database 블록**
  - 점: `#34D399` (emerald-400)
  - 테두리: `#6EE7B7` (emerald-300)
  - 배경: `#D1FAE5` (emerald-100)

- **Meeting Recorder 블록**
  - 점: `#F472B6` (pink-400)
  - 테두리: `#F9A8D4` (pink-300)
  - 배경: `#FCE7F3` (pink-100)

- **기본 블록**
  - 점: `#94A3B8` (slate-400)
  - 테두리: `#CBD5E1` (slate-300)
  - 배경: `#F1F5F9` (slate-100)

#### 스타일 속성
- **테두리 두께**: `3px`
- **그림자**: `0 0 0 ${dotSize * 0.25}px ${colors.bg}40`

---

## 3. 블롭 (연결 그룹 영역)

### 3.1 블롭 스타일
- **타입**: 원형 그라데이션 (`createRadialGradient`)
- **중심**: 그룹의 bounding box 중심점
- **반지름**: 그룹 bounding box의 최대 반지름

### 3.2 그라데이션 투명도
- **중앙** (`addColorStop(0)`): `80%` 투명도
- **중간** (`addColorStop(0.5)`): `50%` 투명도
- **외곽** (`addColorStop(1)`): `transparent` (완전 투명)

### 3.3 색상 소스
- `blobAreas`가 제공되면: `blob.color` 사용
- 그렇지 않으면: 연결 그룹의 첫 번째 연결선 색상 사용
- 기본값: `#A5B4FC` (indigo-300)

---

## 4. 연결선

### 4.1 기본 스타일
- **선 두께**: `1.5px × bounds.scale`
- **선 끝 모양**: `round` (`lineCap: 'round'`)
- **색상**: `connectionPairs`의 `color` 속성 사용
- **기본 색상**: `#C4B5FD` (purple-300)

### 4.2 병렬 연결선 처리
- 같은 두 노드 간 여러 연결선이 있으면 오프셋 적용
- 오프셋: `(idx - (totalConnections - 1) / 2) * 3 * bounds.scale`
- 수직 방향으로 분산 배치

---

## 5. 뷰포트 표시 박스

### 5.1 스타일
- **배경색**: `rgba(59, 130, 246, 0.1)` (`bg-blue-500/10`)
- **테두리**: `2px solid #3B82F6` (`border-blue-500`)
- **포인터 이벤트**: `none` (클릭 불가)
- **Z-index**: `10`

### 5.2 위치 계산
- **보드 좌표계 → 미니맵 좌표계 변환**:
  ```
  left = (viewportBounds.left - bounds.minX) * bounds.scale
  top = (viewportBounds.top - bounds.minY) * bounds.scale
  width = viewportBounds.width * bounds.scale
  height = viewportBounds.height * bounds.scale
  ```

### 5.3 경계 제한
- 미니맵 영역을 벗어나지 않도록 clamp:
  ```javascript
  finalLeft = Math.max(0, Math.min(viewportLeft, maxWidth - viewportWidth))
  finalTop = Math.max(0, Math.min(viewportTop, maxHeight - viewportHeight))
  finalWidth = Math.min(viewportWidth, maxWidth - finalLeft)
  finalHeight = Math.min(viewportHeight, maxHeight - finalTop)
  ```

---

## 6. 카드 크기 매핑

### 6.1 카드 크기별 실제 크기
- **Small (s)**: `200px × 160px`
- **Medium (m)**: `240px × 180px` (기본값)
- **Large (l)**: `280px × 200px`

---

## 7. 색상 팔레트 요약

### 7.1 메모리카드 색상
| 타입 | 점 색상 | 테두리 | 배경 |
|------|---------|--------|------|
| Green (Orange) | `#FB923C` | `#FDBA74` | `#FFF7ED` |
| Pink (Indigo) | `#818CF8` | `#A5B4FC` | `#EEF2FF` |
| Purple | `#A78BFA` | `#C4B5FD` | `#F5F3FF` |
| **현재 위치** | `#3B82F6` | `#2563EB` | `#DBEAFE` |

### 7.2 블록 색상
| 타입 | 점 색상 | 테두리 | 배경 |
|------|---------|--------|------|
| Viewer | `#A78BFA` | `#C4B5FD` | `#F5F3FF` |
| Calendar | `#60A5FA` | `#93C5FD` | `#DBEAFE` |
| Database | `#34D399` | `#6EE7B7` | `#D1FAE5` |
| Meeting Recorder | `#F472B6` | `#F9A8D4` | `#FCE7F3` |
| Default | `#94A3B8` | `#CBD5E1` | `#F1F5F9` |

### 7.3 뷰포트 박스
- **테두리**: `#3B82F6` (blue-500)
- **배경**: `rgba(59, 130, 246, 0.1)` (blue-500/10)

---

## 8. 주요 변경 이력

### 2026-01-24
- ✅ 메모리카드 점 크기 축소: `0.22` → `0.12`, 최소값 `8px` → `4px`
- ✅ 현재 위치 메모리카드 파란색 표시 기능 추가
- ✅ 블롭 색상 진하게: 투명도 `40/20` → `80/50`

---

## 9. 참고사항

- 모든 좌표는 보드 좌표계 기준
- 스케일은 보드 전체 크기 + 패딩을 기준으로 계산
- 뷰포트 박스는 실시간으로 스크롤/줌 상태를 반영
- 메모리카드 점은 `viewportBounds` 내 완전히 포함된 경우에만 파란색으로 표시

---

**파일 위치**: `/Users/mac/workless/MINIMAP_VISUAL_SPEC.md`  
**관련 컴포넌트**: `components/Minimap.tsx`
