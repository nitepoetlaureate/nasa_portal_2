import React, { forwardRef } from 'react';

const DesktopIcon = forwardRef(({
    name,
    IconComponent,
    onDoubleClick,
    onClick,
    onFocus,
    onKeyDown,
    testId,
    isSelected = false,
    ariaLabel
}, ref) => {
    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) onClick();
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (onDoubleClick) onDoubleClick();
    };

    const handleKeyDown = (e) => {
        if (onKeyDown) onKeyDown(e);
    };

    const handleFocus = (e) => {
        if (onFocus) onFocus();
    };

    return (
        <div
            ref={ref}
            data-testid={testId}
            className={`flex flex-col items-center w-24 text-center cursor-pointer select-none ${
                isSelected ? 'selected' : ''
            }`}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            role="button"
            aria-label={ariaLabel || name}
            tabIndex="0"
        >
            <div className="w-12 h-12 flex items-center justify-center">
                <IconComponent />
            </div>
            <span className="mt-2 text-white bg-s7-blue px-1 select-none" aria-hidden="true">
                {name}
            </span>
        </div>
    );
});

DesktopIcon.displayName = 'DesktopIcon';

export default DesktopIcon;
