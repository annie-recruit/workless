'use client';

import React from 'react';

interface PixelIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  variant?: 'regular' | 'solid';
}

// 위젯/기능별 아이콘 매핑
const ICON_MAP: Record<string, string> = {
  // 위젯 타입
  viewer: 'eye',
  calendar: 'calender',
  'meeting-recorder': 'sound-on',
  memory: 'clipboard',
  memo: 'clipboard',
  note: 'clipboard',
  
  // 일반 아이콘
  microphone: 'sound-on',
  recorder: 'sound-on',
  document: 'newspaper',
  file: 'newspaper',
  search: 'search',
  edit: 'edit',
  delete: 'trash',
  save: 'save',
  close: 'times',
  check: 'check',
  plus: 'plus',
  minus: 'minus',
  arrow: 'arrow-right',
  home: 'home',
  user: 'user',
  users: 'users',
  settings: 'cog',
  star: 'star',
  heart: 'heart',
  bookmark: 'bookmark',
};

// SVG를 동적으로 로드하는 함수
async function loadSVG(iconName: string, variant: 'regular' | 'solid'): Promise<string | null> {
  try {
    // Next.js에서는 require를 사용하여 정적으로 import
    // 동적 import를 위해 try-catch 사용
    const iconFile = variant === 'solid' ? `${iconName}-solid` : iconName;
    const svgModule = await import(
      `@hackernoon/pixel-icon-library/icons/SVG/${variant}/${iconFile}.svg?raw`
    );
    return svgModule.default;
  } catch (error) {
    // 대안: 직접 파일 시스템에서 읽기 (서버 사이드)
    try {
      const fs = require('fs');
      const path = require('path');
      const iconFile = variant === 'solid' ? `${iconName}-solid` : iconName;
      const iconPath = path.join(
        process.cwd(),
        'node_modules',
        '@hackernoon',
        'pixel-icon-library',
        'icons',
        'SVG',
        variant,
        `${iconFile}.svg`
      );
      return fs.readFileSync(iconPath, 'utf-8');
    } catch (fsError) {
      console.error(`Failed to load icon: ${iconName}`, error);
      return null;
    }
  }
}

export default function PixelIcon({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
  variant = 'regular',
}: PixelIconProps) {
  const iconName = ICON_MAP[name] || name;
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // 클라이언트 사이드에서 SVG 로드
    if (typeof window !== 'undefined') {
      const iconFile = variant === 'solid' ? `${iconName}-solid` : iconName;
      // public 폴더에서 로드
      const iconPath = `/icons/pixel/${iconFile}.svg`;
      
      fetch(iconPath)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Icon not found');
          }
          return res.text();
        })
        .then((text) => {
          // SVG의 fill 속성을 currentColor로 변경하여 색상 커스터마이징 가능하게
          const modifiedSvg = text
            .replace(/fill="[^"]*"/g, `fill="${color}"`)
            .replace(/fill='[^']*'/g, `fill="${color}"`)
            .replace(/<svg([^>]*)>/, `<svg$1 width="${size}" height="${size}" style="display: inline-block;">`);
          setSvgContent(modifiedSvg);
        })
        .catch(() => {
          setError(true);
        });
    }
  }, [iconName, variant, color, size]);

  if (error) {
    // 폴백: 간단한 placeholder
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          opacity: 0.3,
          borderRadius: '2px',
          display: 'inline-block',
        }}
      />
    );
  }

  if (!svgContent) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: 'inline-block',
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

// 아이콘 이름 타입 export (타입 안전성을 위해)
export const iconNames = Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>;
