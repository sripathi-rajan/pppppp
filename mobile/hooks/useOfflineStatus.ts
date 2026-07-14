import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Proactive online/offline tracking on web via the browser's online/offline events.
 * Native has no equivalent listener wired up in this project (no NetInfo dependency), so it
 * stays optimistic here and relies on request failures to detect being offline, same as the
 * existing useQuery hook already does.
 */
export function useOfflineStatus(): boolean {
  const [isOffline, setIsOffline] = useState(
    Platform.OS === 'web' && typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOffline;
}
