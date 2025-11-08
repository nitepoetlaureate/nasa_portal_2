import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import analyticsClient from '../../services/analyticsClient';

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Fetch dashboard analytics
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['analytics-dashboard', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard analytics: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch NASA API analytics
  const { data: nasaApiData, isLoading: nasaLoading, error: nasaError } = useQuery({
    queryKey: ['nasa-api-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/nasa-api?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch NASA API analytics: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Fetch performance metrics
  const { data: performanceData, isLoading: performanceLoading, error: performanceError } = useQuery({
    queryKey: ['performance-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/performance?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch performance analytics: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Consent status
  const [consentStatus, setConsentStatus] = useState(analyticsClient.getConsentStatus());

  useEffect(() => {
    setConsentStatus(analyticsClient.getConsentStatus());
  }, []);

  const handleConsentUpdate = async (newSettings) => {
    try {
      await analyticsClient.updateConsent(newSettings);
      setConsentStatus(analyticsClient.getConsentStatus());
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const exportUserData = async () => {
    try {
      const data = await analyticsClient.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nasa-portal-user-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export user data:', error);
    }
  };

  const deleteUserData = async () => {
    if (window.confirm('Are you sure you want to delete all your analytics data? This action cannot be undone.')) {
      try {
        await analyticsClient.deleteUserData();
        alert('Your analytics data has been deleted successfully.');
        window.location.reload();
      } catch (error) {
        console.error('Failed to delete user data:', error);
        alert('Failed to delete user data. Please try again.');
      }
    }
  };

  const renderOverviewMetrics = () => {
    if (!dashboardData?.data) return null;

    const totalEvents = dashboardData.data.reduce((sum, day) => sum + parseInt(day.event_count), 0);
    const uniqueUsers = new Set(dashboardData.data.map(day => day.unique_users)).size;
    const uniqueSessions = new Set(dashboardData.data.map(day => day.unique_sessions)).size;
    const avgDuration = dashboardData.data.reduce((sum, day) => sum + parseFloat(day.avg_duration_ms || 0), 0) / dashboardData.data.length;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Events</div>
          <div className="text-2xl font-bold text-blue-600">{totalEvents.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Unique Users</div>
          <div className="text-2xl font-bold text-green-600">{uniqueUsers.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Sessions</div>
          <div className="text-2xl font-bold text-purple-600">{uniqueSessions.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Avg Duration</div>
          <div className="text-2xl font-bold text-orange-600">{Math.round(avgDuration)}ms</div>
        </div>
      </div>
    );
  };

  const renderNasaApiMetrics = () => {
    if (!nasaApiData?.data) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">NASA API Usage</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cache Hit Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {nasaApiData.data.map((api, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {api.api_endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {parseInt(api.request_count).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(api.avg_response_time)}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {api.request_count > 0 ? Math.round((api.cache_hits / api.request_count) * 100) : 0}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {api.request_count > 0 ? Math.round((api.error_count / api.request_count) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!performanceData?.data) return null;

    const metricsByType = performanceData.data.reduce((acc, metric) => {
      if (!acc[metric.metric_type]) acc[metric.metric_type] = [];
      acc[metric.metric_type].push(metric);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>

        {Object.entries(metricsByType).map(([metricType, metrics]) => (
          <div key={metricType} className="bg-white rounded-lg shadow p-4">
            <h4 className="text-md font-medium mb-3 capitalize">{metricType.replace('_', ' ')}</h4>
            <div className="space-y-2">
              {metrics.map((metric, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{metric.metric_name}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">
                      {Math.round(metric.avg_value)}{metric.metric_unit || 'ms'}
                    </span>
                    <div className="text-xs text-gray-500">
                      Min: {Math.round(metric.min_value)} | Max: {Math.round(metric.max_value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderConsentManager = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Privacy & Consent Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Essential</div>
              <div className="text-sm text-gray-600">Required for basic functionality</div>
            </div>
            <input
              type="checkbox"
              checked={consentStatus.settings.essential}
              disabled
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Performance</div>
              <div className="text-sm text-gray-600">Help us improve site performance</div>
            </div>
            <input
              type="checkbox"
              checked={consentStatus.settings.performance}
              onChange={(e) => handleConsentUpdate({ performance: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Functional</div>
              <div className="text-sm text-gray-600">Track feature usage and preferences</div>
            </div>
            <input
              type="checkbox"
              checked={consentStatus.settings.functional}
              onChange={(e) => handleConsentUpdate({ functional: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Marketing</div>
              <div className="text-sm text-gray-600">Help us understand our audience</div>
            </div>
            <input
              type="checkbox"
              checked={consentStatus.settings.marketing}
              onChange={(e) => handleConsentUpdate({ marketing: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium mb-3">Your Data Rights</h4>
          <div className="space-y-3">
            <button
              onClick={exportUserData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Export My Data
            </button>
            <button
              onClick={deleteUserData}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete All My Data
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>Consent ID: {consentStatus.consentId}</p>
          <p>Last updated: Tracking is {consentStatus.hasAnyConsent ? 'enabled' : 'disabled'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">NASA System 7 Analytics</h1>
          <p className="text-gray-600">Comprehensive analytics dashboard with privacy-first tracking</p>

          {/* Time Range Selector */}
          <div className="mt-4 flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {['overview', 'nasa-api', 'performance', 'consent'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedMetric === metric
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {metric.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {dashboardLoading && <div className="text-center py-8">Loading analytics data...</div>}
          {dashboardError && <div className="text-center py-8 text-red-600">Error loading analytics: {dashboardError.message}</div>}

          {!dashboardLoading && !dashboardError && (
            <>
              {selectedMetric === 'overview' && renderOverviewMetrics()}
              {selectedMetric === 'nasa-api' && renderNasaApiMetrics()}
              {selectedMetric === 'performance' && renderPerformanceMetrics()}
              {selectedMetric === 'consent' && renderConsentManager()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This analytics system respects your privacy and is fully GDPR/CCPA compliant.</p>
          <p>All data is anonymized and processed with your explicit consent.</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;