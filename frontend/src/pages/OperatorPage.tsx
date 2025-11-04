import { useEffect, useState } from 'react';
import { operatorApi } from '../services/api';
import UserDetailView from '../components/Operator/UserDetailView';

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

interface User {
  id: string;
  email: string;
  consentStatus: boolean;
  primaryPersona: string | null;
  primaryPersonaScore: number | null;
  secondaryPersona: string | null;
  secondaryPersonaScore: number | null;
  activeRecommendations: number;
  flaggedRecommendations: number;
}

export default function OperatorPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flaggedRecs, setFlaggedRecs] = useState<FlaggedRecommendation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardResponse, reviewResponse, usersResponse] = await Promise.all([
        operatorApi.getDashboard(),
        operatorApi.getReviewQueue(),
        operatorApi.getUsers(1, 100),
      ]);
      setStats(dashboardResponse.data.stats);
      setFlaggedRecs(reviewResponse.data.flaggedRecommendations);
      setUsers(usersResponse.data.users);
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

      {/* User Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Search</h2>
        <input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users
            .filter(user => !searchTerm || user.email.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                onClick={() => setSelectedUserId(user.id)}
              >
                <div>
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    {user.primaryPersona?.replace(/_/g, ' ') || 'No persona'} • {user.activeRecommendations} recs
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details →
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* User Detail View Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <UserDetailView userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
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
