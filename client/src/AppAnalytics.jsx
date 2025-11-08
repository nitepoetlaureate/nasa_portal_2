import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useBundleMonitor } from './hooks/usePerformanceOptimized.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import BundleAnalyzer from './components/Performance/BundleAnalyzer';
import analyticsClient from './services/analyticsClient';
import ConsentManager from './components/analytics/ConsentManager';
import { PerformanceMetrics } from './components/analytics/PerformanceMonitor';

// Lazy load heavy components
const Desktop = lazy(() => import('./components/system7/Desktop.jsx'));
const MobileDesktop = lazy(() => import('./components/system7/MobileDesktop.jsx'));
const MenuBar = lazy(() => import('./components/system7/MenuBar.jsx'));

// Loading fallback component with mobile optimization
const LoadingFallback = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-s7-pattern">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4 ${
          isMobile ? 'h-8 w-8' : 'h-12 w-12'
        }`}></div>
        <p className={`font-chicago text-black ${isMobile ? 'text-sm' : 'text-base'}`}>
          Loading NASA System 7 Portal...
        </p>
        <p className="font-geneva text-xs text-gray-600 mt-2">
          Optimizing for your device...
        </p>
      </div>
    </div>
  );
};

function AppAnalytics() {
  // Monitor bundle performance
  useBundleMonitor();

  // Responsive design detection
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Analytics state
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);

  // Initialize analytics and check consent
  useEffect(() => {
    const initAnalytics = async () => {
      try {
        // Initialize analytics client
        if (!analyticsClient.isInitialized) {
          await analyticsClient.init();
        }

        const consentStatus = analyticsClient.getConsentStatus();

        // Show consent banner if no consent has been given
        if (!consentStatus.hasAnyConsent) {
          setShowConsentBanner(true);
        }

        setAnalyticsReady(true);

        // Track app initialization
        analyticsClient.trackEvent('application', 'essential', 'app_loaded', {
          label: 'NASA System 7 Portal',
          value: 1,
          metadata: {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
          }
        });

      } catch (error) {
        console.error('Analytics initialization failed:', error);
        setAnalyticsReady(true); // Continue without analytics
      }
    };

    initAnalytics();
  }, [isMobile, isTablet]);

  // Register service worker for PWA capabilities
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration);

          // Check for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[App] New Service Worker found');
          });

          // Handle service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CACHE_UPDATED') {
              console.log('[App] Cache updated:', event.data);
            }
          });
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error);
        });

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] Service Worker controller changed - reloading page');
        window.location.reload();
      });
    }

    // Set up PWA install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('[App] PWA install prompt ready');

      // Store prompt for later use
      window.pwaInstallPrompt = deferredPrompt;

      // Track PWA install prompt for analytics
      if (analyticsReady && analyticsClient.hasConsent('functional')) {
        analyticsClient.trackEvent('pwa', 'functional', 'install_prompt_shown');
      }
    });

    // Handle app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[App] PWA was installed');

      // Track installation for analytics
      if (analyticsReady && analyticsClient.hasConsent('functional')) {
        analyticsClient.trackEvent('pwa', 'functional', 'pwa_installed', {
          label: 'NASA System 7 Portal',
          value: 1
        });
      }
    });

    // Set up network status monitoring
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      document.body.classList.toggle('offline', !isOnline);
      console.log('[App] Network status:', isOnline ? 'online' : 'offline');

      // Track network status changes
      if (analyticsReady && analyticsClient.hasConsent('performance')) {
        analyticsClient.trackEvent('network', 'performance', isOnline ? 'online' : 'offline');
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, [analyticsReady]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (analyticsReady && analyticsClient.hasConsent('performance')) {
        analyticsClient.trackEvent('page', 'performance',
          document.visibilityState === 'visible' ? 'page_visible' : 'page_hidden'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [analyticsReady]);

  // Track route changes (basic implementation)
  useEffect(() => {
    const handleRouteChange = () => {
      if (analyticsReady && analyticsClient.hasConsent('performance')) {
        analyticsClient.trackPageView();
      }
    };

    // Track initial page load
    if (analyticsReady && analyticsClient.hasConsent('performance')) {
      handleRouteChange();
    }

    // Set up route change listeners for SPA navigation
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [analyticsReady]);

  // Optimize viewport for mobile devices
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && isMobile) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }, [isMobile]);

  const handleConsentClose = () => {
    setShowConsentBanner(false);
  };

  return (
    <div
      className={`w-screen h-screen overflow-hidden bg-s7-pattern ${
        isMobile ? 'mobile-optimized' : ''
      } ${isTablet ? 'tablet-optimized' : ''}`}
      data-testid="desktop-container"
      style={{
        touchAction: 'manipulation', // Optimize for touch
        WebkitTapHighlightColor: 'transparent', // Remove tap highlight
        WebkitUserSelect: 'none', // Prevent text selection on touch
        userSelect: 'none'
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {/* Use mobile-optimized desktop on small screens */}
        {isMobile ? (
          <MobileDesktop />
        ) : (
          <>
            <MenuBar />
            <Desktop />
          </>
        )}
      </Suspense>

      {/* Development bundle analyzer */}
      {process.env.NODE_ENV === 'development' && <BundleAnalyzer />}

      {/* Analytics Components */}
      {analyticsReady && <PerformanceMetrics />}

      {/* Consent Banner */}
      {showConsentBanner && (
        <ConsentManager
          showSettings={false}
          onClose={handleConsentClose}
        />
      )}

      {/* Offline indicator */}
      <div
        id="offline-indicator"
        className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg z-50 hidden"
        role="alert"
        aria-live="polite"
      >
        <span className="font-geneva text-sm">You're offline. Some features may be unavailable.</span>
      </div>

      {/* PWA install banner (hidden by default) */}
      <div
        id="pwa-install-banner"
        className="fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-40 hidden"
        role="alert"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-chicago font-bold">Install NASA System 7 Portal</p>
            <p className="font-geneva text-sm opacity-90">Get the full experience offline</p>
          </div>
          <div className="flex gap-2">
            <button
              id="pwa-install-button"
              className="bg-white text-blue-600 px-4 py-2 rounded font-geneva text-sm font-bold"
              onClick={() => {
                if (window.pwaInstallPrompt) {
                  window.pwaInstallPrompt.prompt();
                  window.pwaInstallPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                      console.log('[App] User accepted PWA install');

                      // Track PWA install acceptance
                      if (analyticsReady && analyticsClient.hasConsent('functional')) {
                        analyticsClient.trackEvent('pwa', 'functional', 'install_prompt_accepted');
                      }
                    }
                    window.pwaInstallPrompt = null;
                  });
                }
              }}
            >
              Install
            </button>
            <button
              id="pwa-dismiss-button"
              className="bg-transparent border border-white text-white px-4 py-2 rounded font-geneva text-sm"
              onClick={() => {
                document.getElementById('pwa-install-banner').classList.add('hidden');

                // Track PWA install dismissal
                if (analyticsReady && analyticsClient.hasConsent('functional')) {
                  analyticsClient.trackEvent('pwa', 'functional', 'install_prompt_dismissed');
                }
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppAnalytics;