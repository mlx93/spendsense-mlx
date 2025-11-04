import { useState } from 'react';
import { profileApi } from '../services/api';

interface ConsentModalProps {
  onConsent: (consented: boolean) => void;
}

export default function ConsentModal({ onConsent }: ConsentModalProps) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      await profileApi.updateConsent(true);
      onConsent(true);
    } catch (error) {
      console.error('Error updating consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onConsent(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to SpendSense
        </h2>
        <p className="text-gray-700 mb-4">
          To provide you with personalized financial insights and recommendations, SpendSense needs to analyze your transaction data.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">What we analyze:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Spending patterns and categories</li>
            <li>Recurring subscriptions</li>
            <li>Credit card utilization</li>
            <li>Savings patterns</li>
            <li>Income stability</li>
          </ul>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Your privacy:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Your data stays secure and private</li>
            <li>You can revoke consent anytime in Settings</li>
            <li>We never share your data with third parties</li>
            <li>Analysis happens automatically - no manual review</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Enabling...' : 'Allow Analysis'}
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Skip for Now
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          You can enable this later in Settings
        </p>
      </div>
    </div>
  );
}

