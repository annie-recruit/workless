'use client';

import React, { useState, useEffect } from 'react';
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

// 글로벌 캐시 - 모든 PixelIcon 인스턴스가 공유
let manifestCache: Record<string, string> | null = null;
let manifestPromise: Promise<Record<string, string>> | null = null;

const fetchManifest = async (): Promise<Record<string, string>> => {
  if (manifestCache) return manifestCache;
  if (manifestPromise) return manifestPromise;

  manifestPromise = (async () => {
    try {
      const response = await fetch('/assets/icons/manifest.json');
      if (!response.ok) return {};
      const data = await response.json();
      manifestCache = data;
      return data;
    } catch (err) {
      console.warn('[PixelIcon] manifest 로드 실패:', err);
      manifestCache = {};
      return {};
    }
  })();

  return manifestPromise;
};

/**
 * PixelLab로 생성된 UI 아이콘 또는 Iconify pixelarticons를 렌더링하는 컴포넌트
 * 1. manifest.json에서 생성된 아이콘을 먼저 찾고
 * 2. 없으면 Iconify pixelarticons를 fallback으로 사용합니다.
 */
export default function PixelIcon({
  name,
  size = 32,
  className = '',
  style = {},
}: PixelIconProps) {
  const [iconSrc, setIconSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(!manifestCache);
  const [useIconify, setUseIconify] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadIcon = async () => {
      const manifest = await fetchManifest();
      if (!isMounted) return;

      const iconPath = manifest[name];
      if (iconPath) {
        setIconSrc(iconPath);
        setUseIconify(false);
      } else {
        setUseIconify(true);
      }
      setLoading(false);
    };

    if (manifestCache) {
      const iconPath = manifestCache[name];
      if (iconPath) {
        setIconSrc(iconPath);
        setUseIconify(false);
      } else {
        setUseIconify(true);
      }
      setLoading(false);
    } else {
      loadIcon();
    }

    return () => {
      isMounted = false;
    };
  }, [name]);

  // 크기는 반드시 정수로
  const iconSize = Math.round(size);

  if (loading) {
    return (
      <span
        className={`inline-block ${className}`}
        style={{
          width: iconSize,
          height: iconSize,
          ...style,
        }}
        aria-label={`${name} 아이콘 로딩 중`}
      />
    );
  }

  // Iconify pixelarticons 사용
  if (useIconify) {
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

  // manifest에서 로드한 이미지 사용
  if (!iconSrc) {
    // 아이콘이 없으면 Iconify로 fallback
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
