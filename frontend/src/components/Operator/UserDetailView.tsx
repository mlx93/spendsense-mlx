import { useState, useEffect } from 'react';
import { operatorApi } from '../../services/api';

interface UserDetail {
  user: {
    id: string;
    email: string;
    consentStatus: boolean;
    createdAt: string;
  };
  signals: {
    '30d': any;
    '180d': any;
  };
  personas: {
    '30d': {
      primary: { type: string; score: number } | null;
      secondary: { type: string; score: number } | null;
    };
    '180d': {
      primary: { type: string; score: number } | null;
      secondary: { type: string; score: number } | null;
    };
  };
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    rationale: string;
    decisionTrace?: any;
    agenticReviewStatus: string;
  }>;
}

interface UserDetailViewProps {
  userId: string;
  onClose: () => void;
}

export default function UserDetailView({ userId, onClose }: UserDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'signals' | 'recommendations' | 'audit'>('overview');
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<'30d' | '180d'>('30d');

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      setLoading(true);
      const response = await operatorApi.getUserDetail(userId);
      setDetail(response.data);
    } catch (error) {
      console.error('Error loading user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!detail) {
    return <div className="text-center py-12">User not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Details: {detail.user.email}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(['overview', 'signals', 'recommendations', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-medium">{detail.user.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Consent Status</p>
              <p className={`font-medium ${detail.user.consentStatus ? 'text-green-600' : 'text-red-600'}`}>
                {detail.user.consentStatus ? 'Consented' : 'Not Consented'}
              </p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Persona Assignments (30d)</h3>
            {detail.personas['30d'].primary && (
              <div className="bg-blue-50 p-3 rounded mb-2">
                <p className="font-medium">Primary: {detail.personas['30d'].primary.type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600">Score: {Math.round(detail.personas['30d'].primary.score * 100)}%</p>
              </div>
            )}
            {detail.personas['30d'].secondary && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">Secondary: {detail.personas['30d'].secondary.type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600">Score: {Math.round(detail.personas['30d'].secondary.score * 100)}%</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Recommendations</p>
            <p className="text-2xl font-bold">{detail.recommendations.filter(r => r.status === 'active').length}</p>
          </div>
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedWindow('30d')}
              className={`px-4 py-2 rounded ${selectedWindow === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedWindow('180d')}
              className={`px-4 py-2 rounded ${selectedWindow === '180d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              180 Days
            </button>
          </div>
          <div className="space-y-4">
            {detail.signals[selectedWindow] && Object.entries(detail.signals[selectedWindow]).map(([key, value]) => (
              <div key={key} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 capitalize">{key.replace(/_/g, ' ')}</h4>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {detail.recommendations.map((rec) => (
            <div key={rec.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.rationale}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.status === 'active' ? 'bg-green-100 text-green-800' :
                      rec.status === 'hidden' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rec.status}
                    </span>
                    {rec.agenticReviewStatus === 'flagged' && (
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                        FLAGGED
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {selectedRec === rec.id ? 'Hide Trace' : 'View Trace'}
                </button>
              </div>
              {selectedRec === rec.id && rec.decisionTrace && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-semibold text-gray-900 mb-2">Decision Trace</h5>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(rec.decisionTrace, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="text-center py-12 text-gray-500">
          Audit log feature coming soon. This would show operator actions on this user.
        </div>
      )}
    </div>
  );
}

