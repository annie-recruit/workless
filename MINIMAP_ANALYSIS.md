# 미니맵 문제 근본 원인 분석

## 🔍 발견된 근본 문제들

### 1. **순환 의존성 문제 (Circular Dependency)**
```
containerWidth/Height 계산 → boardPixelWidth/Height 사용
finalBoardPixelWidth/Height 계산 → containerWidth/Height 사용
```
- `containerWidth`를 계산할 때 `boardPixelWidth`를 사용
- 그런데 `finalBoardPixelWidth`를 계산할 때 `containerWidth`를 사용
- 이는 논리적 순환 의존성으로, 예상치 못한 결과를 초래할 수 있음

### 2. **실제 그려지는 크기와 계산된 크기의 불일치**

#### Blob의 실제 크기
- **Bounds**: `blob.bounds.minX ~ maxX`
- **Padding**: 10px 추가
- **Shadow Blur**: `Math.min(28 * scale, 20)` = 최대 20px
- **실제 그려지는 영역**: bounds + padding + shadow blur * 2 (양쪽)
- **문제**: Clipping 체크는 `finalBoardPixelWidth/Height`만 확인하지만, shadow blur는 이 영역을 넘어설 수 있음

#### Symbol Items의 실제 크기
- **기본 크기**: `item.size * 1.8` (bgSize)
- **Hover 시**: `scale(1.35)` 적용 → 실제 크기 = `bgSize * 1.35`
- **문제**: Scale 계산 시 hover 상태를 고려하지 않음

### 3. **measured.w/h의 정확성 문제**
```typescript
const el = containerRef.current?.parentElement ?? containerRef.current;
const r = el.getBoundingClientRect();
setMeasured({ w: Math.max(220, Math.floor(r.width)), h: Math.max(140, Math.floor(r.height)) });
```
- `parentElement`를 측정하는데, 실제 minimap이 렌더링되는 컨테이너는 다를 수 있음
- `overflow-hidden`이 적용된 부모의 크기를 정확히 반영하지 못할 수 있음
- `Math.floor`로 인한 반올림 오차

### 4. **좌표계 변환의 복잡성**
- **Board Coordinates** (원본 캔버스): `pos.x, pos.y`
- **Minimap Pixel Coordinates**: `offsetX + (x - canvasBounds.minX) * scale`
- **Canvas Local Coordinates**: `(x - canvasBounds.minX) * scale` (offsetX/offsetY 제외)
- **Container Coordinates**: 컨테이너 내부 위치

각 변환 단계에서 오차가 누적될 수 있음

### 5. **Blob Shadow Blur의 실제 영향 범위**
```typescript
ctx.shadowBlur = Math.min(28 * scale, 20);
```
- Shadow blur는 양쪽으로 퍼지므로, 실제 영향 범위는 `shadowBlur * 2`
- 예: `shadowBlur = 20`이면, 실제로는 좌우/상하로 각각 20px씩 더 그려짐
- 하지만 clipping 체크는 bounds + padding만 확인

### 6. **Safety Margin의 부정확한 적용**
```typescript
const safetyMargin = 30;
const availableWidth = measured.w - framePaddingHorizontal * 2 - safetyMargin;
```
- Safety margin을 `availableWidth` 계산 시 빼지만
- 실제 blob의 shadow blur(최대 20px * 2 = 40px)보다 작을 수 있음
- Symbol hover scale(1.35)도 고려하지 않음

## 📊 필요한 디버깅 정보

### 1. **실제 렌더링 크기 측정**
다음 값들을 console.log로 출력:
```javascript
console.log('=== Minimap Debug Info ===');
console.log('measured:', measured);
console.log('contentWidth/Height:', contentWidth, contentHeight);
console.log('baseScale:', baseScale);
console.log('scale:', scale);
console.log('boardPixelWidth/Height:', boardPixelWidth, boardPixelHeight);
console.log('containerWidth/Height:', containerWidth, containerHeight);
console.log('finalBoardPixelWidth/Height:', finalBoardPixelWidth, finalBoardPixelHeight);
console.log('offsetX/Y:', offsetX, offsetY);
console.log('availableWidth/Height:', availableWidth, availableHeight);
console.log('maxContentWidth/Height:', maxContentWidth, maxContentHeight);
```

### 2. **Blob 실제 크기 측정**
각 blob의 실제 그려지는 크기:
```javascript
blobAreas.forEach((blob, idx) => {
  const padding = 10;
  const shadowBlur = Math.min(28 * scale, 20);
  const minXRel = (blob.bounds.minX - padding - canvasBounds.minX) * scale;
  const maxXRel = (blob.bounds.maxX + padding - canvasBounds.minX) * scale;
  const actualWidth = (maxXRel - minXRel) + shadowBlur * 2;
  console.log(`Blob ${idx}: actualWidth=${actualWidth}, finalBoardPixelWidth=${finalBoardPixelWidth}`);
});
```

### 3. **Symbol Items 실제 크기 측정**
각 symbol의 실제 크기 (hover 고려):
```javascript
symbolItems.forEach((item, idx) => {
  const bgSize = item.size * 1.8;
  const hoverSize = bgSize * 1.35; // hover 시
  const itemLeft = item.centerX - bgSize / 2;
  const itemRight = item.centerX + bgSize / 2;
  console.log(`Symbol ${idx}: left=${itemLeft}, right=${itemRight}, hoverRight=${item.centerX + hoverSize / 2}`);
});
```

### 4. **컨테이너 실제 크기 측정**
```javascript
useEffect(() => {
  const container = containerRef.current;
  if (container) {
    const rect = container.getBoundingClientRect();
    console.log('Container actual size:', rect.width, rect.height);
    console.log('Container computed size:', containerWidth, containerHeight);
  }
}, [containerWidth, containerHeight]);
```

### 5. **Canvas 실제 크기 측정**
```javascript
useEffect(() => {
  const canvas = canvasRef.current;
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    console.log('Canvas actual size:', rect.width, rect.height);
    console.log('Canvas computed size:', finalBoardPixelWidth, finalBoardPixelHeight);
  }
}, [finalBoardPixelWidth, finalBoardPixelHeight]);
```

## 🎯 해결 방향

### 1. **순환 의존성 제거**
- `containerWidth/Height`를 먼저 결정 (measured.w/h 기반)
- 그 다음 `finalBoardPixelWidth/Height`를 계산
- 순환 의존성 제거

### 2. **실제 그려지는 크기 고려**
- Blob: bounds + padding + shadowBlur * 2
- Symbol: bgSize * 1.35 (hover 고려)
- 이 값들을 scale 계산 시 반영

### 3. **measured.w/h 정확성 개선**
- 실제 minimap이 렌더링되는 컨테이너를 정확히 측정
- `overflow-hidden` 적용 전 크기 확인

### 4. **Safety Margin 재계산**
- Blob shadow blur: `Math.min(28 * scale, 20) * 2` (양쪽)
- Symbol hover: `bgSize * 0.35 / 2` (확장 부분)
- 이들을 모두 고려한 safety margin 계산
