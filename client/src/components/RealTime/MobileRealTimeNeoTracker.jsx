import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useTouchGestures } from '../../hooks/useTouchGestures.js';

const MobileRealTimeNeoTracker = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const { onSwipe, onPinch } = useTouchGestures();

  // WebSocket connection for real-time NEO data
  const {
    data: neoData,
    isConnected,
    error,
    lastUpdate
  } = useWebSocket('ws://localhost:3001/api/neo/realtime', {
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  });

  const [selectedNeo, setSelectedNeo] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'map', 'radar'
  const [filter, setFilter] = useState('all'); // 'all', 'potentially-hazardous', 'close-approach'
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Mobile-optimized display settings
  const itemsPerPage = isMobile ? 5 : isTablet ? 8 : 12;
  const [currentPage, setCurrentPage] = useState(0);

  // Process NEO data
  const processedNeoData = React.useMemo(() => {
    if (!neoData || !Array.isArray(neoData)) return [];

    const filtered = neoData.filter(neo => {
      switch (filter) {
        case 'potentially-hazardous':
          return neo.is_potentially_hazardous_asteroid;
        case 'close-approach':
          return neo.close_approach_data && neo.close_approach_data.length > 0;
        default:
          return true;
      }
    });

    return filtered.map(neo => ({
      id: neo.id,
      name: neo.name,
      diameter: neo.estimated_diameter?.kilometers?.estimated_diameter_max || 0,
      isHazardous: neo.is_potentially_hazardous_asteroid,
      velocity: neo.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second || 0,
      distance: neo.close_approach_data?.[0]?.miss_distance?.kilometers || 0,
      orbitClass: neo.orbital_data?.orbit_class?.orbit_class_description || 'Unknown'
    }));
  }, [neoData, filter]);

  // Pagination for mobile
  const paginatedData = React.useMemo(() => {
    const start = currentPage * itemsPerPage;
    return processedNeoData.slice(start, start + itemsPerPage);
  }, [processedNeoData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedNeoData.length / itemsPerPage);

  // Handle page navigation
  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  }, []);

  // Handle gesture interactions
  const handleSwipe = useCallback((direction) => {
    switch (direction) {
      case 'left':
        handleNextPage();
        break;
      case 'right':
        handlePrevPage();
        break;
      case 'up':
        setViewMode(prev => {
          const modes = ['list', 'map', 'radar'];
          const currentIndex = modes.indexOf(prev);
          return modes[(currentIndex + 1) % modes.length];
        });
        break;
    }
  }, [handleNextPage, handlePrevPage]);

  const handlePinch = useCallback((scale) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * scale)));
  }, []);

  // Draw radar visualization
  const drawRadar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4 * zoomLevel;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw radar circles
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw radar lines
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw NEO objects
    paginatedData.forEach((neo, index) => {
      const angle = (Date.now() / 1000 + index * 30) % 360;
      const radian = (angle * Math.PI) / 180;
      const distance = (neo.distance / 1000000) * zoomLevel; // Scale distance
      const x = centerX + Math.cos(radian) * Math.min(distance, radius);
      const y = centerY + Math.sin(radian) * Math.min(distance, radius);

      // Draw NEO
      ctx.fillStyle = neo.isHazardous ? '#ff0000' : '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, neo.diameter * 10 * zoomLevel), 0, Math.PI * 2);
      ctx.fill();

      // Draw NEO info if selected
      if (selectedNeo?.id === neo.id) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${isMobile ? '10px' : '12px'} monospace`;
        ctx.fillText(neo.name, x + 10, y - 10);
      }
    });

    // Sweep animation
    const sweepAngle = (Date.now() / 50) % 360;
    const sweepRadian = (sweepAngle * Math.PI) / 180;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(sweepRadian) * radius,
      centerY + Math.sin(sweepRadian) * radius
    );
    ctx.stroke();

    animationRef.current = requestAnimationFrame(drawRadar);
  }, [paginatedData, selectedNeo, zoomLevel, isMobile]);

  // Start/stop radar animation
  useEffect(() => {
    if (viewMode === 'radar' && canvasRef.current) {
      drawRadar();
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [viewMode, drawRadar]);

  // Handle connection status
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-geneva ${
      isConnected
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span>{isConnected ? 'Live' : 'Offline'}</span>
      {lastUpdate && (
        <span className="opacity-75">
          {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  // Filter tabs
  const FilterTabs = () => (
    <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
      {['all', 'potentially-hazardous', 'close-approach'].map((filterType) => (
        <button
          key={filterType}
          className={`px-3 py-1 rounded text-xs font-geneva transition-colors ${
            filter === filterType
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setFilter(filterType)}
        >
          {filterType.replace('-', ' ').toUpperCase()}
        </button>
      ))}
    </div>
  );

  // View mode switcher
  const ViewModeSwitcher = () => (
    <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
      {['list', 'map', 'radar'].map((mode) => (
        <button
          key={mode}
          className={`px-3 py-1 rounded text-xs font-geneva transition-colors ${
            viewMode === mode
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setViewMode(mode)}
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden">
      {/* Header with controls */}
      <div className={`${isMobile ? 'p-3' : 'p-4'} bg-white border-b border-gray-300`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`font-chicago ${isMobile ? 'text-base' : 'text-lg'} font-bold`}>
            Real-Time NEO Tracker
          </h2>
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-3">
          <FilterTabs />
          <ViewModeSwitcher />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-b border-red-200 px-4 py-2">
          <p className="text-red-800 text-sm font-geneva">
            Connection error: {error.message}
          </p>
        </div>
      )}

      {/* Main content area */}
      <div
        className="relative h-full"
        onTouchStart={(e) => {
          if (viewMode === 'radar') {
            // Handle touch gestures for radar view
          }
        }}
      >
        {viewMode === 'list' && (
          <div className={`${isMobile ? 'p-2' : 'p-4'} space-y-2`}>
            {paginatedData.map((neo) => (
              <div
                key={neo.id}
                className={`p-3 bg-white rounded-lg border-2 ${
                  neo.isHazardous
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                } cursor-pointer hover:shadow-md transition-shadow ${
                  selectedNeo?.id === neo.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedNeo(neo)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className={`font-chicago ${isMobile ? 'text-sm' : 'text-base'} font-bold mb-1`}>
                      {neo.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-geneva text-gray-600">
                      <div>Diameter: {neo.diameter.toFixed(2)} km</div>
                      <div>Distance: {(neo.distance / 1000000).toFixed(2)} M km</div>
                      <div>Velocity: {neo.velocity} km/s</div>
                      <div className="font-bold">
                        {neo.isHazardous ? '⚠️ Hazardous' : '✅ Safe'}
                      </div>
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className={`w-8 h-8 rounded-full ${
                      neo.isHazardous ? 'bg-red-500' : 'bg-green-500'
                    } animate-pulse`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'radar' && (
          <div className="flex items-center justify-center h-full bg-black">
            <canvas
              ref={canvasRef}
              width={isMobile ? 300 : 600}
              height={isMobile ? 300 : 600}
              className="border border-green-500"
              style={{
                touchAction: 'none',
                cursor: selectedNeo ? 'pointer' : 'crosshair'
              }}
            />
            <div className="absolute top-4 left-4 text-green-500 font-mono text-xs space-y-1">
              <div>NEO RADAR</div>
              <div>Zoom: {(zoomLevel * 100).toFixed(0)}%</div>
              <div>Objects: {paginatedData.length}</div>
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="flex items-center justify-center h-full bg-blue-50">
            <div className="text-center">
              <p className="font-chicago text-gray-600 mb-2">Orbital Map View</p>
              <p className="font-geneva text-sm text-gray-500">
                Interactive 3D orbital visualization coming soon
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination for mobile */}
      {isMobile && totalPages > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4">
          <button
            className="px-3 py-1 bg-white rounded-full shadow-md disabled:opacity-50"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
          >
            ←
          </button>
          <span className="text-sm font-geneva text-gray-600">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className="px-3 py-1 bg-white rounded-full shadow-md disabled:opacity-50"
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
          >
            →
          </button>
        </div>
      )}

      {/* Zoom controls for radar view */}
      {viewMode === 'radar' && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-700"
            onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}
          >
            +
          </button>
          <button
            className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-700"
            onClick={() => setZoomLevel(prev => Math.max(prev / 1.2, 0.5))}
          >
            −
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileRealTimeNeoTracker;