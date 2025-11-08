import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useApps } from '../../contexts/AppContext.jsx';
import MobileWindow from './MobileWindow.jsx';
import MobileDesktopIcon from './MobileDesktopIcon.jsx';
import { ApodIcon, NeoWsIcon, NavigatorIcon, ImageViewerIcon } from '../../assets/icons';
import { useSound } from '../../hooks/useSound.js';
import { useTouchGestures } from '../../hooks/useTouchGestures.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';

const MobileDesktop = () => {
    const { apps, openApp, closeApp, bringToFront } = useApps();
    const openWindows = Object.values(apps).filter(app => app.isOpen);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [error, setError] = useState(null);
    const [announcement, setAnnouncement] = useState('');
    const [isMobileView, setIsMobileView] = useState(false);
    const [dockVisible, setDockVisible] = useState(true);
    const desktopRef = useRef(null);

    // Custom hooks for mobile optimization
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');
    const {
        onTap,
        onDoubleTap,
        onSwipe,
        onPinch,
        onTouchStart,
        onTouchMove,
        onTouchEnd
    } = useTouchGestures();

    const playClickSound = useSound('click.wav');
    const playOpenSound = useSound('open.wav');

    // Responsive layout detection
    useEffect(() => {
        setIsMobileView(isMobile);
    }, [isMobile]);

    // Mobile-optimized icon interaction with haptic feedback
    const handleIconTap = useCallback(async (appId, appName) => {
        try {
            setError(null);

            // Haptic feedback on mobile
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }

            playOpenSound();
            setAnnouncement(`Opening ${appName}`);

            // For mobile, open immediately without double-tap
            if (isMobileView) {
                await openApp(appId);
                setAnnouncement(`${appName} opened successfully`);
            }
        } catch (err) {
            setError('Failed to open application');
            setAnnouncement(`Error opening ${appName}`);
            console.error('Failed to open app:', err);
        }
    }, [openApp, playOpenSound, isMobileView]);

    // Desktop double-click fallback
    const handleIconDoubleClick = useCallback(async (appId, appName) => {
        if (!isMobileView) {
            await handleIconTap(appId, appName);
        }
    }, [handleIconTap, isMobileView]);

    // Icon selection for keyboard navigation
    const handleIconSelect = useCallback((iconId) => {
        playClickSound();
        setSelectedIcon(iconId);
        setAnnouncement(`Selected ${iconId}`);

        // Haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(25);
        }
    }, [playClickSound]);

    // Swipe gestures for mobile navigation
    const handleSwipe = useCallback((direction) => {
        switch (direction) {
            case 'left':
                // Switch to next app
                setAnnouncement('Swipe left - Next app');
                break;
            case 'right':
                // Switch to previous app
                setAnnouncement('Swipe right - Previous app');
                break;
            case 'up':
                // Show/hide dock on mobile
                if (isMobileView) {
                    setDockVisible(!dockVisible);
                    setAnnouncement(dockVisible ? 'Dock hidden' : 'Dock shown');
                }
                break;
            case 'down':
                // Minimize current window on mobile
                setAnnouncement('Swipe down - Minimize window');
                break;
        }
    }, [isMobileView, dockVisible]);

    // Pinch gesture for zoom
    const handlePinch = useCallback((scale) => {
        if (scale > 1.2) {
            setAnnouncement('Zoom in');
        } else if (scale < 0.8) {
            setAnnouncement('Zoom out');
        }
    }, []);

    // Touch event handlers
    const handleTouchStart = useCallback((e) => {
        onTouchStart(e);
    }, [onTouchStart]);

    const handleTouchMove = useCallback((e) => {
        onTouchMove(e);
        // Prevent scrolling during gestures
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, [onTouchMove]);

    const handleTouchEnd = useCallback((e) => {
        onTouchEnd(e);
    }, [onTouchEnd]);

    // Keyboard navigation
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            setSelectedIcon(null);
            setAnnouncement('Selection cleared');
        }
    }, []);

    const handleClickOutside = useCallback(() => {
        setSelectedIcon(null);
    }, []);

    // Icon focus for accessibility
    const handleIconFocus = useCallback((iconId) => {
        setAnnouncement(`Focused on ${iconId}`);
    }, []);

    const handleIconKeyDown = useCallback((event, appId, appName) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleIconTap(appId, appName);
        }
    }, [handleIconTap]);

    // Mobile dock configuration
    const mobileDockApps = [
        { id: 'apod', name: 'APOD', IconComponent: ApodIcon, label: 'Astronomy Picture' },
        { id: 'neows', name: 'NEO', IconComponent: NeoWsIcon, label: 'Near Earth Objects' },
        { id: 'resources', name: 'Navigator', IconComponent: NavigatorIcon, label: 'Resource Navigator' },
        { id: 'imageViewer', name: 'Viewer', IconComponent: ImageViewerIcon, label: 'Image Viewer' }
    ];

    return (
        <>
            {/* Screen reader announcements */}
            <div
                data-testid="screen-reader-announcements"
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
            >
                {announcement}
            </div>

            {/* Error message with mobile-friendly positioning */}
            {error && (
                <div
                    data-testid="error-message"
                    className="fixed top-4 left-4 right-4 md:right-auto md:left-auto md:top-4 md:right-4 bg-red-500 text-white p-3 md:p-4 rounded shadow-lg z-50 text-sm md:text-base"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {/* Main desktop container with responsive design */}
            <main
                ref={desktopRef}
                data-testid="mobile-desktop"
                className={`w-full h-full relative overflow-hidden ${
                    isMobileView ? 'p-2 pt-6' : 'p-4 pt-8'
                }`}
                style={{
                    backgroundColor: '#808080',
                    touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal swipes
                    WebkitUserSelect: 'none', // Prevent text selection during touch gestures
                    userSelect: 'none'
                }}
                onClick={handleClickOutside}
                onKeyDown={handleKeyDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                role="main"
                aria-label="NASA System 7 Mobile Desktop"
                tabIndex="0"
            >
                {/* Mobile grid layout for app icons */}
                {isMobileView ? (
                    <div className="grid grid-cols-2 gap-4 p-4 pb-20">
                        {mobileDockApps.map((app) => (
                            <MobileDesktopIcon
                                key={app.id}
                                name={app.name}
                                fullLabel={app.label}
                                testId={`mobile-icon-${app.id}`}
                                IconComponent={app.IconComponent}
                                isSelected={selectedIcon === app.id}
                                onTap={() => handleIconTap(app.id, app.label)}
                                onSelect={() => handleIconSelect(app.id)}
                                onDoubleClick={() => handleIconDoubleClick(app.id, app.label)}
                                onFocus={() => handleIconFocus(app.label)}
                                onKeyDown={(e) => handleIconKeyDown(e, app.id, app.label)}
                                ariaLabel={`${app.label} - Tap to open`}
                            />
                        ))}
                    </div>
                ) : (
                    /* Desktop layout for larger screens */
                    <div className="flex flex-wrap justify-start gap-6 p-4">
                        {mobileDockApps.map((app) => (
                            <MobileDesktopIcon
                                key={app.id}
                                name={app.name}
                                fullLabel={app.label}
                                testId={`desktop-icon-${app.id}`}
                                IconComponent={app.IconComponent}
                                isSelected={selectedIcon === app.id}
                                onTap={() => handleIconTap(app.id, app.label)}
                                onSelect={() => handleIconSelect(app.id)}
                                onDoubleClick={() => handleIconDoubleClick(app.id, app.label)}
                                onFocus={() => handleIconFocus(app.label)}
                                onKeyDown={(e) => handleIconKeyDown(e, app.id, app.label)}
                                ariaLabel={`${app.label} - Double-click to open`}
                                isDesktop={true}
                            />
                        ))}
                    </div>
                )}

                {/* Mobile-optimized window management */}
                {openWindows.map(app => {
                    const AppComponent = app.component;
                    return (
                        <MobileWindow
                            key={app.id}
                            appId={app.id}
                            title={app.name}
                            initialPos={app.pos}
                            isMobile={isMobileView}
                            isTablet={isTablet}
                            data-testid={`mobile-window-${app.id}`}
                        >
                            <AppComponent />
                        </MobileWindow>
                    );
                })}

                {/* Mobile dock for quick app access */}
                {isMobileView && (
                    <div
                        data-testid="mobile-dock"
                        className={`fixed bottom-0 left-0 right-0 bg-gray-700 bg-opacity-90 backdrop-blur-sm transform transition-transform duration-300 ${
                            dockVisible ? 'translate-y-0' : 'translate-y-full'
                        }`}
                        style={{ height: '80px' }}
                    >
                        <div className="flex justify-around items-center h-full px-2">
                            {mobileDockApps.map((app) => (
                                <button
                                    key={`dock-${app.id}`}
                                    data-testid={`dock-button-${app.id}`}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-600 transition-colors"
                                    onClick={() => handleIconTap(app.id, app.label)}
                                    aria-label={`Open ${app.label}`}
                                >
                                    <div className="w-10 h-10 mb-1">
                                        <app.IconComponent />
                                    </div>
                                    <span className="text-xs text-white font-geneva">
                                        {app.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
};

export default MobileDesktop;