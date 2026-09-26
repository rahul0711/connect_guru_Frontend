import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  View,
  type KeyboardEvent,
  type ScrollViewProps,
} from 'react-native';

// Gap kept between the focused input and the top of the keyboard
const GAP_ABOVE_KEYBOARD = 24;

/**
 * Drop-in ScrollView replacement that keeps the focused input above the keyboard.
 *
 * With Android edge-to-edge the window no longer resizes for the keyboard, so
 * KeyboardAvoidingView with `behavior={undefined}` does nothing. This adds the
 * keyboard height as extra scroll space (so the user can scroll down to fields
 * hidden behind it), scrolls the focused input into view, and removes the space
 * again when the keyboard closes. Works in Expo Go (no native dependency).
 */
export function KeyboardAwareScrollView({
  children,
  onTouchEnd,
  ...props
}: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const innerRef = useRef<View>(null);
  const containerRef = useRef<View>(null);
  // Keyboard top edge, in the same coordinates as measureInWindow
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollFocusedInputIntoView = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current;
    const inner = innerRef.current;
    const container = containerRef.current;
    const kbTop = keyboardTop.current;
    if (!input || !scroll || !inner || !container || kbTop === null) return;

    input.measureInWindow((_x, inputTop, _w, inputHeight) => {
      // Already fully visible above the keyboard
      if (inputTop + inputHeight + GAP_ABOVE_KEYBOARD <= kbTop) return;

      container.measureInWindow((_sx, scrollTop) => {
        input.measureLayout(inner, (_cx, contentY) => {
          const visibleHeight = kbTop - scrollTop;
          const target =
            contentY + inputHeight + GAP_ABOVE_KEYBOARD - visibleHeight;
          scroll.scrollTo({ y: Math.max(0, target), animated: true });
        });
      });
    });
  };

  useEffect(() => {
    // iOS gives "will" events (in sync with the keyboard animation); Android only "did"
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      // screenY is relative to the physical screen, but measureInWindow can be
      // relative to a window that starts below the status bar (e.g. Expo Go).
      // Subtracting it errs on the side of scrolling slightly more.
      const statusBarOffset =
        Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
      keyboardTop.current = e.endCoordinates.screenY - statusBarOffset;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll once the extra space below is rendered, otherwise scrollTo gets
  // clamped by the old content height
  useEffect(() => {
    if (keyboardHeight > 0) requestAnimationFrame(scrollFocusedInputIntoView);
  }, [keyboardHeight]);

  return (
    <View ref={containerRef} collapsable={false} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        innerViewRef={innerRef as RefObject<View>}
        keyboardShouldPersistTaps="handled"
        {...props}
        onTouchEnd={(e) => {
          // Tapping another input while the keyboard is already open
          if (keyboardTop.current !== null)
            setTimeout(scrollFocusedInputIntoView, 100);
          onTouchEnd?.(e);
        }}
      >
        {children}
        {keyboardHeight > 0 && <View style={{ height: keyboardHeight }} />}
      </ScrollView>
    </View>
  );
}
