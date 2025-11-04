import { useState } from 'react';
import { profileApi } from '../services/api';
import { useAuth } from '../lib/authContext';

interface ConsentModalProps {
  onConsent: (consented: boolean) => void;
}

export default function ConsentModal({ onConsent }: ConsentModalProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const { updateToken } = useAuth();

  const handleAllow = async () => {
    setLoading(true);
    setProgress(0);
    setStatus('Setting up your account...');
    
    // Simulate progress while consent endpoint generates data
    const progressSteps = [
      { progress: 15, status: 'Detecting spending patterns...', delay: 600 },
      { progress: 30, status: 'Analyzing credit utilization...', delay: 800 },
      { progress: 50, status: 'Identifying savings opportunities...', delay: 1000 },
      { progress: 70, status: 'Generating personalized recommendations...', delay: 1200 },
      { progress: 85, status: 'Finalizing insights...', delay: 800 },
      { progress: 95, status: 'Almost done...', delay: 600 },
    ];
    
    let currentStep = 0;
    const runProgressStep = () => {
      if (currentStep < progressSteps.length) {
        setProgress(progressSteps[currentStep].progress);
        setStatus(progressSteps[currentStep].status);
        currentStep++;
        if (currentStep < progressSteps.length) {
          setTimeout(runProgressStep, progressSteps[currentStep].delay);
        }
      }
    };
    runProgressStep();
    
    try {
      // This will now wait for generateUserData to complete (3-5 seconds)
      const response = await profileApi.updateConsent(true);
      
      // Update progress to 100%
      setProgress(100);
      setStatus('Complete!');
      
      // Update token and user in auth context with new consent status
      if (response.data.token && response.data.user) {
        updateToken(response.data.token, response.data.user);
      }
      
      // Small delay to show "Complete!" message
      setTimeout(() => {
        onConsent(true);
      }, 500);
    } catch (error) {
      console.error('Error updating consent:', error);
      setProgress(0);
      setStatus('');
      alert('Failed to update consent. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      // Set consent to false - user can enable later in Settings
      const response = await profileApi.updateConsent(false);
      if (response.data.token && response.data.user) {
        updateToken(response.data.token, response.data.user);
      }
      onConsent(false);
    } catch (error) {
      console.error('Error updating consent:', error);
      // Still proceed - user wants to skip
      onConsent(false);
    } finally {
      setLoading(false);
    }
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
        {loading && progress > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{status || 'Setting up...'}</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-[140px]"
          >
            {loading ? 'Enabling...' : 'Allow Analysis'}
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-[140px]"
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

