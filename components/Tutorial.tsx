'use client';

import { useState, useEffect, useRef } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform when step is shown
}

interface TutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export default function Tutorial({ steps, onComplete, onSkip }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep >= steps.length) {
      onComplete();
      return;
    }

    const step = steps[currentStep];
    
    // Execute action if provided
    if (step.action) {
      step.action();
    }

    // Find target element with retry logic
    const findAndPositionElement = () => {
      if (step.targetSelector) {
        const element = document.querySelector(step.targetSelector) as HTMLElement;
        if (element) {
          setTargetElement(element);
          
          // Calculate tooltip position with better alignment
          const rect = element.getBoundingClientRect();
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;
          
          // 툴팁 크기 고려 (실제 크기 측정)
          const tooltipWidth = 384; // max-w-sm = 384px
          const tooltipHeight = 280; // 대략적인 높이
          const spacing = 20; // 요소와 툴팁 사이 간격
          const padding = 20; // 화면 가장자리 여백
          
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          let top = 0;
          let left = 0;
          
          switch (step.position) {
            case 'top':
              top = rect.top + scrollY - spacing;
              left = rect.left + scrollX + rect.width / 2;
              // 위쪽에 공간이 없으면 아래쪽에 표시
              if (top - scrollY < tooltipHeight + padding) {
                top = rect.bottom + scrollY + spacing;
              }
              break;
            case 'bottom':
              top = rect.bottom + scrollY + spacing;
              left = rect.left + scrollX + rect.width / 2;
              // 아래쪽에 공간이 없으면 위쪽에 표시
              if (top - scrollY + tooltipHeight > viewportHeight - padding) {
                top = rect.top + scrollY - spacing - tooltipHeight;
              }
              break;
            case 'left':
              top = rect.top + scrollY + rect.height / 2;
              left = rect.left + scrollX - spacing;
              // 왼쪽에 공간이 없으면 오른쪽에 표시
              if (left - scrollX < tooltipWidth + padding) {
                left = rect.right + scrollX + spacing;
              }
              break;
            case 'right':
              top = rect.top + scrollY + rect.height / 2;
              left = rect.right + scrollX + spacing;
              // 오른쪽에 공간이 없으면 왼쪽에 표시
              if (left - scrollX + tooltipWidth > viewportWidth - padding) {
                left = rect.left + scrollX - spacing - tooltipWidth;
              }
              break;
            case 'center':
            default:
              // 중앙 정렬 시 요소의 실제 위치 기준
              top = rect.top + scrollY + rect.height / 2;
              left = rect.left + scrollX + rect.width / 2;
              break;
          }
          
          // 화면 밖으로 나가지 않도록 엄격하게 조정
          // 가로 위치 조정
          if (left - scrollX < tooltipWidth / 2 + padding) {
            left = scrollX + tooltipWidth / 2 + padding;
          } else if (left - scrollX > viewportWidth - tooltipWidth / 2 - padding) {
            left = scrollX + viewportWidth - tooltipWidth / 2 - padding;
          }
          
          // 세로 위치 조정
          if (top - scrollY < tooltipHeight / 2 + padding) {
            top = scrollY + tooltipHeight / 2 + padding;
          } else if (top - scrollY > viewportHeight - tooltipHeight / 2 - padding) {
            top = scrollY + viewportHeight - tooltipHeight / 2 - padding;
          }
          
          setTooltipPosition({ top, left });
          
          // Scroll element into view with better positioning
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else {
          // Element not found, retry after a short delay
          console.log('튜토리얼 타겟 요소를 찾지 못함:', step.targetSelector);
          setTargetElement(null);
          // 재시도 (최대 3번)
          const retryCount = (window as any).__tutorialRetryCount || 0;
          if (retryCount < 3) {
            (window as any).__tutorialRetryCount = retryCount + 1;
            setTimeout(findAndPositionElement, 500);
          } else {
            (window as any).__tutorialRetryCount = 0;
            // 타겟이 없어도 중앙에 표시
            setTooltipPosition({
              top: window.innerHeight / 2 + window.scrollY,
              left: window.innerWidth / 2 + window.scrollX,
            });
          }
        }
      } else {
        setTargetElement(null);
        // Center position for steps without target
        setTooltipPosition({
          top: window.innerHeight / 2 + window.scrollY,
          left: window.innerWidth / 2 + window.scrollX,
        });
      }
    };

    // Reset retry count on step change
    (window as any).__tutorialRetryCount = 0;
    findAndPositionElement();
  }, [currentStep, steps, onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (currentStep >= steps.length) {
    return null;
  }

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay with highlight */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] bg-black/50 transition-opacity"
        onClick={handleNext}
      >
        {/* Highlight area */}
        {targetElement && (
          <div
            className="absolute border-4 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none transition-all"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: step.position === 'right' 
            ? 'translateY(-50%)' 
            : step.position === 'left'
            ? 'translateY(-50%)'
            : step.position === 'top'
            ? 'translate(-50%, -100%)'
            : step.position === 'bottom'
            ? 'translateX(-50%)'
            : 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm pointer-events-auto border-2 border-blue-500" style={{ maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {currentStep + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="건너뛰기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-700 mb-4 leading-relaxed">{step.description}</p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {currentStep + 1} / {steps.length}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrevious}
              disabled={isFirst}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              이전
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-1"
            >
              {isLast ? '완료' : '다음'}
              {!isLast && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Arrow pointing to target */}
        {targetElement && step.position && step.position !== 'center' && (
          <div
            className="absolute w-0 h-0 pointer-events-none"
            style={{
              top: step.position === 'bottom' ? '100%' : step.position === 'top' ? '-10px' : '50%',
              left: step.position === 'left' || step.position === 'right' 
                ? step.position === 'left' ? '100%' : '-10px'
                : '50%',
              transform: step.position === 'right' 
                ? 'translateY(-50%)'
                : step.position === 'left'
                ? 'translateY(-50%)'
                : step.position === 'top'
                ? 'translateX(-50%)'
                : 'translateX(-50%)',
              borderStyle: 'solid',
              borderWidth: step.position === 'top' || step.position === 'bottom' ? '10px 10px 0 10px' : '10px 0 10px 10px',
              borderColor: step.position === 'top'
                ? 'transparent transparent white transparent'
                : step.position === 'bottom'
                ? 'white transparent transparent transparent'
                : step.position === 'left'
                ? 'transparent white transparent transparent'
                : 'transparent transparent transparent white',
            }}
          />
        )}
      </div>
    </>
  );
}
