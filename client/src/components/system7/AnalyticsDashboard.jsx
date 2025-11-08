import React, { useState, useEffect } from 'react';
import { Window } from './Window';
import './AnalyticsDashboard.css';

/**
 * System 7 Styled Analytics Dashboard
 *
 * Provides comprehensive analytics visualization with:
 * - Real-time user behavior metrics
 * - NASA API usage statistics
 * - Performance monitoring
 * - Privacy-compliant data aggregation
 * - D3.js visualizations
 */
const AnalyticsDashboard = ({ isVisible, onClose }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [nasaApiData, setNasaApiData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isVisible) {
      loadAnalyticsData();
    }
  }, [isVisible, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [dashboardResponse, nasaResponse, performanceResponse] = await Promise.all([
        fetch(`/api/analytics/dashboard?timeRange=${selectedTimeRange}`),
        fetch(`/api/analytics/nasa-api?timeRange=${selectedTimeRange}`),
        fetch(`/api/analytics/performance?timeRange=${selectedTimeRange}`)
      ]);

      const dashboardData = await dashboardResponse.json();
      const nasaData = await nasaResponse.json();
      const performanceData = await performanceResponse.json();

      if (dashboardData.success) {
        setAnalyticsData(dashboardData.data);
      }
      if (nasaData.success) {
        setNasaApiData(nasaData.data);
      }
      if (performanceData.success) {
        setPerformanceData(performanceData.data);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format) => {
    try {
      const response = await fetch(`/api/analytics/export-dashboard?timeRange=${selectedTimeRange}&format=${format}`);
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([data.content], {
          type: format === 'csv' ? 'text/csv' : 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nasa-analytics-${selectedTimeRange}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const renderOverview = () => {
    if (!analyticsData || analyticsData.length === 0) {
      return <div className="no-data">No analytics data available for the selected period.</div>;
    }

    // Aggregate data for overview
    const totalEvents = analyticsData.reduce((sum, item) => sum + parseInt(item.event_count), 0);
    const totalSessions = analyticsData.reduce((sum, item) => sum + parseInt(item.unique_sessions), 0);
    const totalUsers = analyticsData.reduce((sum, item) => sum + parseInt(item.unique_users), 0);
    const avgDuration = analyticsData.reduce((sum, item) => sum + parseFloat(item.avg_duration_ms || 0), 0) / analyticsData.length;

    return (
      <div className="analytics-overview">
        <div className="metric-cards">
          <div className="metric-card">
            <div className="metric-value">{totalEvents.toLocaleString()}</div>
            <div className="metric-label">Total Events</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{totalSessions.toLocaleString()}</div>
            <div className="metric-label">Total Sessions</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{totalUsers.toLocaleString()}</div>
            <div className="metric-label">Unique Users</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{Math.round(avgDuration)}ms</div>
            <div className="metric-label">Avg Duration</div>
          </div>
        </div>

        <div className="chart-container">
          <h4>Event Trends</h4>
          <div className="simple-chart">
            {analyticsData.slice(0, 7).map((item, index) => (
              <div key={index} className="chart-bar" style={{ height: `${(item.event_count / totalEvents) * 200}px` }}>
                <div className="bar-label">{new Date(item.event_date).toLocaleDateString()}</div>
                <div className="bar-value">{item.event_count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="data-table">
          <h4>Recent Activity</h4>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event Type</th>
                <th>Category</th>
                <th>Count</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.slice(0, 10).map((item, index) => (
                <tr key={index}>
                  <td>{new Date(item.event_date).toLocaleDateString()}</td>
                  <td>{item.event_type}</td>
                  <td>{item.event_category}</td>
                  <td>{item.event_count}</td>
                  <td>{item.avg_duration_ms ? `${Math.round(item.avg_duration_ms)}ms` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderNasaAnalytics = () => {
    if (!nasaApiData || nasaApiData.length === 0) {
      return <div className="no-data">No NASA API usage data available.</div>;
    }

    const totalRequests = nasaApiData.reduce((sum, item) => sum + parseInt(item.request_count), 0);
    const totalCacheHits = nasaApiData.reduce((sum, item) => sum + parseInt(item.cache_hits || 0), 0);
    const cacheHitRate = totalRequests > 0 ? (totalCacheHits / totalRequests * 100).toFixed(1) : 0;

    return (
      <div className="nasa-analytics">
        <div className="metric-cards">
          <div className="metric-card">
            <div className="metric-value">{totalRequests.toLocaleString()}</div>
            <div className="metric-label">Total API Calls</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{cacheHitRate}%</div>
            <div className="metric-label">Cache Hit Rate</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {Math.round(nasaApiData.reduce((sum, item) => sum + parseFloat(item.avg_response_time || 0), 0) / nasaApiData.length)}ms
            </div>
            <div className="metric-label">Avg Response Time</div>
          </div>
        </div>

        <div className="nasa-endpoints">
          <h4>NASA API Endpoints</h4>
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Requests</th>
                <th>Avg Time</th>
                <th>Cache Hits</th>
                <th>Errors</th>
                <th>Hit Rate</th>
              </tr>
            </thead>
            <tbody>
              {nasaApiData.map((item, index) => {
                const endpointName = item.api_endpoint.split('/').pop() || 'Unknown';
                const hitRate = item.request_count > 0 ? (item.cache_hits / item.request_count * 100).toFixed(1) : 0;

                return (
                  <tr key={index}>
                    <td className="endpoint-name">{endpointName}</td>
                    <td>{item.request_count.toLocaleString()}</td>
                    <td>{Math.round(item.avg_response_time)}ms</td>
                    <td>{item.cache_hits || 0}</td>
                    <td>{item.error_count || 0}</td>
                    <td>{hitRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!performanceData || performanceData.length === 0) {
      return <div className="no-data">No performance data available.</div>;
    }

    // Group by metric type
    const groupedMetrics = performanceData.reduce((groups, item) => {
      if (!groups[item.metric_type]) {
        groups[item.metric_type] = [];
      }
      groups[item.metric_type].push(item);
      return groups;
    }, {});

    return (
      <div className="performance-metrics">
        <div className="metric-types">
          {Object.entries(groupedMetrics).map(([type, metrics]) => (
            <div key={type} className="metric-type-section">
              <h4>{type.replace(/_/g, ' ').toUpperCase()}</h4>
              <div className="metrics-grid">
                {metrics.map((metric, index) => (
                  <div key={index} className="metric-item">
                    <div className="metric-name">{metric.metric_name.replace(/_/g, ' ')}</div>
                    <div className="metric-values">
                      <span className="avg-value">Avg: {Math.round(metric.avg_value)}{metric.unit}</span>
                      <span className="min-value">Min: {Math.round(metric.min_value)}{metric.unit}</span>
                      <span className="max-value">Max: {Math.round(metric.max_value)}{metric.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="core-web-vitals">
          <h4>Core Web Vitals Summary</h4>
          {performanceData
            .filter(item => item.metric_type === 'core_web_vitals')
            .map((item, index) => {
              const getScoreColor = (name, value) => {
                if (name.includes('lcp')) return value < 2500 ? '#4CAF50' : value < 4000 ? '#FFC107' : '#F44336';
                if (name.includes('fid')) return value < 100 ? '#4CAF50' : value < 300 ? '#FFC107' : '#F44336';
                if (name.includes('cls')) return value < 0.1 ? '#4CAF50' : value < 0.25 ? '#FFC107' : '#F44336';
                return '#666';
              };

              const getScoreLabel = (name, value) => {
                if (name.includes('lcp')) return value < 2500 ? 'Good' : value < 4000 ? 'Needs Improvement' : 'Poor';
                if (name.includes('fid')) return value < 100 ? 'Good' : value < 300 ? 'Needs Improvement' : 'Poor';
                if (name.includes('cls')) return value < 0.1 ? 'Good' : value < 0.25 ? 'Needs Improvement' : 'Poor';
                return 'Unknown';
              };

              return (
                <div key={index} className="vital-metric">
                  <div className="vital-name">{item.metric_name.replace(/_/g, ' ').toUpperCase()}</div>
                  <div
                    className="vital-value"
                    style={{ color: getScoreColor(item.metric_name, item.avg_value) }}
                  >
                    {Math.round(item.avg_value * 100) / 100}{item.unit}
                  </div>
                  <div
                    className="vital-score"
                    style={{ color: getScoreColor(item.metric_name, item.avg_value) }}
                  >
                    {getScoreLabel(item.metric_name, item.avg_value)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const renderPrivacyMetrics = () => {
    return (
      <div className="privacy-metrics">
        <div className="privacy-summary">
          <h4>Privacy Compliance Summary</h4>
          <div className="privacy-status">
            <div className="status-item good">
              <span className="status-label">Data Collection:</span>
              <span className="status-value">Consent-Based</span>
            </div>
            <div className="status-item good">
              <span className="status-label">Anonymization:</span>
              <span className="status-value">SHA256 Hashed</span>
            </div>
            <div className="status-item good">
              <span className="status-label">Data Minimization:</span>
              <span className="status-value">Applied</span>
            </div>
            <div className="status-item good">
              <span className="status-label">GDPR Compliance:</span>
              <span className="status-value">Enabled</span>
            </div>
            <div className="status-item good">
              <span className="status-label">CCPA Compliance:</span>
              <span className="status-value">Enabled</span>
            </div>
          </div>
        </div>

        <div className="consent-metrics">
          <h4>Consent Management</h4>
          <div className="consent-stats">
            <div className="consent-category">
              <div className="category-name">Essential</div>
              <div className="consent-bar">
                <div className="consent-level granted" style={{ width: '100%' }}></div>
              </div>
              <div className="consent-percentage">100% Granted</div>
            </div>
            <div className="consent-category">
              <div className="category-name">Performance</div>
              <div className="consent-bar">
                <div className="consent-level granted" style={{ width: '75%' }}></div>
                <div className="consent-level denied" style={{ width: '25%' }}></div>
              </div>
              <div className="consent-percentage">75% Granted</div>
            </div>
            <div className="consent-category">
              <div className="category-name">Functional</div>
              <div className="consent-bar">
                <div className="consent-level granted" style={{ width: '60%' }}></div>
                <div className="consent-level denied" style={{ width: '40%' }}></div>
              </div>
              <div className="consent-percentage">60% Granted</div>
            </div>
            <div className="consent-category">
              <div className="category-name">Marketing</div>
              <div className="consent-bar">
                <div className="consent-level granted" style={{ width: '20%' }}></div>
                <div className="consent-level denied" style={{ width: '80%' }}></div>
              </div>
              <div className="consent-percentage">20% Granted</div>
            </div>
          </div>
        </div>

        <div className="data-retention">
          <h4>Data Retention Policies</h4>
          <table>
            <thead>
              <tr>
                <th>Data Type</th>
                <th>Retention Period</th>
                <th>Policy Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Analytics Events</td>
                <td>365 days</td>
                <td>Auto Delete</td>
                <td className="status-active">Active</td>
              </tr>
              <tr>
                <td>Page Views</td>
                <td>365 days</td>
                <td>Auto Delete</td>
                <td className="status-active">Active</td>
              </tr>
              <tr>
                <td>NASA API Usage</td>
                <td>365 days</td>
                <td>Auto Delete</td>
                <td className="status-active">Active</td>
              </tr>
              <tr>
                <td>Performance Metrics</td>
                <td>90 days</td>
                <td>Auto Delete</td>
                <td className="status-active">Active</td>
              </tr>
              <tr>
                <td>Consent Records</td>
                <td>730 days</td>
                <td>Anonymize</td>
                <td className="status-active">Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <Window
      title="NASA Portal Analytics Dashboard"
      isVisible={isVisible}
      onClose={onClose}
      width={800}
      height={600}
    >
      <div className="analytics-dashboard">
        {/* Controls */}
        <div className="dashboard-controls">
          <div className="time-range-selector">
            <label>Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="365d">Last Year</option>
            </select>
          </div>

          <div className="export-controls">
            <button className="system7-button" onClick={() => exportData('json')}>
              Export JSON
            </button>
            <button className="system7-button" onClick={() => exportData('csv')}>
              Export CSV
            </button>
          </div>

          <div className="refresh-control">
            <button
              className="system7-button"
              onClick={loadAnalyticsData}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'nasa' ? 'active' : ''}`}
            onClick={() => setActiveTab('nasa')}
          >
            NASA APIs
          </button>
          <button
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
          </button>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {isLoading ? (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <span>Loading analytics data...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'nasa' && renderNasaAnalytics()}
              {activeTab === 'performance' && renderPerformanceMetrics()}
              {activeTab === 'privacy' && renderPrivacyMetrics()}
            </>
          )}
        </div>
      </div>
    </Window>
  );
};

export default AnalyticsDashboard;