import React, { useState, useEffect } from 'react';
import analyticsClient from '../../services/analyticsClient';

const ConsentManager = ({ showSettings = false, onClose }) => {
  const [consentSettings, setConsentSettings] = useState({
    essential: true,
    performance: false,
    functional: false,
    marketing: false
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const status = analyticsClient.getConsentStatus();
    setConsentSettings(status.settings);
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await analyticsClient.updateConsent(consentSettings);
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to save consent settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptAll = async () => {
    setIsLoading(true);
    try {
      await analyticsClient.updateConsent({
        essential: true,
        performance: true,
        functional: true,
        marketing: true
      });
      setConsentSettings({
        essential: true,
        performance: true,
        functional: true,
        marketing: true
      });
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to accept all:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAll = async () => {
    setIsLoading(true);
    try {
      await analyticsClient.updateConsent({
        essential: true,
        performance: false,
        functional: false,
        marketing: false
      });
      setConsentSettings({
        essential: true,
        performance: false,
        functional: false,
        marketing: false
      });
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to reject all:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (category, value) => {
    setConsentSettings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const ConsentDetails = () => (
    <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Essential Cookies</h4>
        <p className="text-sm text-gray-600">
          These cookies are necessary for the website to function and cannot be switched off in our systems.
          They are usually only set in response to actions made by you which amount to a request for services.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Performance Cookies</h4>
        <p className="text-sm text-gray-600">
          These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.
          They help us to know which pages are the most and least popular and see how visitors move around the site.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Functional Cookies</h4>
        <p className="text-sm text-gray-600">
          These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third party providers
          whose services we have added to our pages.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Marketing Cookies</h4>
        <p className="text-sm text-gray-600">
          These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant adverts on other sites.
        </p>
      </div>
    </div>
  );

  const PrivacyPolicy = () => (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="font-semibold text-blue-900 mb-2">🔒 Your Privacy Rights</h4>
      <div className="text-sm text-blue-800 space-y-2">
        <p>• <strong>Control:</strong> You can change your consent preferences at any time</p>
        <p>• <strong>Transparency:</strong> We clearly explain what data we collect and why</p>
        <p>• <strong>Data Minimization:</strong> We only collect data that is necessary for our services</p>
        <p>• <strong>Security:</strong> Your data is encrypted and stored securely</p>
        <p>• <strong>Access:</strong> You can request a copy of your data at any time</p>
        <p>• <strong>Deletion:</strong> You can request deletion of all your data</p>
        <p>• <strong>Portability:</strong> You can export your data in a machine-readable format</p>
      </div>
    </div>
  );

  // Modal/Dialog version
  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Privacy & Consent Settings</h2>
            <p className="text-gray-600 mt-1">
              Manage your privacy preferences and consent for NASA System 7 Portal analytics
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {Object.entries({
                essential: {
                  label: 'Essential',
                  description: 'Required for basic functionality and security',
                  required: true
                },
                performance: {
                  label: 'Performance',
                  description: 'Help us understand how you use our site and improve performance',
                  required: false
                },
                functional: {
                  label: 'Functional',
                  description: 'Enable personalized features and remember your preferences',
                  required: false
                },
                marketing: {
                  label: 'Marketing',
                  description: 'Help us show you relevant content and understand our audience',
                  required: false
                }
              }).map(([key, config]) => (
                <div key={key} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={key}
                    checked={consentSettings[key]}
                    onChange={(e) => handleSettingChange(key, e.target.checked)}
                    disabled={config.required}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <label htmlFor={key} className="font-medium text-gray-900">
                      {config.label}
                      {config.required && <span className="ml-2 text-xs text-gray-500">(Required)</span>}
                    </label>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showDetails ? 'Hide' : 'Show'} detailed information
              </button>
              {showDetails && <ConsentDetails />}
            </div>

            <PrivacyPolicy />
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRejectAll}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={handleAcceptAll}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Accept All'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner version
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Privacy & Analytics</h3>
            <p className="text-sm text-gray-600">
              We use privacy-first analytics to understand how NASA's data is being used and improve your experience.
              Your data is never sold and is always anonymized.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Learn More
            </button>
            <button
              onClick={handleRejectAll}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Essential Only
            </button>
            <button
              onClick={handleAcceptAll}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Accept All
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4">
            <ConsentDetails />
            <PrivacyPolicy />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentManager;