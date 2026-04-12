import { useEffect, useRef } from 'react';

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutos en milisegundos

export function useSessionTimeout(isActive: boolean, onLogout: () => void) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isActive) {
      timeoutRef.current = setTimeout(() => {
        onLogout();
      }, TIMEOUT_DURATION);
    }
  };

  useEffect(() => {
    if (isActive) {
      const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click',
        'keydown'
      ];

      const handleUserActivity = () => {
        resetTimeout();
      };

      events.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });

      resetTimeout();

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        events.forEach(event => {
          window.removeEventListener(event, handleUserActivity);
        });
      };
    }
  }, [isActive, onLogout]);
}
