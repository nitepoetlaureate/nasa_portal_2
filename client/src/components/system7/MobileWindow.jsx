import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTouchGestures } from '../../hooks/useTouchGestures.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useSound } from '../../hooks/useSound.js';

const MobileWindow = ({
  appId,
  title,
  children,
  initialPos = { x: 100, y: 100 },
  isMobile = false,
  isTablet = false,
  onClose,
  onMinimize,
  testId
}) => {
  const [position, setPosition] = useState(initialPos);
  const [size, setSize] = useState(() => {
    if (isMobile) {
      return { width: '95vw', height: '80vh' };
    } else if (isTablet) {
      return { width: 600, height: 500 };
    } else {
      return { width: 600, height: 400 };
    }
  });
  const [isMaximized, setIsMaximized] = useState(isMobile);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zIndex, setZIndex] = useState(100);

  const windowRef = useRef(null);
  const headerRef = useRef(null);
  const resizeHandleRef = useRef(null);

  const { onTouchStart, onTouchMove, onTouchEnd, onSwipe, onPinch } = useTouchGestures();
  const isSmallScreen = useMediaQuery('(max-width: 640px)');
  const playClickSound = useSound('click.wav');
  const playCloseSound = useSound('close.wav');

  // Mobile window management
  useEffect(() => {
    if (isMobile) {
      setIsMaximized(true);
      setPosition({ x: 0, y: 0 });
    }
  }, [isMobile]);

  // Handle window focus
  const handleFocus = useCallback(() => {
    setZIndex(prev => prev + 1);
  }, []);

  // Handle window close
  const handleClose = useCallback(() => {
    playCloseSound();
    if (onClose) {
      onClose(appId);
    }
  }, [onClose, appId, playCloseSound]);

  // Handle window minimize/maximize
  const handleToggleMaximize = useCallback(() => {
    playClickSound();
    setIsMaximized(prev => !prev);
    if (!isMobile) {
      if (!isMaximized) {
        setPosition({ x: 0, y: 0 });
        setSize({ width: '100vw', height: '100vh' });
      } else {
        setPosition(initialPos);
        setSize({ width: 600, height: 400 });
      }
    }
  }, [isMaximized, isMobile, initialPos, playClickSound]);

  const handleMinimize = useCallback(() => {
    playClickSound();
    setIsMinimized(true);
    if (onMinimize) {
      onMinimize(appId);
    }
  }, [onMinimize, appId, playClickSound]);

  // Touch gesture handlers for mobile
  const handleTouchStart = useCallback((e) => {
    if (isMobile) return; // Disable dragging on mobile
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
    onTouchStart(e);
  }, [isMobile, position, onTouchStart]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || isMobile) return;
    e.preventDefault();

    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    // Constrain to viewport
    const maxX = window.innerWidth - (typeof size.width === 'number' ? size.width : 600);
    const maxY = window.innerHeight - (typeof size.height === 'number' ? size.height : 400);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });

    onTouchMove(e);
  }, [isDragging, isMobile, dragStart, size, onTouchMove]);

  const handleTouchEnd = useCallback((e) => {
    setIsDragging(false);
    onTouchEnd(e);
  }, [onTouchEnd]);

  // Swipe gesture for mobile navigation
  const handleSwipe = useCallback((direction) => {
    if (isMobile) {
      switch (direction) {
        case 'down':
          handleMinimize();
          break;
        case 'left':
        case 'right':
          // Could implement app switching here
          break;
      }
    }
  }, [isMobile, handleMinimize]);

  // Pinch gesture for resize on tablet
  const handlePinch = useCallback((scale) => {
    if (isTablet && !isMobile) {
      const newWidth = Math.max(300, Math.min(window.innerWidth - 50, 600 * scale));
      const newHeight = Math.max(200, Math.min(window.innerHeight - 50, 400 * scale));
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isTablet, isMobile]);

  // Window styles
  const windowStyle = {
    position: isMobile ? 'fixed' : 'absolute',
    left: isMobile ? 0 : `${position.x}px`,
    top: isMobile ? 0 : `${position.y}px`,
    width: isMaximized ? '100vw' : size.width,
    height: isMaximized ? '100vh' : size.height,
    zIndex,
    transform: isDragging ? 'scale(0.98)' : 'scale(1)',
    transition: isDragging ? 'none' : 'all 0.2s ease-in-out'
  };

  const headerStyle = {
    cursor: isMobile ? 'default' : 'move'
  };

  if (isMinimized) {
    return null;
  }

  return (
    <div
      ref={windowRef}
      data-testid={testId}
      className="fixed bg-gray-300 border-2 border-t-white border-l-white border-r-gray-500 border-b-gray-500 shadow-lg"
      style={windowStyle}
      onClick={handleFocus}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-labelledby={`window-title-${appId}`}
      aria-modal="true"
    >
      {/* Window header with System 7 styling */}
      <div
        ref={headerRef}
        className="flex items-center justify-between bg-gray-300 px-2 py-1 border-b border-t-white border-l-white border-r-gray-500 border-b-gray-500"
        style={headerStyle}
      >
        <div className="flex items-center">
          {/* System 7 window controls */}
          {!isMobile && (
            <div className="flex items-center mr-2">
              <button
                className="w-4 h-4 bg-gray-700 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 mr-1"
                onClick={handleClose}
                aria-label="Close window"
              >
                <span className="sr-only">Close</span>
              </button>
              <button
                className="w-4 h-4 bg-gray-700 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 mr-1"
                onClick={handleToggleMaximize}
                aria-label="Maximize window"
              >
                <span className="sr-only">Maximize</span>
              </button>
              <button
                className="w-4 h-4 bg-gray-700 border border-t-white border-l-white border-r-gray-500 border-b-gray-500"
                onClick={handleMinimize}
                aria-label="Minimize window"
              >
                <span className="sr-only">Minimize</span>
              </button>
            </div>
          )}

          {/* Mobile header controls */}
          {isMobile && (
            <div className="flex items-center mr-2">
              <button
                className="p-2 text-gray-700 hover:bg-gray-400 rounded"
                onClick={handleClose}
                aria-label="Close window"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
          )}

          {/* Window title */}
          <h2
            id={`window-title-${appId}`}
            className="font-chicago text-sm font-bold text-black"
          >
            {title}
          </h2>
        </div>

        {/* Mobile-specific controls */}
        {isMobile && (
          <div className="flex items-center">
            <button
              className="p-2 text-gray-700 hover:bg-gray-400 rounded"
              onClick={handleToggleMaximize}
              aria-label="Toggle maximize"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Window content area */}
      <div
        className="bg-white overflow-auto"
        style={{
          height: isMaximized ? 'calc(100vh - 40px)' : `calc(${size.height} - 40px)`,
          width: isMaximized ? '100vw' : size.width
        }}
      >
        {children}
      </div>

      {/* Resize handle for desktop/tablet */}
      {!isMobile && (
        <div
          ref={resizeHandleRef}
          className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 cursor-se-resize"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #a0a0a0 50%)'
          }}
        />
      )}
    </div>
  );
};

export default MobileWindow;