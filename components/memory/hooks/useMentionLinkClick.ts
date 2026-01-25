import { useEffect, type RefObject } from 'react';

export function useMentionLinkClick(
  contentRef: RefObject<HTMLElement | null>,
  onMentionClick?: (mentionedMemoryId: string) => void,
  htmlDependency?: string
) {
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mentionLink = target.closest('a[data-memory-id]');
      if (!mentionLink) return;

      e.preventDefault();
      e.stopPropagation();
      const memoryId = mentionLink.getAttribute('data-memory-id');
      if (memoryId && onMentionClick) onMentionClick(memoryId);
    };

    contentElement.addEventListener('click', handleClick);
    return () => {
      contentElement.removeEventListener('click', handleClick);
    };
  }, [contentRef, onMentionClick, htmlDependency]);
}
