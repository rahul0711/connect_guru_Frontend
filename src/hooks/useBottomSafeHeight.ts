/**
 * useBottomSafeHeight
 * Returns the bottom safe-area inset so absolute-positioned bottom bars
 * are never hidden behind the system navigation bar (gesture pill / buttons).
 *
 * Usage in a stylesheet:
 *   const insets = useBottomSafeHeight();
 *   bottomBar: { paddingBottom: insets + 10, ... }
 *
 * Or inline:
 *   <View style={{ paddingBottom: useBottomSafeHeight() + 14 }}>
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomSafeHeight() {
  const insets = useSafeAreaInsets();
  // At minimum 8 px even on phones that report 0 (avoids edge-flush buttons)
  return Math.max(insets.bottom, 8);
}
