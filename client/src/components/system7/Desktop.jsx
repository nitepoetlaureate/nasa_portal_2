import React, { useState, useCallback, useRef } from 'react';
import { useApps } from '../../contexts/AppContext.jsx';
import Window from './Window.jsx';
import DesktopIcon from './DesktopIcon.jsx';
import { ApodIcon, NeoWsIcon, NavigatorIcon, ImageViewerIcon } from '../../assets/icons';
import { useSound } from '../../hooks/useSound.js';

const Desktop = () => {
    const { apps, openApp, closeApp, bringToFront } = useApps();
    const openWindows = Object.values(apps).filter(app => app.isOpen);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [error, setError] = useState(null);
    const [announcement, setAnnouncement] = useState('');
    const desktopRef = useRef(null);

    const playClickSound = useSound('click.wav');
    const playOpenSound = useSound('open.wav');

    const handleIconDoubleClick = useCallback(async (appId, appName) => {
        try {
            setError(null);
            playOpenSound();
            setAnnouncement(`Opening ${appName}`);
            await openApp(appId);
            setAnnouncement(`${appName} opened successfully`);
        } catch (err) {
            setError('Failed to open application');
            setAnnouncement(`Error opening ${appName}`);
            console.error('Failed to open app:', err);
        }
    }, [openApp, playOpenSound]);

    const handleIconClick = useCallback((iconId) => {
        playClickSound();
        setSelectedIcon(iconId);
        setAnnouncement(`Selected ${iconId}`);
    }, [playClickSound]);

    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
            setSelectedIcon(null);
            setAnnouncement('Selection cleared');
        }
    }, []);

    const handleClickOutside = useCallback(() => {
        setSelectedIcon(null);
    }, []);

    // Handle icon focus for keyboard navigation
    const handleIconFocus = useCallback((iconId) => {
        setAnnouncement(`Focused on ${iconId}`);
    }, []);

    const handleIconKeyDown = useCallback((event, appId, appName) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleIconDoubleClick(appId, appName);
        }
    }, [handleIconDoubleClick]);

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

            {/* Error message */}
            {error && (
                <div
                    data-testid="error-message"
                    className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded shadow-lg z-50"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {/* Main desktop container */}
            <main
                ref={desktopRef}
                data-testid="desktop"
                className="w-full h-full relative overflow-hidden p-4 pt-8"
                style={{ backgroundColor: '#808080' }}
                onClick={handleClickOutside}
                onKeyDown={handleKeyDown}
                role="main"
                aria-label="System 7 Desktop"
                tabIndex="0"
            >
                {/* Desktop Icons */}
                <div className="inline-block m-4">
                    <DesktopIcon
                        name="Picture of the Day"
                        testId="desktop-icon-apod"
                        IconComponent={ApodIcon}
                        isSelected={selectedIcon === 'apod'}
                        onClick={() => handleIconClick('apod')}
                        onDoubleClick={() => handleIconDoubleClick('apod', 'APOD - Astronomy Picture of the Day')}
                        onFocus={() => handleIconFocus('APOD')}
                        onKeyDown={(e) => handleIconKeyDown(e, 'apod', 'APOD')}
                        ariaLabel="APOD - Astronomy Picture of the Day"
                    />
                </div>
                <div className="inline-block m-4">
                    <DesktopIcon
                        name="Near Earth Objects"
                        testId="desktop-icon-neows"
                        IconComponent={NeoWsIcon}
                        isSelected={selectedIcon === 'neows'}
                        onClick={() => handleIconClick('neows')}
                        onDoubleClick={() => handleIconDoubleClick('neows', 'Near Earth Objects')}
                        onFocus={() => handleIconFocus('Near Earth Objects')}
                        onKeyDown={(e) => handleIconKeyDown(e, 'neows', 'Near Earth Objects')}
                        ariaLabel="Near Earth Objects"
                    />
                </div>
                <div className="inline-block m-4">
                    <DesktopIcon
                        name="Resource Navigator"
                        testId="desktop-icon-navigator"
                        IconComponent={NavigatorIcon}
                        isSelected={selectedIcon === 'resources'}
                        onClick={() => handleIconClick('resources')}
                        onDoubleClick={() => handleIconDoubleClick('resources', 'Resource Navigator')}
                        onFocus={() => handleIconFocus('Resource Navigator')}
                        onKeyDown={(e) => handleIconKeyDown(e, 'resources', 'Resource Navigator')}
                        ariaLabel="Resource Navigator"
                    />
                </div>
                <div className="inline-block m-4">
                    <DesktopIcon
                        name="Image Viewer"
                        testId="desktop-image-viewer"
                        IconComponent={ImageViewerIcon}
                        isSelected={selectedIcon === 'imageViewer'}
                        onClick={() => handleIconClick('imageViewer')}
                        onDoubleClick={() => handleIconDoubleClick('imageViewer', 'HD Image Viewer')}
                        onFocus={() => handleIconFocus('HD Image Viewer')}
                        onKeyDown={(e) => handleIconKeyDown(e, 'imageViewer', 'HD Image Viewer')}
                        ariaLabel="HD Image Viewer"
                    />
                </div>

                {/* Open Windows */}
                {openWindows.map(app => {
                    const AppComponent = app.component;
                    return (
                        <Window
                            key={app.id}
                            appId={app.id}
                            title={app.name}
                            initialPos={app.pos}
                            data-testid={`window-${app.id}`}
                        >
                            <AppComponent />
                        </Window>
                    );
                })}
            </main>
        </>
    );
};

export default Desktop;
