import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { profileApi } from '../services/api';
import { recommendationsApi } from '../services/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [consentStatus, setConsentStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissedRecs, setDismissedRecs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const profileResponse = await profileApi.getProfile(user.id);
      setConsentStatus(profileResponse.data.consent);

      const dismissedResponse = await recommendationsApi.getRecommendations(user.id, 'dismissed');
      setDismissedRecs(dismissedResponse.data.recommendations);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentToggle = async () => {
    if (!user) return;
    try {
      await profileApi.updateConsent(!consentStatus);
      setConsentStatus(!consentStatus);
      if (!consentStatus) {
        // Reload page to refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating consent:', error);
    }
  };

  const handleUndismiss = async (recId: string) => {
    try {
      await recommendationsApi.submitFeedback(recId, 'saved');
      setDismissedRecs(recs => recs.filter(r => r.id !== recId));
    } catch (error) {
      console.error('Error undismissing:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      {/* Consent Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data & Privacy</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700 font-medium">Personalized Insights</p>
            <p className="text-sm text-gray-500 mt-1">
              Allow SpendSense to analyze your transaction data to provide personalized recommendations
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={consentStatus}
              onChange={handleConsentToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {!consentStatus && (
          <p className="mt-4 text-sm text-gray-600">
            When disabled, SpendSense will not process your data or generate personalized recommendations. You can re-enable this at any time.
          </p>
        )}
      </div>

      {/* Account Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <p className="text-sm text-gray-500">
            Account management features coming soon.
          </p>
        </div>
      </div>

      {/* Dismissed Items */}
      {dismissedRecs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dismissed Recommendations</h2>
          <div className="space-y-3">
            {dismissedRecs.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{rec.title}</p>
                  <p className="text-sm text-gray-600">{rec.rationale.substring(0, 100)}...</p>
                </div>
                <button
                  onClick={() => handleUndismiss(rec.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
