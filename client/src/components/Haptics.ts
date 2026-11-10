// client/src/components/Haptics.ts

export const haptic = {
  vibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore if not supported or disabled by user agent
      }
    }
  },

  tap() {
    this.vibrate(25);
  },

  correct() {
    this.vibrate([30, 50, 40]);
  },

  incorrect() {
    this.vibrate([100, 60, 100]);
  },

  yourTurn() {
    this.vibrate([80, 50, 80]);
  },

  conquest() {
    this.vibrate(60);
  },

  capitalHit() {
    this.vibrate([150, 60, 150]);
  },

  elimination() {
    this.vibrate([250, 100, 300]);
  }
};
