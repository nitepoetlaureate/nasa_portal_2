import { useState, useRef, useCallback, useEffect } from 'react';

export const useTouchGestures = () => {
  const [gestureState, setGestureState] = useState({
    touches: [],
    startDistance: 0,
    lastTap: 0,
    isGesturing: false
  });

  const gestureTimeoutRef = useRef(null);
  const gestureStartPosRef = useRef({ x: 0, y: 0 });

  // Calculate distance between two touch points for pinch gesture
  const getDistance = useCallback((touches) => {
    if (touches.length < 2) return 0;

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const onTouchStart = useCallback((e) => {
    const touches = Array.from(e.touches);
    const now = Date.now();

    setGestureState(prev => ({
      ...prev,
      touches,
      startDistance: getDistance(touches),
      isGesturing: true
    }));

    // Store initial position for swipe detection
    if (touches.length === 1) {
      gestureStartPosRef.current = {
        x: touches[0].clientX,
        y: touches[0].clientY
      };
    }

    // Detect double tap
    const timeSinceLastTap = now - gestureState.lastTap;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }

      // Trigger double tap event
      const event = new CustomEvent('doubletap', {
        detail: {
          x: touches[0].clientX,
          y: touches[0].clientY
        },
        bubbles: true
      });
      e.target.dispatchEvent(event);

      setGestureState(prev => ({ ...prev, lastTap: 0 }));
    } else {
      // Single tap - wait to see if it becomes a double tap
      gestureTimeoutRef.current = setTimeout(() => {
        const event = new CustomEvent('tap', {
          detail: {
            x: touches[0].clientX,
            y: touches[0].clientY
          },
          bubbles: true
        });
        e.target.dispatchEvent(event);
      }, 300);

      setGestureState(prev => ({ ...prev, lastTap: now }));
    }
  }, [getDistance, gestureState.lastTap]);

  // Handle touch move
  const onTouchMove = useCallback((e) => {
    const touches = Array.from(e.touches);

    // Clear single tap timeout if we're moving
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }

    if (touches.length === 1) {
      // Single finger gesture - detect swipe
      const currentX = touches[0].clientX;
      const currentY = touches[0].clientY;
      const deltaX = currentX - gestureStartPosRef.current.x;
      const deltaY = currentY - gestureStartPosRef.current.y;

      // Minimum distance for swipe detection
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        let direction = null;

        // Determine primary direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        // Trigger swipe event
        const event = new CustomEvent('swipe', {
          detail: {
            direction,
            deltaX,
            deltaY,
            startX: gestureStartPosRef.current.x,
            startY: gestureStartPosRef.current.y,
            endX: currentX,
            endY: currentY
          },
          bubbles: true
        });
        e.target.dispatchEvent(event);

        // Reset start position to prevent multiple swipes
        gestureStartPosRef.current = { x: currentX, y: currentY };
      }
    } else if (touches.length === 2) {
      // Two finger gesture - detect pinch
      const currentDistance = getDistance(touches);
      const startDistance = gestureState.startDistance;

      if (startDistance > 0) {
        const scale = currentDistance / startDistance;

        // Trigger pinch event
        const event = new CustomEvent('pinch', {
          detail: {
            scale,
            distance: currentDistance,
            startDistance
          },
          bubbles: true
        });
        e.target.dispatchEvent(event);
      }
    }
  }, [getDistance, gestureState.startDistance]);

  // Handle touch end
  const onTouchEnd = useCallback((e) => {
    // Clear any pending tap timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }

    setGestureState(prev => ({
      ...prev,
      touches: Array.from(e.touches),
      isGesturing: false
    }));

    // Reset gesture state when all touches end
    if (e.touches.length === 0) {
      setGestureState({
        touches: [],
        startDistance: 0,
        lastTap: 0,
        isGesturing: false
      });
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  // Gesture handlers for components
  const onTap = useCallback((handler) => {
    return (e) => {
      const handleTap = (event) => {
        handler(event.detail);
        e.target.removeEventListener('tap', handleTap);
      };
      e.target.addEventListener('tap', handleTap);
    };
  }, []);

  const onDoubleTap = useCallback((handler) => {
    return (e) => {
      const handleDoubleTap = (event) => {
        handler(event.detail);
        e.target.removeEventListener('doubletap', handleDoubleTap);
      };
      e.target.addEventListener('doubletap', handleDoubleTap);
    };
  }, []);

  const onSwipe = useCallback((handler) => {
    return (e) => {
      const handleSwipe = (event) => {
        handler(event.detail);
        e.target.removeEventListener('swipe', handleSwipe);
      };
      e.target.addEventListener('swipe', handleSwipe);
    };
  }, []);

  const onPinch = useCallback((handler) => {
    return (e) => {
      const handlePinch = (event) => {
        handler(event.detail);
        e.target.removeEventListener('pinch', handlePinch);
      };
      e.target.addEventListener('pinch', handlePinch);
    };
  }, []);

  return {
    gestureState,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTap,
    onDoubleTap,
    onSwipe,
    onPinch
  };
};