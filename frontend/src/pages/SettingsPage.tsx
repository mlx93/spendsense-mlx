import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { profileApi } from '../services/api';
import { recommendationsApi } from '../services/api';

function AccountPreferences({ user }: { user: any }) {
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateEmail = async () => {
    if (!email || email === user?.email) {
      setMessage({ type: 'error', text: 'Please enter a new email address' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await profileApi.updateAccount({ email });
      setMessage({ type: 'success', text: 'Email updated successfully' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update email',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await profileApi.updateAccount({ currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Email Update */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleUpdateEmail}
            disabled={loading || email === user?.email}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            Update
          </button>
        </div>
      </div>

      {/* Password Update */}
      <div className="border-t border-gray-200 pt-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button
            onClick={handleUpdatePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

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
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Consent Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data & Privacy</h2>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <AccountPreferences user={user} />
      </div>

      {/* Dismissed Items */}
      {dismissedRecs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dismissed Recommendations</h2>
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
