import React, { useState, useEffect, useRef } from 'react';
import analyticsClient from '../../services/analyticsClient';

const PerformanceMonitor = ({ children }) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    componentCount: 0,
    reRenderCount: 0,
    memoryUsage: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const renderStartTime = useRef(Date.now());
  const lastRenderTime = useRef(Date.now());
  const renderCount = useRef(0);

  useEffect(() => {
    // Track component render performance
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime.current;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      reRenderCount: renderCount.current++
    }));

    // Track performance metrics
    if (analyticsClient.hasConsent('performance')) {
      analyticsClient.trackPerformanceMetric(
        'component_render',
        'PerformanceMonitor_render',
        renderTime,
        'ms',
        {
          componentName: 'PerformanceMonitor',
          reRenderCount: renderCount.current,
          timestamp: new Date().toISOString()
        }
      );
    }

    lastRenderTime.current = renderEndTime;
  }, [children]);

  useEffect(() => {
    // Monitor memory usage
    const monitorMemory = () => {
      if (performance.memory) {
        const memoryUsage = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };

        setMetrics(prev => ({ ...prev, memoryUsage: memoryUsage.used }));

        if (analyticsClient.hasConsent('performance')) {
          analyticsClient.trackPerformanceMetric(
            'memory_usage',
            'js_heap_used',
            memoryUsage.used,
            'MB',
            {
              total: memoryUsage.total,
              limit: memoryUsage.limit,
              timestamp: new Date().toISOString()
            }
          );
        }
      }
    };

    // Monitor frame rate
    let frameCount = 0;
    let lastFrameTime = performance.now();

    const monitorFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastFrameTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastFrameTime));

        if (analyticsClient.hasConsent('performance')) {
          analyticsClient.trackPerformanceMetric(
            'rendering',
            'fps',
            fps,
            'fps',
            {
              frameCount,
              timestamp: new Date().toISOString()
            }
          );
        }

        frameCount = 0;
        lastFrameTime = currentTime;
      }

      if (isMonitoring) {
        requestAnimationFrame(monitorFrameRate);
      }
    };

    // Monitor network performance
    const monitorNetworkPerformance = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;

        analyticsClient.trackPerformanceMetric(
          'network',
          'connection_type',
          connection.effectiveType || 'unknown',
          'type',
          {
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
            timestamp: new Date().toISOString()
          }
        );
      }
    };

    const startMonitoring = () => {
      setIsMonitoring(true);
      monitorMemory();
      monitorNetworkPerformance();

      if (isMonitoring) {
        requestAnimationFrame(monitorFrameRate);
      }
    };

    const intervalId = setInterval(monitorMemory, 5000); // Monitor memory every 5 seconds

    startMonitoring();

    return () => {
      setIsMonitoring(false);
      clearInterval(intervalId);
    };
  }, [isMonitoring]);

  // Track Core Web Vitals
  useEffect(() => {
    const trackWebVitals = () => {
      if (!window.performance || !analyticsClient.hasConsent('performance')) return;

      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'largest-contentful-paint') {
                analyticsClient.trackPerformanceMetric(
                  'core_web_vitals',
                  'largest_contentful_paint',
                  Math.round(entry.startTime),
                  'ms',
                  {
                    element: entry.element?.tagName || 'unknown',
                    url: entry.url || window.location.href,
                    timestamp: new Date().toISOString()
                  }
                );
              }
            }
          });

          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
          console.warn('LCP monitoring not supported:', error);
        }

        // First Input Delay (FID)
        try {
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'first-input') {
                analyticsClient.trackPerformanceMetric(
                  'core_web_vitals',
                  'first_input_delay',
                  Math.round(entry.processingStart - entry.startTime),
                  'ms',
                  {
                    inputType: entry.name,
                    timestamp: new Date().toISOString()
                  }
                );
              }
            }
          });

          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (error) {
          console.warn('FID monitoring not supported:', error);
        }

        // Cumulative Layout Shift (CLS)
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                analyticsClient.trackPerformanceMetric(
                  'core_web_vitals',
                  'cumulative_layout_shift',
                  Math.round(clsValue * 1000) / 1000,
                  'score',
                  {
                    entryType: entry.entryType,
                    value: entry.value,
                    cumulative: clsValue,
                    timestamp: new Date().toISOString()
                  }
                );
              }
            }
          });

          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('CLS monitoring not supported:', error);
        }
      }
    };

    trackWebVitals();
  }, []);

  // Track resource loading performance
  useEffect(() => {
    const trackResourceTiming = () => {
      if (!window.performance || !window.performance.getEntriesByType) return;

      const resources = window.performance.getEntriesByType('resource');

      resources.forEach(resource => {
        if (analyticsClient.hasConsent('performance')) {
          analyticsClient.trackPerformanceMetric(
            'resource_loading',
            resource.name.split('/').pop() || 'unknown',
            Math.round(resource.duration),
            'ms',
            {
              type: resource.initiatorType,
              size: resource.transferSize || 0,
              protocol: resource.nextHopProtocol || 'unknown',
              cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
              timestamp: new Date().toISOString()
            }
          );
        }
      });
    };

    // Track resources after page load
    if (document.readyState === 'complete') {
      trackResourceTiming();
    } else {
      window.addEventListener('load', trackResourceTiming);
      return () => window.removeEventListener('load', trackResourceTiming);
    }
  }, []);

  // Track long tasks
  useEffect(() => {
    if (!window.performance || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            analyticsClient.trackPerformanceMetric(
              'long_tasks',
              'main_thread_blocked',
              Math.round(entry.duration),
              'ms',
              {
                startTime: Math.round(entry.startTime),
                attribution: entry.attribution?.map(attr => ({
                  name: attr.name,
                  entryType: attr.entryType,
                  startTime: Math.round(attr.startTime),
                  duration: Math.round(attr.duration)
                })) || [],
                timestamp: new Date().toISOString()
              }
            );
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }
  }, []);

  // NASA API performance tracking
  const trackNasaApiCall = async (endpoint, method = 'GET', requestStart) => {
    const response = await fetch(endpoint, { method });
    const responseTime = Date.now() - requestStart;
    const responseSize = response.headers.get('content-length') || 0;

    analyticsClient.trackNasaApiUsage(
      endpoint,
      method,
      response.status,
      responseTime,
      parseInt(responseSize),
      response.headers.get('x-cache') === 'hit',
      response.ok ? null : `HTTP ${response.status}`
    );

    return response;
  };

  // Expose tracking methods to children
  const contextValue = {
    metrics,
    trackNasaApiCall,
    trackCustomMetric: (name, value, unit = 'ms', metadata = {}) => {
      analyticsClient.trackPerformanceMetric('custom', name, value, unit, metadata);
    }
  };

  renderStartTime.current = Date.now();

  return (
    <div className="performance-monitor">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            performanceContext: contextValue,
            'data-performance-monitor': 'true'
          });
        }
        return child;
      })}
    </div>
  );
};

// Performance metric display component
export const PerformanceMetrics = ({ show = false }) => {
  const [isVisible, setIsVisible] = useState(show);
  const [realTimeMetrics, setRealTimeMetrics] = useState({});

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        setRealTimeMetrics({
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart),
          firstPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0,
          memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0
        });
      }
    };

    const intervalId = setInterval(updateMetrics, 1000);
    updateMetrics();

    return () => clearInterval(intervalId);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-lg shadow-lg z-50 text-xs"
        title="Show Performance Metrics"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-50 text-xs max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Performance Metrics</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">DOM Content:</span>
          <span className="font-mono">{realTimeMetrics.domContentLoaded}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Load Complete:</span>
          <span className="font-mono">{realTimeMetrics.loadComplete}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">First Paint:</span>
          <span className="font-mono">{Math.round(realTimeMetrics.firstPaint)}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">First Contentful:</span>
          <span className="font-mono">{Math.round(realTimeMetrics.firstContentfulPaint)}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Memory Usage:</span>
          <span className="font-mono">{realTimeMetrics.memoryUsage}MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Consent Status:</span>
          <span className="font-mono">
            {analyticsClient.getConsentStatus().hasAnyConsent ? '✅' : '❌'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-gray-400 text-xs">
          <p>Privacy-first analytics</p>
          <p>GDPR/CCPA compliant</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;