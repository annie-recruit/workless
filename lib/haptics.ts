// 햅틱 피드백 유틸리티

export const haptics = {
  // 가벼운 탭 (버튼 클릭)
  light() {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // 중간 피드백 (성공, 경고)
  medium() {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  // 강한 피드백 (에러, 중요 알림)
  heavy() {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  // 성공 패턴
  success() {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  // 에러 패턴
  error() {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30, 50, 30]);
    }
  },

  // 알림 패턴
  notification() {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 100, 20]);
    }
  },
};
