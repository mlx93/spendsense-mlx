import { useEffect, useState } from 'react';
import { operatorApi } from '../services/api';

interface DashboardStats {
  totalUsers: number;
  totalRecommendations: number;
  flaggedRecommendations: number;
  personas: Record<string, number>;
}

interface FlaggedRecommendation {
  id: string;
  userId: string;
  userEmail: string;
  type: string;
  title: string;
  rationale: string;
  agenticReviewStatus: string;
  agenticReviewReason: string | null;
  flaggedAt: string;
}

export default function OperatorPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flaggedRecs, setFlaggedRecs] = useState<FlaggedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardResponse, reviewResponse] = await Promise.all([
        operatorApi.getDashboard(),
        operatorApi.getReviewQueue(),
      ]);
      setStats(dashboardResponse.data.stats);
      setFlaggedRecs(reviewResponse.data.flaggedRecommendations);
    } catch (error) {
      console.error('Error loading operator data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (recId: string) => {
    try {
      await operatorApi.approveRecommendation(recId, 'Approved by operator');
      loadData();
      setSelectedRec(null);
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleHide = async (recId: string) => {
    try {
      await operatorApi.hideRecommendation(recId, 'Hidden by operator');
      loadData();
      setSelectedRec(null);
    } catch (error) {
      console.error('Error hiding:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Recommendations</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRecommendations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Flagged Items</p>
            <p className="text-3xl font-bold text-red-600">{stats.flaggedRecommendations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Persona Types</p>
            <p className="text-sm text-gray-700 mt-2">
              {Object.keys(stats.personas).length} unique personas
            </p>
          </div>
        </div>
      )}

      {/* Flagged Recommendations Queue */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Flagged Recommendations</h2>
        {flaggedRecs.length === 0 ? (
          <p className="text-gray-500">No flagged recommendations</p>
        ) : (
          <div className="space-y-4">
            {flaggedRecs.map((rec) => (
              <div
                key={rec.id}
                className={`border rounded-lg p-4 ${
                  selectedRec === rec.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                        FLAGGED
                      </span>
                      <span className="text-sm text-gray-500">{rec.userEmail}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{rec.title}</h3>
                    <p className="text-sm text-gray-700 mb-2">{rec.rationale}</p>
                    {rec.agenticReviewReason && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <strong>Flag Reason:</strong> {rec.agenticReviewReason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleApprove(rec.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleHide(rec.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium"
                  >
                    {selectedRec === rec.id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>
                {selectedRec === rec.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">User ID: {rec.userId}</p>
                    <p className="text-xs text-gray-500">Flagged At: {new Date(rec.flaggedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
