import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';

const MobilePerformanceMonitor = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    lcp: 0,
    fid: 0,
    cls: 0,
    fcp: 0,
    ttfb: 0,
    memoryUsage: 0,
    connectionSpeed: 'unknown',
    batteryLevel: null,
    deviceInfo: {}
  });
  const [alerts, setAlerts] = useState([]);
  const intervalRef = useRef(null);

  // Core Web Vitals monitoring
  useEffect(() => {
    if (!isVisible) return;

    const monitorWebVitals = () => {
      // LCP (Largest Contentful Paint)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        setMetrics(prev => ({ ...prev, lcp: Math.round(lcp) }));

        // Alert if LCP > 2.5s
        if (lcp > 2500) {
          addAlert('LCP too slow', `${Math.round(lcp)}ms`, 'warning');
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID (First Input Delay)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          setMetrics(prev => ({ ...prev, fid: Math.round(fid) }));

          // Alert if FID > 100ms
          if (fid > 100) {
            addAlert('FID too high', `${Math.round(fid)}ms`, 'warning');
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        setMetrics(prev => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));

        // Alert if CLS > 0.1
        if (clsValue > 0.1) {
          addAlert('CLS too high', clsValue.toFixed(3), 'error');
        }
      }).observe({ entryTypes: ['layout-shift'] });

      // FCP (First Contentful Paint)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[0].startTime;
        setMetrics(prev => ({ ...prev, fcp: Math.round(fcp) }));
      }).observe({ entryTypes: ['paint'] });

      // TTFB (Time to First Byte)
      if (performance.timing) {
        const ttfb = performance.timing.responseStart - performance.timing.requestStart;
        setMetrics(prev => ({ ...prev, ttfb: Math.round(ttfb) }));
      }
    };

    monitorWebVitals();
  }, [isVisible]);

  // Device and connection monitoring
  useEffect(() => {
    if (!isVisible) return;

    const updateDeviceInfo = () => {
      // Memory usage
      if ('memory' in performance) {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
        setMetrics(prev => ({ ...prev, memoryUsage: Math.round(memoryUsage * 100) }));
      }

      // Connection information
      if ('connection' in navigator) {
        const conn = navigator.connection;
        setMetrics(prev => ({
          ...prev,
          connectionSpeed: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 0
        }));
      }

      // Battery level
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          setMetrics(prev => ({ ...prev, batteryLevel: Math.round(battery.level * 100) }));
        });
      }

      // Device information
      setMetrics(prev => ({
        ...prev,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cores: navigator.hardwareConcurrency || 'unknown',
          deviceMemory: navigator.deviceMemory || 'unknown',
          pixelRatio: window.devicePixelRatio,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          isMobile: isMobile
        }
      }));
    };

    updateDeviceInfo();
    intervalRef.current = setInterval(updateDeviceInfo, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, isMobile]);

  const addAlert = useCallback((title, value, type = 'info') => {
    const newAlert = {
      id: Date.now(),
      title,
      value,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 4)]); // Keep only 5 most recent alerts
  }, []);

  const getMetricColor = (metric, value) => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'text-gray-600';

    if (value <= threshold.good) return 'text-green-600';
    if (value <= threshold.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMemoryColor = (usage) => {
    if (usage < 70) return 'text-green-600';
    if (usage < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Show performance monitor"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18m-9-9v18"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center md:items-center md:justify-center">
      <div className={`bg-white w-full md:max-w-2xl md:rounded-lg shadow-xl ${
        isMobile ? 'rounded-t-lg' : 'rounded-lg'
      } max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <h2 className="font-chicago text-lg font-bold">Mobile Performance Monitor</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-gray-700 rounded"
            aria-label="Close performance monitor"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Core Web Vitals */}
        <div className="p-4 border-b">
          <h3 className="font-chicago text-base font-bold mb-3">Core Web Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs font-geneva text-gray-600 mb-1">LCP</div>
              <div className={`text-lg font-bold ${getMetricColor('lcp', metrics.lcp)}`}>
                {metrics.lcp}ms
              </div>
              <div className="text-xs text-gray-500">Largest Contentful Paint</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs font-geneva text-gray-600 mb-1">FID</div>
              <div className={`text-lg font-bold ${getMetricColor('fid', metrics.fid)}`}>
                {metrics.fid}ms
              </div>
              <div className="text-xs text-gray-500">First Input Delay</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs font-geneva text-gray-600 mb-1">CLS</div>
              <div className={`text-lg font-bold ${getMetricColor('cls', metrics.cls)}`}>
                {metrics.cls}
              </div>
              <div className="text-xs text-gray-500">Cumulative Layout Shift</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs font-geneva text-gray-600 mb-1">FCP</div>
              <div className={`text-lg font-bold ${getMetricColor('fcp', metrics.fcp)}`}>
                {metrics.fcp}ms
              </div>
              <div className="text-xs text-gray-500">First Contentful Paint</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs font-geneva text-gray-600 mb-1">TTFB</div>
              <div className={`text-lg font-bold ${getMetricColor('ttfb', metrics.ttfb)}`}>
                {metrics.ttfb}ms
              </div>
              <div className="text-xs text-gray-500">Time to First Byte</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs font-geneva text-gray-600 mb-1">Memory</div>
              <div className={`text-lg font-bold ${getMemoryColor(metrics.memoryUsage)}`}>
                {metrics.memoryUsage}%
              </div>
              <div className="text-xs text-gray-500">JS Heap Usage</div>
            </div>
          </div>
        </div>

        {/* Device Information */}
        <div className="p-4 border-b">
          <h3 className="font-chicago text-base font-bold mb-3">Device Information</h3>
          <div className="space-y-2 text-sm font-geneva">
            <div className="flex justify-between">
              <span className="text-gray-600">Connection:</span>
              <span className="font-medium">{metrics.connectionSpeed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Battery:</span>
              <span className="font-medium">
                {metrics.batteryLevel !== null ? `${metrics.batteryLevel}%` : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CPU Cores:</span>
              <span className="font-medium">{metrics.deviceInfo.cores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory:</span>
              <span className="font-medium">{metrics.deviceInfo.deviceMemory}GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Screen:</span>
              <span className="font-medium">{metrics.deviceInfo.screenSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Viewport:</span>
              <span className="font-medium">{metrics.deviceInfo.viewportSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Device Type:</span>
              <span className="font-medium">{metrics.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</span>
            </div>
          </div>
        </div>

        {/* Performance Alerts */}
        {alerts.length > 0 && (
          <div className="p-4">
            <h3 className="font-chicago text-base font-bold mb-3">Performance Alerts</h3>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded flex items-center justify-between ${
                    alert.type === 'error' ? 'bg-red-50 text-red-800' :
                    alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    'bg-blue-50 text-blue-800'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{alert.title}</div>
                    <div className="text-xs opacity-75">{alert.value}</div>
                  </div>
                  <div className="text-xs opacity-75">{alert.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded font-geneva text-sm hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'NASA System 7 Portal Performance',
                    text: `LCP: ${metrics.lcp}ms, FID: ${metrics.fid}ms, CLS: ${metrics.cls}`,
                  });
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded font-geneva text-sm hover:bg-gray-700 transition-colors"
            >
              Share Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePerformanceMonitor;