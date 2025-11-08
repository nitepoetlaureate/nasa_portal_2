import React, { forwardRef } from 'react';

const MobileDesktopIcon = forwardRef(({
  name,
  fullLabel,
  testId,
  IconComponent,
  isSelected,
  onTap,
  onSelect,
  onDoubleClick,
  onFocus,
  onKeyDown,
  ariaLabel,
  isDesktop = false
}, ref) => {
  const baseClasses = `
    relative flex flex-col items-center justify-center
    ${isDesktop
      ? 'w-20 h-20 m-4 p-2'
      : 'w-full h-24 p-3 rounded-xl bg-gray-700 bg-opacity-50 hover:bg-opacity-70'
    }
    cursor-pointer select-none
    transition-all duration-200 ease-in-out
    ${isSelected ? 'ring-2 ring-blue-400 ring-opacity-70' : ''}
    hover:scale-105 active:scale-95
  `;

  const iconClasses = `
    ${isDesktop ? 'w-12 h-12' : 'w-10 h-10'}
    flex items-center justify-center
    ${isSelected ? 'filter brightness-125' : 'hover:filter hover:brightness-110'}
  `;

  const textClasses = `
    text-center mt-1 px-1
    ${isDesktop
      ? 'text-xs font-chicago text-black'
      : 'text-sm font-geneva text-white font-medium'
    }
    ${isSelected ? 'font-bold' : ''}
  `;

  const handleInteraction = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Haptic feedback for mobile
    if (!isDesktop && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (isDesktop) {
      // Desktop behavior: select on single click, open on double click
      onSelect();
    } else {
      // Mobile behavior: open on single tap
      onTap();
    }
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isDesktop && onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={baseClasses}
      onClick={handleInteraction}
      onDoubleClick={handleDoubleClick}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        setTimeout(() => {
          e.currentTarget.style.transform = 'scale(1)';
        }, 100);
      }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      role="button"
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      tabIndex={0}
    >
      {/* Icon container */}
      <div className={iconClasses}>
        <IconComponent />
      </div>

      {/* Label */}
      <div className={textClasses}>
        {isDesktop ? name : fullLabel}
      </div>

      {/* Selection indicator for desktop */}
      {isDesktop && isSelected && (
        <div className="absolute inset-0 border-2 border-blue-400 border-opacity-50 rounded pointer-events-none" />
      )}

      {/* Touch ripple effect for mobile */}
      {!isDesktop && (
        <div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          style={{ zIndex: -1 }}
        >
          <div
            className="absolute inset-0 bg-white opacity-0 hover:opacity-10 active:opacity-20 transition-opacity duration-150"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)'
            }}
          />
        </div>
      )}
    </div>
  );
});

MobileDesktopIcon.displayName = 'MobileDesktopIcon';

export default MobileDesktopIcon;