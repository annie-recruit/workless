'use client';

import { useState, useEffect, useRef } from 'react';
import PixelIcon from './PixelIcon';

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
          
          // 위치 계산 함수
          const calculatePosition = (targetElement: HTMLElement) => {
            const rect = targetElement.getBoundingClientRect();
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
            
            return { top, left };
          };
          
          // 초기 위치 설정
          const position = calculatePosition(element);
          setTooltipPosition(position);
          
          // Scroll element into view with better positioning
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          
          // 타겟 요소를 찾은 후 약간의 지연을 두고 위치 재계산 (렌더링 완료 대기)
          setTimeout(() => {
            const updatedElement = document.querySelector(step.targetSelector!) as HTMLElement;
            if (updatedElement) {
              const updatedPosition = calculatePosition(updatedElement);
              setTooltipPosition(updatedPosition);
            }
          }, 100);
        } else {
          // Element not found, retry after a short delay
          console.log('튜토리얼 타겟 요소를 찾지 못함:', step.targetSelector);
          setTargetElement(null);
          // 재시도 (최대 5번, 더 많이 재시도)
          const retryCount = (window as any).__tutorialRetryCount || 0;
          if (retryCount < 5) {
            (window as any).__tutorialRetryCount = retryCount + 1;
            setTimeout(findAndPositionElement, 500);
          } else {
            (window as any).__tutorialRetryCount = 0;
            // 타겟이 없어도 중앙에 표시 (말풍선은 유지)
            setTargetElement(null);
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
      {/* Pixel-style Overlay with highlight */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] bg-black/60 transition-opacity font-galmuri11"
        onClick={(e) => {
          // 툴팁 자체를 클릭한 경우가 아니면 다음으로 진행
          if (e.target === overlayRef.current) {
            handleNext();
          }
        }}
      >
        {/* Pixel-style Highlight area */}
        {targetElement && (
          <div
            className="absolute border-4 border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none transition-all animate-pulse"
            style={{
              top: targetElement.getBoundingClientRect().top - 6,
              left: targetElement.getBoundingClientRect().left - 6,
              width: targetElement.getBoundingClientRect().width + 12,
              height: targetElement.getBoundingClientRect().height + 12,
              boxShadow: `
                0 0 0 9999px rgba(0,0,0,0.6),
                inset 0 0 0 2px rgba(255,255,255,0.3),
                0 0 20px rgba(99, 102, 241, 0.5)
              `,
            }}
          />
        )}
      </div>

      {/* Pixel-style Tooltip */}
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
        <div 
          className="bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] p-6 max-w-sm pointer-events-auto relative font-galmuri11" 
          style={{ maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pixel-style corner decorations */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gray-900" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-gray-900" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gray-900" />

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Pixel-style step badge */}
              <div className="w-8 h-8 bg-indigo-500 border-2 border-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                {currentStep + 1}
              </div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight leading-tight">
                {step.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 hover:bg-gray-100 border-2 border-transparent hover:border-gray-300 transition-colors"
              title="건너뛰기"
            >
              <PixelIcon name="close" size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-5 leading-relaxed border-l-4 border-indigo-200 pl-3 bg-indigo-50 py-2">
            {step.description}
          </p>

          {/* Pixel-style Progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Progress</span>
              <span className="text-xs font-black text-indigo-600 font-mono">
                {currentStep + 1}/{steps.length}
              </span>
            </div>
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 flex-1 border-2 border-gray-900 transition-all ${
                    idx <= currentStep 
                      ? 'bg-indigo-500 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)]' 
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Pixel-style Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevious}
              disabled={isFirst}
              className="px-4 py-2 text-xs font-bold border-2 border-gray-900 bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:transform-none"
            >
              <PixelIcon name="chevron_left" size={14} />
              이전
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-500 text-white border-2 border-gray-900 hover:bg-indigo-600 transition-all text-xs font-black uppercase tracking-tight flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              {isLast ? (
                <>
                  <PixelIcon name="check" size={14} />
                  완료
                </>
              ) : (
                <>
                  다음
                  <PixelIcon name="chevron_right" size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pixel-style Arrow pointing to target */}
        {targetElement && step.position && step.position !== 'center' && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: step.position === 'bottom' ? '100%' : step.position === 'top' ? '-16px' : '50%',
              left: step.position === 'left' || step.position === 'right' 
                ? step.position === 'left' ? '100%' : '-16px'
                : '50%',
              transform: step.position === 'right' 
                ? 'translateY(-50%)'
                : step.position === 'left'
                ? 'translateY(-50%)'
                : step.position === 'top'
                ? 'translateX(-50%)'
                : 'translateX(-50%)',
            }}
          >
            {/* Pixel-style triangle using divs */}
            <div className="relative">
              {step.position === 'bottom' && (
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-gray-900" />
                  <div className="w-5 h-3 bg-gray-900 -mt-3" />
                  <div className="w-7 h-3 bg-white border-4 border-gray-900 -mt-3" />
                </div>
              )}
              {step.position === 'top' && (
                <div className="flex flex-col-reverse items-center">
                  <div className="w-3 h-3 bg-gray-900" />
                  <div className="w-5 h-3 bg-gray-900 -mb-3" />
                  <div className="w-7 h-3 bg-white border-4 border-gray-900 -mb-3" />
                </div>
              )}
              {step.position === 'left' && (
                <div className="flex flex-row-reverse items-center">
                  <div className="w-3 h-3 bg-gray-900" />
                  <div className="w-3 h-5 bg-gray-900 -mr-3" />
                  <div className="w-3 h-7 bg-white border-4 border-gray-900 -mr-3" />
                </div>
              )}
              {step.position === 'right' && (
                <div className="flex flex-row items-center">
                  <div className="w-3 h-3 bg-gray-900" />
                  <div className="w-3 h-5 bg-gray-900 -ml-3" />
                  <div className="w-3 h-7 bg-white border-4 border-gray-900 -ml-3" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
