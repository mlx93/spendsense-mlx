import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { operatorApi } from '../services/api';
import UserDetailView from '../components/Operator/UserDetailView';
import { useAuth } from '../lib/authContext';
import { showToast } from '../utils/toast';
import api from '../lib/apiClient';

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
  status: string; // 'active', 'hidden', etc.
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
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flaggedRecs, setFlaggedRecs] = useState<FlaggedRecommendation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [exampleUserEmails, setExampleUserEmails] = useState<string[]>([]);

  // Redirect non-operators
  if (user && user.role !== 'operator') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadData();
    loadExampleUsers();
  }, []);

  const loadExampleUsers = async () => {
    try {
      const response = await api.get('/auth/example-users');
      const emails = response.data.exampleUsers?.map((u: any) => u.email) || [];
      setExampleUserEmails(emails);
    } catch (error) {
      console.error('Error loading example users:', error);
    }
  };

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
      showToast('Recommendation approved', 'success', 'The recommendation is now active and will be shown to the user');
      loadData();
      setSelectedRec(null);
    } catch (error) {
      console.error('Error approving:', error);
      showToast('Failed to approve recommendation', 'error', 'Please try again');
    }
  };

  const handleHide = async (recId: string) => {
    try {
      await operatorApi.hideRecommendation(recId, 'Hidden by operator');
      showToast('Recommendation hidden', 'success', 'The recommendation will not be shown to the user');
      loadData();
      setSelectedRec(null);
    } catch (error) {
      console.error('Error hiding:', error);
      showToast('Failed to hide recommendation', 'error', 'Please try again');
    }
  };

  const handleUnhide = async (recId: string) => {
    try {
      await operatorApi.approveRecommendation(recId, 'Unhidden by operator');
      showToast('Recommendation unhidden', 'success', 'The recommendation is now active again');
      loadData();
      setSelectedRec(null);
    } catch (error) {
      console.error('Error unhiding:', error);
      showToast('Failed to unhide recommendation', 'error', 'Please try again');
    }
  };

  const handleResetConsent = async () => {
    if (!confirm('Are you sure you want to reset consent for ALL users? This will require them to consent again.')) {
      return;
    }
    try {
      const response = await operatorApi.resetConsent();
      showToast(`Successfully reset consent for ${response.data.usersAffected} users`, 'success');
      loadData(); // Reload to see updated consent statuses
    } catch (error) {
      console.error('Error resetting consent:', error);
      showToast('Failed to reset consent', 'error', 'Please try again');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>
        <button
          onClick={handleResetConsent}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Reset All User Consent
        </button>
      </div>

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
        <div className="relative">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
              {(() => {
                const filteredUsers = users.filter(user => 
                  !searchTerm || user.email.toLowerCase().includes(searchTerm.toLowerCase())
                );
                
                // Sort: example users first, then alphabetically
                const sortedUsers = [...filteredUsers].sort((a, b) => {
                  const aIsExample = exampleUserEmails.includes(a.email.toLowerCase());
                  const bIsExample = exampleUserEmails.includes(b.email.toLowerCase());
                  
                  if (aIsExample && !bIsExample) return -1;
                  if (!aIsExample && bIsExample) return 1;
                  return a.email.localeCompare(b.email);
                });
                
                if (sortedUsers.length === 0) {
                  return (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      No users found
                    </div>
                  );
                }
                
                return (
                  <>
                    {sortedUsers.map((user) => {
                      const isExample = exampleUserEmails.includes(user.email.toLowerCase());
                      const personaDisplay = user.primaryPersona?.replace(/_/g, ' ') || 'No persona';
                      
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            isExample ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowDropdown(false);
                            setSearchTerm('');
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{user.email}</p>
                              {isExample && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded flex-shrink-0">
                                  Example
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                user.primaryPersona === 'high_utilization' ? 'bg-red-100 text-red-800' :
                                user.primaryPersona === 'variable_income' ? 'bg-yellow-100 text-yellow-800' :
                                user.primaryPersona === 'subscription_heavy' ? 'bg-purple-100 text-purple-800' :
                                user.primaryPersona === 'savings_builder' ? 'bg-green-100 text-green-800' :
                                user.primaryPersona === 'net_worth_maximizer' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {personaDisplay}
                              </span>
                              {' • '}
                              {user.activeRecommendations} recs
                            </p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2 flex-shrink-0">
                            View →
                          </button>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}
        </div>
        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowDropdown(false)}
          />
        )}
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
            {flaggedRecs.map((rec) => {
              const isHidden = rec.status === 'hidden';
              
              return (
              <div
                key={rec.id}
                className={`border rounded-lg p-4 ${
                  selectedRec === rec.id ? 'border-blue-500 bg-blue-50' : 
                  isHidden ? 'border-gray-300 bg-gray-50' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                        FLAGGED
                      </span>
                      {isHidden && (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                          HIDDEN FROM USER
                        </span>
                      )}
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
                  {!isHidden ? (
                    <>
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
                    </>
                  ) : (
                    <button
                      onClick={() => handleUnhide(rec.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Unhide
                    </button>
                  )}
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
                    <p className="text-xs text-gray-500">Status: {rec.status}</p>
                    <p className="text-xs text-gray-500">Flagged At: {new Date(rec.flaggedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
