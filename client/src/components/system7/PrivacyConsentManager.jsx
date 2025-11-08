import React, { useState, useEffect } from 'react';
import analyticsClient from '../../services/analyticsClient';
import { Window } from './Window';
import './PrivacyConsentManager.css';

/**
 * System 7 Styled Privacy Consent Manager
 *
 * Provides GDPR/CCPA compliant consent management with:
 * - Granular consent categories
 * - Clear privacy policy information
 * - Data subject rights implementation
 * - Consent withdrawal capabilities
 * - Analytics preferences management
 */
const PrivacyConsentManager = ({ isVisible, onClose, onConsentUpdate }) => {
  const [consentSettings, setConsentSettings] = useState({
    essential: true,     // Always required for basic functionality
    performance: false,  // Analytics and performance monitoring
    functional: false,   // NASA data interactions and personalization
    marketing: false     // Newsletter and promotional content
  });

  const [showDetails, setShowDetails] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDataRights, setShowDataRights] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentStatus, setConsentStatus] = useState(null);

  useEffect(() => {
    // Load current consent status
    const currentConsent = analyticsClient.getConsentStatus();
    if (currentConsent.settings) {
      setConsentSettings(currentConsent.settings);
    }
  }, []);

  const handleConsentChange = (category, value) => {
    setConsentSettings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleAcceptAll = async () => {
    setIsSubmitting(true);
    const allConsent = {
      essential: true,
      performance: true,
      functional: true,
      marketing: true
    };

    try {
      const result = await analyticsClient.updateConsent(allConsent);
      if (result.success) {
        setConsentSettings(allConsent);
        onConsentUpdate?.(allConsent);
        onClose();
      }
    } catch (error) {
      console.error('Error updating consent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptSelected = async () => {
    setIsSubmitting(true);

    try {
      const result = await analyticsClient.updateConsent(consentSettings);
      if (result.success) {
        onConsentUpdate?.(consentSettings);
        onClose();
      }
    } catch (error) {
      console.error('Error updating consent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAll = async () => {
    setIsSubmitting(true);
    const minimalConsent = {
      essential: true,    // Cannot opt out of essential
      performance: false,
      functional: false,
      marketing: false
    };

    try {
      const result = await analyticsClient.updateConsent(minimalConsent);
      if (result.success) {
        setConsentSettings(minimalConsent);
        onConsentUpdate?.(minimalConsent);
        onClose();
      }
    } catch (error) {
      console.error('Error updating consent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const userData = await analyticsClient.exportUserData();

      // Create downloadable file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nasa-portal-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Your data has been exported and downloaded.');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again later.');
    }
  };

  const handleDeleteData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all your data? This action cannot be undone.'
    );

    if (confirmed) {
      try {
        const result = await analyticsClient.deleteUserData();
        if (result.success) {
          alert('Your data has been successfully deleted.');
          window.location.reload(); // Reload to reset analytics
        }
      } catch (error) {
        console.error('Error deleting data:', error);
        alert('Error deleting data. Please try again later.');
      }
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <Window
        title="Privacy & Consent Settings"
        isVisible={isVisible}
        onClose={onClose}
        width={600}
        height={500}
      >
        <div className="privacy-consent-manager">
          <div className="consent-intro">
            <h3>Privacy Notice</h3>
            <p>
              NASA System 7 Portal respects your privacy and is committed to protecting your personal data.
              We use analytics and cookies to improve your experience and provide NASA content.
            </p>
          </div>

          {/* Consent Categories */}
          <div className="consent-categories">
            <h4>Data Collection Preferences</h4>

            <div className="consent-category">
              <div className="category-header">
                <input
                  type="checkbox"
                  id="essential"
                  checked={consentSettings.essential}
                  disabled={true} // Cannot opt out
                  onChange={(e) => handleConsentChange('essential', e.target.checked)}
                />
                <label htmlFor="essential" className="category-label">
                  <strong>Essential Data</strong>
                  <span className="category-description">
                    Required for basic website functionality and security
                  </span>
                </label>
              </div>
              <div className="category-details">
                <small>
                  • Website security and functionality<br/>
                  • Error detection and prevention<br/>
                  • Basic user session management
                </small>
              </div>
            </div>

            <div className="consent-category">
              <div className="category-header">
                <input
                  type="checkbox"
                  id="performance"
                  checked={consentSettings.performance}
                  onChange={(e) => handleConsentChange('performance', e.target.checked)}
                />
                <label htmlFor="performance" className="category-label">
                  <strong>Performance Analytics</strong>
                  <span className="category-description">
                    Help us understand how you use the NASA Portal
                  </span>
                </label>
              </div>
              <div className="category-details">
                <small>
                  • Page load performance monitoring<br/>
                  • User interaction analytics<br/>
                  • NASA API usage statistics<br/>
                  • Device and browser information<br/>
                  • Anonymous geographic data
                </small>
              </div>
            </div>

            <div className="consent-category">
              <div className="category-header">
                <input
                  type="checkbox"
                  id="functional"
                  checked={consentSettings.functional}
                  onChange={(e) => handleConsentChange('functional', e.target.checked)}
                />
                <label htmlFor="functional" className="category-label">
                  <strong>Functional Data</strong>
                  <span className="category-description">
                    Personalize your NASA content experience
                  </span>
                </label>
              </div>
              <div className="category-details">
                <small>
                  • NASA content preferences<br/>
                  • Saved searches and favorites<br/>
                  • System 7 interface preferences<br/>
                  • Educational content personalization
                </small>
              </div>
            </div>

            <div className="consent-category">
              <div className="category-header">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={consentSettings.marketing}
                  onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                />
                <label htmlFor="marketing" className="category-label">
                  <strong>Marketing Communications</strong>
                  <span className="category-description">
                    Receive NASA news and educational updates
                  </span>
                </label>
              </div>
              <div className="category-details">
                <small>
                  • NASA newsletter subscriptions<br/>
                  • Educational content updates<br/>
                  • Mission notifications<br/>
                  • Event announcements
                </small>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="consent-actions">
            <button
              className="system7-button"
              onClick={handleAcceptAll}
              disabled={isSubmitting}
            >
              Accept All
            </button>
            <button
              className="system7-button"
              onClick={handleAcceptSelected}
              disabled={isSubmitting}
            >
              Accept Selected
            </button>
            <button
              className="system7-button"
              onClick={handleRejectAll}
              disabled={isSubmitting}
            >
              Reject All
            </button>
          </div>

          {/* Additional Information */}
          <div className="consent-links">
            <button
              className="link-button"
              onClick={() => setShowPrivacyPolicy(true)}
            >
              View Privacy Policy
            </button>
            <button
              className="link-button"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
            <button
              className="link-button"
              onClick={() => setShowDataRights(true)}
            >
              Your Data Rights
            </button>
          </div>

          {/* Detailed Information */}
          {showDetails && (
            <div className="consent-details">
              <h4>Data Processing Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Data Controller:</strong>
                  <span>NASA System 7 Portal</span>
                </div>
                <div className="detail-item">
                  <strong>Legal Basis:</strong>
                  <span>Consent & Legitimate Interest</span>
                </div>
                <div className="detail-item">
                  <strong>Data Retention:</strong>
                  <span>365 days (analytics), 730 days (consent)</span>
                </div>
                <div className="detail-item">
                  <strong>International Transfers:</strong>
                  <span>Only with explicit consent</span>
                </div>
              </div>

              <h5>Analytics Metrics Collected</h5>
              <ul>
                <li>Page views and session duration</li>
                <li>NASA content interactions (APOD, NeoWs, EPIC, Mars Rovers)</li>
                <li>System 7 interface usage patterns</li>
                <li>Performance metrics (load times, errors)</li>
                <li>Device and browser information</li>
                <li>Anonymous geographic data (country/region only)</li>
              </ul>
            </div>
          )}
        </div>
      </Window>

      {/* Privacy Policy Window */}
      {showPrivacyPolicy && (
        <Window
          title="Privacy Policy"
          isVisible={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
          width={700}
          height={600}
        >
          <div className="privacy-policy">
            <h3>NASA System 7 Portal - Privacy Policy</h3>

            <h4>1. Introduction</h4>
            <p>
              The NASA System 7 Portal is committed to protecting your privacy and personal data.
              This policy explains how we collect, use, and protect your information in compliance
              with GDPR, CCPA, and other privacy regulations.
            </p>

            <h4>2. Data We Collect</h4>
            <p>We collect the following types of data:</p>
            <ul>
              <li><strong>Essential Data:</strong> Required for website functionality and security</li>
              <li><strong>Analytics Data:</strong> Anonymous usage patterns and performance metrics</li>
              <li><strong>Functional Data:</strong> User preferences and personalization settings</li>
              <li><strong>NASA Content Data:</strong> Interactions with NASA APIs and content</li>
            </ul>

            <h4>3. How We Use Your Data</h4>
            <p>Your data is used for:</p>
            <ul>
              <li>Providing and improving NASA content delivery</li>
              <li>Monitoring website performance and stability</li>
              <li>Understanding user behavior to enhance the experience</li>
              <li>Ensuring security and preventing abuse</li>
              <li>Complying with legal and regulatory requirements</li>
            </ul>

            <h4>4. Data Storage and Security</h4>
            <p>
              All personal data is stored securely using encryption at rest and in transit.
              We implement appropriate technical and organizational measures to protect your data
              against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h4>5. Data Retention</h4>
            <p>
              We retain data only as long as necessary for the purposes outlined in this policy:
            </p>
            <ul>
              <li>Analytics data: 365 days</li>
              <li>Consent records: 730 days</li>
              <li>Performance metrics: 90 days</li>
              <li>User preferences: Until consent withdrawal</li>
            </ul>

            <h4>6. Your Rights</h4>
            <p>Under GDPR and CCPA, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing of your personal data</li>
              <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
            </ul>

            <h4>7. International Data Transfers</h4>
            <p>
              We do not transfer personal data outside of compliant jurisdictions without your
              explicit consent. All international transfers are subject to appropriate safeguards.
            </p>

            <h4>8. Cookies and Tracking</h4>
            <p>
              We use privacy-first analytics that respect your consent preferences.
              No third-party tracking cookies are used without explicit consent.
            </p>

            <h4>9. Children's Privacy</h4>
            <p>
              Our services are not directed to children under 13. We do not knowingly collect
              personal information from children under 13.
            </p>

            <h4>10. Changes to This Policy</h4>
            <p>
              We may update this privacy policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>

            <h4>11. Contact Information</h4>
            <p>
              If you have any questions about this privacy policy or your rights, please contact us:
            </p>
            <div className="contact-info">
              <p><strong>Email:</strong> privacy@nasa-system7-portal.org</p>
              <p><strong>Address:</strong> NASA System 7 Portal Privacy Team</p>
              <p><strong>Phone:</strong> +1 (555) NASA-PRIVACY</p>
            </div>

            <p className="last-updated">
              <em>Last Updated: {new Date().toLocaleDateString()}</em>
            </p>
          </div>
        </Window>
      )}

      {/* Data Rights Window */}
      {showDataRights && (
        <Window
          title="Your Data Rights"
          isVisible={showDataRights}
          onClose={() => setShowDataRights(false)}
          width={600}
          height={400}
        >
          <div className="data-rights">
            <h3>Exercise Your Data Rights</h3>

            <div className="right-section">
              <h4>Right to Access (GDPR Article 15)</h4>
              <p>Request a copy of all personal data we hold about you.</p>
              <button className="system7-button" onClick={handleExportData}>
                Export My Data
              </button>
            </div>

            <div className="right-section">
              <h4>Right to Erasure (GDPR Article 17 / CCPA)</h4>
              <p>Request deletion of all your personal data from our systems.</p>
              <button className="system7-button delete-button" onClick={handleDeleteData}>
                Delete My Data
              </button>
            </div>

            <div className="right-section">
              <h4>Consent Management</h4>
              <p>Update your consent preferences at any time.</p>
              <button
                className="system7-button"
                onClick={() => {
                  setShowDataRights(false);
                  // Keep the main consent window open
                }}
              >
                Update Consent
              </button>
            </div>

            <div className="right-section">
              <h4>Complaint and Appeals</h4>
              <p>
                If you're not satisfied with our response, you can:
              </p>
              <ul>
                <li>Contact our Data Protection Officer</li>
                <li>File a complaint with your local data protection authority</li>
                <li>Seek judicial remedy in EU courts (GDPR)</li>
                <li>Exercise CCPA private right of action (California)</li>
              </ul>
            </div>

            <div className="compliance-info">
              <h4>Compliance Framework</h4>
              <p>
                <strong>GDPR (General Data Protection Regulation)</strong><br/>
                • Applies to all EU residents<br/>
                • Requires explicit consent for data processing<br/>
                • Grants comprehensive data subject rights
              </p>
              <p>
                <strong>CCPA (California Consumer Privacy Act)</strong><br/>
                • Applies to California residents<br/>
                • Right to know, delete, and opt-out<br/>
                • Requires privacy policy transparency
              </p>
            </div>
          </div>
        </Window>
      )}
    </>
  );
};

export default PrivacyConsentManager;