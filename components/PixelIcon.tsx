'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface PixelIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Iconify pixelarticons 아이콘 이름 매핑
const ICON_MAP: Record<string, string> = {
  // 위젯 타입
  'calendar': 'pixelarticons:calendar',
  'minimap': 'pixelarticons:map',
  'viewer': 'pixelarticons:device-tv',
  'meeting-recorder': 'pixelarticons:audio-device',
  'database': 'pixelarticons:chart',
  'memory': 'pixelarticons:clipboard',
  'memo': 'pixelarticons:clipboard',
  'note': 'pixelarticons:clipboard',

  // 일반 아이콘
  'microphone': 'pixelarticons:audio-device',
  'recorder': 'pixelarticons:audio-device',
  'document': 'pixelarticons:file',
  'file': 'pixelarticons:file',
  'pdf': 'pixelarticons:file',
  'docx': 'pixelarticons:file',
  'search': 'pixelarticons:search',
  'edit': 'pixelarticons:edit',
  'delete': 'pixelarticons:delete',
  'save': 'pixelarticons:save',
  'close': 'pixelarticons:close',
  'check': 'pixelarticons:check',
  'plus': 'pixelarticons:plus',
  'minus': 'pixelarticons:minus',
  'arrow': 'pixelarticons:arrow-right',
  'home': 'pixelarticons:home',
  'user': 'pixelarticons:user',
  'users': 'pixelarticons:users',
  'settings': 'pixelarticons:cog',
  'star': 'pixelarticons:star',
  'heart': 'pixelarticons:heart',
  'bookmark': 'pixelarticons:bookmark',

  // 추가 아이콘
  'link': 'pixelarticons:link',
  'folder': 'pixelarticons:folder',
  'lightbulb': 'pixelarticons:spotlight',
  'alert': 'pixelarticons:alert',
  'warning': 'pixelarticons:alert',
  'attachment': 'pixelarticons:attachment',
  'clock': 'pixelarticons:clock',
  'clipboard': 'pixelarticons:clipboard',
  'image': 'pixelarticons:image',
  'success': 'pixelarticons:check',
  'error': 'pixelarticons:close',
  'info': 'pixelarticons:info',
  'download': 'pixelarticons:cloud-download',
  'upload': 'pixelarticons:cloud-upload',
  'archive': 'pixelarticons:archive',
  'refresh': 'pixelarticons:refresh',
  'menu': 'pixelarticons:menu',
  'apps': 'pixelarticons:apps',
  'widgets': 'pixelarticons:apps',
  'filter': 'pixelarticons:filter',
  'sort': 'pixelarticons:sort',
  'list': 'pixelarticons:list',
  'pin': 'pixelarticons:pin',
  'unpin': 'pixelarticons:pin-off',
  'play': 'pixelarticons:play',
  'pause': 'pixelarticons:pause',
  'stop': 'pixelarticons:stop',
  'next': 'pixelarticons:arrow-right',
  'prev': 'pixelarticons:arrow-left',
  'back': 'pixelarticons:arrow-left',
  'forward': 'pixelarticons:arrow-right',
  'up': 'pixelarticons:arrow-up',
  'down': 'pixelarticons:arrow-down',
  'tag': 'pixelarticons:label',
  'summary': 'pixelarticons:file',
  'topic': 'pixelarticons:label',
  'email': 'pixelarticons:mail',
  'mail': 'pixelarticons:mail',
  'lock': 'pixelarticons:lock',
  'security': 'pixelarticons:lock',
  'target': 'pixelarticons:target',
  'sparkles': 'pixelarticons:sparkles',
  'magic': 'pixelarticons:sparkles',
  'chart': 'pixelarticons:chart',
  'timeline': 'pixelarticons:chart',
  'bulb': 'pixelarticons:spotlight',
  'idea': 'pixelarticons:spotlight',
  'zap': 'pixelarticons:zap',
  'bolt': 'pixelarticons:zap',

  // 메모리카드 액션 아이콘 (pixelarticons 고정)
  'group': 'pixelarticons:group',
  'edit-box': 'pixelarticons:edit-box',
  'trash-alt': 'pixelarticons:trash-alt',
};

// 정적 매니페스트 (public/assets/icons/manifest.json 내용)
// 로딩 딜레이를 없애기 위해 하드코딩
const STATIC_MANIFEST: Record<string, string> = {
  "trash": "/assets/icons/trash.png",
  "check": "/assets/icons/check.png",
  "bundle": "/assets/icons/bundle.png",
  "edit": "/assets/icons/edit.png",
  "delete": "/assets/icons/delete.png",
  "persona_default": "/assets/icons/persona_default.png",
  "persona_hr": "/assets/icons/persona_hr.png",
  "persona_chef": "/assets/icons/persona_chef.png",
  "persona_developer": "/assets/icons/persona_developer.png",
  "persona_student": "/assets/icons/persona_student.png",
  "pixel_flag": "/assets/icons/pixel_flag.png"
};

/**
 * PixelLab로 생성된 UI 아이콘 또는 Iconify pixelarticons를 렌더링하는 컴포넌트
 * 1. 로컬 정적 에셋(manifest)을 먼저 확인하고
 * 2. 없으면 Iconify pixelarticons를 fallback으로 사용합니다.
 * 
 * 모든 로직이 동기적으로 처리되므로 로딩 깜빡임이 없습니다.
 */
export default function PixelIcon({
  name,
  size = 32,
  className = '',
  style = {},
}: PixelIconProps) {
  // 크기는 반드시 정수로
  const iconSize = Math.round(size);

  const iconSrc = STATIC_MANIFEST[name];

  // 1. manifest에 있는 로컬 이미지 사용
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={`${name} 아이콘`}
        width={iconSize}
        height={iconSize}
        className={`pixel-icon ${className}`}
        style={{
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style,
        }}
        loading="eager"
        decoding="sync"
      />
    );
  }

  // 2. Iconify pixelarticons 사용
  const iconName = ICON_MAP[name] || `pixelarticons:${name}`;
  return (
    <Icon
      icon={iconName}
      width={iconSize}
      height={iconSize}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
