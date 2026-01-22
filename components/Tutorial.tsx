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

    // Find target element
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      if (element) {
        setTargetElement(element);
        
        // Calculate tooltip position
        const rect = element.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        let top = 0;
        let left = 0;
        
        switch (step.position) {
          case 'top':
            top = rect.top + scrollY - 10;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + scrollY + 10;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case 'left':
            top = rect.top + scrollY + rect.height / 2;
            left = rect.left + scrollX - 10;
            break;
          case 'right':
            top = rect.top + scrollY + rect.height / 2;
            left = rect.right + scrollX + 10;
            break;
          case 'center':
          default:
            top = rect.top + scrollY + rect.height / 2;
            left = rect.left + scrollX + rect.width / 2;
            break;
        }
        
        setTooltipPosition({ top, left });
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetElement(null);
      }
    } else {
      setTargetElement(null);
      // Center position for steps without target
      setTooltipPosition({
        top: window.innerHeight / 2 + window.scrollY,
        left: window.innerWidth / 2 + window.scrollX,
      });
    }
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
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm pointer-events-auto border-2 border-blue-500">
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
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              {isLast ? '완료' : '다음'}
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
