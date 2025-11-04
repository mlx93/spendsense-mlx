import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { recommendationsApi, profileApi, Recommendation } from '../services/api';
import { showToast } from '../utils/toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshStatus, setRefreshStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Array<{ type: 'critical' | 'warning' | 'info'; message: string }>>([]);

  const loadDataWithProgress = useCallback(async () => {
    if (!user) return;
    
    // Show progress bar during initial load
    setRefreshing(true);
    setLoading(true); // Ensure loading state is set
    setRefreshProgress(0);
    setRefreshStatus('Loading your dashboard...');
    
    // Simulate progress while data loads/generates
    const progressSteps = [
      { progress: 20, status: 'Checking your data...', delay: 400 },
      { progress: 40, status: 'Analyzing transactions...', delay: 600 },
      { progress: 60, status: 'Generating insights...', delay: 800 },
      { progress: 80, status: 'Preparing recommendations...', delay: 600 },
      { progress: 95, status: 'Almost ready...', delay: 400 },
    ];
    
    let currentStep = 0;
    const runProgressStep = () => {
      if (currentStep < progressSteps.length) {
        setRefreshProgress(progressSteps[currentStep].progress);
        setRefreshStatus(progressSteps[currentStep].status);
        currentStep++;
        if (currentStep < progressSteps.length) {
          setTimeout(runProgressStep, progressSteps[currentStep].delay);
        }
      }
    };
    runProgressStep();
    
    try {
      // Load data - profile endpoint will generate if missing
      // loadData is defined below, but we need to reference it here
      // We'll call it directly without the skipLoadingState check since we're managing loading state ourselves
      if (!user) return;
      
      // Load profile and recommendations in parallel
      const [profileResponse, recsResponse] = await Promise.allSettled([
        profileApi.getProfile(user.id),
        recommendationsApi.getRecommendations(user.id, 'active'),
      ]);
      
      // Extract data or handle errors
      const profile = profileResponse.status === 'fulfilled' ? profileResponse.value.data : null;
      const recommendations = recsResponse.status === 'fulfilled' ? recsResponse.value.data.recommendations : [];
      
      // Set recommendations
      setRecommendations(recommendations);
      
      // Generate alerts if profile loaded successfully
      if (profile && profile.signals) {
        const newAlerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string }> = [];
        
        const creditSignal = profile.signals['30d']?.credit;
        if (creditSignal?.any_overdue) {
          newAlerts.push({
            type: 'critical',
            message: 'One or more credit cards are overdue. Please make payments immediately.',
          });
        } else if (creditSignal?.max_utilization > 0.8) {
          newAlerts.push({
            type: 'critical',
            message: `High credit utilization detected (${Math.round(creditSignal.max_utilization * 100)}%). Consider paying down balances.`,
          });
        } else if (creditSignal?.max_utilization > 0.5) {
          newAlerts.push({
            type: 'warning',
            message: `Credit utilization is ${Math.round(creditSignal.max_utilization * 100)}%. Keeping it below 30% may help your credit score.`,
          });
        }
        
        const savingsSignal = profile.signals['30d']?.savings;
        if (savingsSignal?.savings_balance < 100) {
          newAlerts.push({
            type: 'critical',
            message: 'Low savings balance detected. Building an emergency fund is important.',
          });
        } else if (savingsSignal?.emergency_fund_coverage < 3) {
          newAlerts.push({
            type: 'info',
            message: `Your emergency fund covers ${savingsSignal.emergency_fund_coverage.toFixed(1)} months. Experts recommend 3-6 months.`,
          });
        }
        
        const subscriptionSignal = profile.signals['30d']?.subscription;
        if (subscriptionSignal?.count >= 3) {
          newAlerts.push({
            type: 'info',
            message: `You have ${subscriptionSignal.count} recurring subscriptions totaling $${subscriptionSignal.monthly_spend.toFixed(2)}/month.`,
          });
        }
        
        setAlerts(newAlerts.slice(0, 2));
      }
      
      const loadedCount = recommendations.length;
      
      setRefreshProgress(100);
      setRefreshStatus('Complete!');
      
      // If no data loaded, show error
      if (loadedCount === 0) {
        showToast(
          'No data available',
          'warning',
          'Your dashboard is ready, but no recommendations were generated. Try refreshing or check back later.'
        );
      }
      
      setTimeout(() => {
        setRefreshProgress(0);
        setRefreshStatus('');
        setRefreshing(false);
        setLoading(false); // Ensure loading is cleared
      }, 500);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showToast(
        'Failed to load dashboard',
        'error',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setRefreshProgress(0);
      setRefreshStatus('');
      setRefreshing(false);
      setLoading(false); // Ensure loading is cleared even on error
    }
  }, [user]);

  useEffect(() => {
    // Only load data if user has consented
    // Consent modal is shown at App level before user can access dashboard
    // Profile endpoint will generate data if missing, so we show progress during initial load
    if (user && user.consentStatus) {
      // Show progress bar while loading initial data
      // Profile endpoint will generate data synchronously if missing
      loadDataWithProgress();
    } else if (user && !user.consentStatus) {
      // User hasn't consented - show empty dashboard
      setLoading(false);
      setRecommendations([]);
      setAlerts([]);
    }
  }, [user?.id, user?.consentStatus, loadDataWithProgress]); // Include loadDataWithProgress in dependencies

  const loadData = async (skipLoadingState = false) => {
    if (!user) return;

    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      
      // Load profile and recommendations in parallel for faster loading
      // Handle errors gracefully - don't fail completely if one fails
      const [profileResponse, recsResponse] = await Promise.allSettled([
        profileApi.getProfile(user.id),
        recommendationsApi.getRecommendations(user.id, 'active'),
      ]);
      
      // Extract data or handle errors
      const profile = profileResponse.status === 'fulfilled' ? profileResponse.value.data : null;
      const recommendations = recsResponse.status === 'fulfilled' ? recsResponse.value.data.recommendations : [];
      
      // If profile failed, show error toast
      if (profileResponse.status === 'rejected') {
        const error = profileResponse.reason;
        showToast(
          'Failed to load profile',
          'error',
          `Error: ${error?.response?.data?.error || error?.message || 'Unknown error'}\nStatus: ${error?.response?.status || 'N/A'}`
        );
      }
      
      // If recommendations failed, show error toast
      if (recsResponse.status === 'rejected') {
        const error = recsResponse.reason;
        showToast(
          'Failed to load recommendations',
          'error',
          `Error: ${error?.response?.data?.error || error?.message || 'Unknown error'}\nStatus: ${error?.response?.status || 'N/A'}`
        );
      }
      
      // If both failed, show critical error
      if (profileResponse.status === 'rejected' && recsResponse.status === 'rejected') {
        showToast(
          'Failed to load dashboard data',
          'error',
          'Both profile and recommendations failed to load. Check backend logs and ensure user has consented.'
        );
        if (!skipLoadingState) {
          setLoading(false);
        }
        return 0;
      }

      // Generate alerts based on profile (if we have it)
      const newAlerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string }> = [];
      if (!profile || !profile.signals) {
        // No profile data or signals, can't generate alerts
        setAlerts([]);
        setRecommendations(recommendations);
        if (!skipLoadingState) {
          setLoading(false);
        }
        return recommendations.length;
      }
      
      const creditSignal = profile.signals['30d']?.credit;
      
      if (creditSignal?.any_overdue) {
        newAlerts.push({
          type: 'critical',
          message: 'One or more credit cards are overdue. Please make payments immediately.',
        });
      } else if (creditSignal?.max_utilization > 0.8) {
        newAlerts.push({
          type: 'critical',
          message: `High credit utilization detected (${Math.round(creditSignal.max_utilization * 100)}%). Consider paying down balances.`,
        });
      } else if (creditSignal?.max_utilization > 0.5) {
        newAlerts.push({
          type: 'warning',
          message: `Credit utilization is ${Math.round(creditSignal.max_utilization * 100)}%. Keeping it below 30% may help your credit score.`,
        });
      }

      const savingsSignal = profile.signals['30d']?.savings;
      if (savingsSignal?.savings_balance < 100) {
        newAlerts.push({
          type: 'critical',
          message: 'Low savings balance detected. Building an emergency fund is important.',
        });
      } else if (savingsSignal?.emergency_fund_coverage < 3) {
        newAlerts.push({
          type: 'info',
          message: `Your emergency fund covers ${savingsSignal.emergency_fund_coverage.toFixed(1)} months. Experts recommend 3-6 months.`,
        });
      }

      const subscriptionSignal = profile.signals['30d']?.subscription;
      if (subscriptionSignal?.count >= 3) {
        newAlerts.push({
          type: 'info',
          message: `You have ${subscriptionSignal.count} recurring subscriptions totaling $${subscriptionSignal.monthly_spend.toFixed(2)}/month.`,
        });
      }

      setAlerts(newAlerts.slice(0, 2)); // Max 2 alerts
      setRecommendations(recommendations);
      
      return recommendations.length;
    } catch (error) {
      console.error('Error loading dashboard:', error);
      return 0;
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    try {
      setRefreshing(true);
      setRefreshProgress(0);
      setRefreshStatus('Analyzing your transactions...');
      
      // Trigger refresh - this starts background generation and returns immediately
      await recommendationsApi.getRecommendations(user.id, 'active', true);
      
      // Simulate progress with realistic steps - variable timing to feel natural
      const steps = [
        { progress: 15, status: 'Detecting spending patterns...', delay: 600 },
        { progress: 30, status: 'Analyzing credit utilization...', delay: 800 },
        { progress: 50, status: 'Identifying savings opportunities...', delay: 1000 },
        { progress: 70, status: 'Generating personalized recommendations...', delay: 1200 },
        { progress: 85, status: 'Finalizing insights...', delay: 800 },
        { progress: 95, status: 'Almost done...', delay: 600 },
      ];
      
      let currentStep = 0;
      const runNextStep = () => {
        if (currentStep < steps.length) {
          setRefreshProgress(steps[currentStep].progress);
          setRefreshStatus(steps[currentStep].status);
          currentStep++;
          if (currentStep < steps.length) {
            setTimeout(runNextStep, steps[currentStep].delay);
          }
        }
      };
      runNextStep(); // Start the progression
      
      // Wait 6 seconds total for background generation to complete, then check once
      // Progress will animate through steps naturally (totals ~5 seconds)
      timeoutId = setTimeout(async () => {
        setRefreshProgress(100);
        setRefreshStatus('Loading your insights...');
        
        try {
          // Fetch recommendations and profile together
          const [recsResponse, profileResponse] = await Promise.all([
            recommendationsApi.getRecommendations(user.id, 'active').catch(err => ({ data: { recommendations: [] }, error: err } as any)),
            profileApi.getProfile(user.id).catch(err => ({ data: null, error: err } as any)),
          ]);
          
          const newRecs = (recsResponse as any).data?.recommendations || [];
          const profile = (profileResponse as any).data;
          
          if (newRecs.length > 0) {
            // We have recommendations! Update the UI
            setRecommendations(newRecs);
            
            // Update alerts if profile loaded successfully
            if (profile && !(profileResponse as any).error) {
              const creditSignal = profile.signals['30d']?.credit;
              const savingsSignal = profile.signals['30d']?.savings;
              const subscriptionSignal = profile.signals['30d']?.subscription;
              
              const newAlerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string }> = [];
              
              if (creditSignal?.any_overdue) {
                newAlerts.push({
                  type: 'critical',
                  message: 'One or more credit cards are overdue. Please make payments immediately.',
                });
              } else if (creditSignal?.max_utilization > 0.8) {
                newAlerts.push({
                  type: 'critical',
                  message: `High credit utilization detected (${Math.round(creditSignal.max_utilization * 100)}%). Consider paying down balances.`,
                });
              } else if (creditSignal?.max_utilization > 0.5) {
                newAlerts.push({
                  type: 'warning',
                  message: `Credit utilization is ${Math.round(creditSignal.max_utilization * 100)}%. Keeping it below 30% may help your credit score.`,
                });
              }
              
              if (savingsSignal?.savings_balance < 100) {
                newAlerts.push({
                  type: 'critical',
                  message: 'Low savings balance detected. Building an emergency fund is important.',
                });
              } else if (savingsSignal?.emergency_fund_coverage < 3) {
                newAlerts.push({
                  type: 'info',
                  message: `Your emergency fund covers ${savingsSignal.emergency_fund_coverage.toFixed(1)} months. Experts recommend 3-6 months.`,
                });
              }
              
              if (subscriptionSignal?.count >= 3) {
                newAlerts.push({
                  type: 'info',
                  message: `You have ${subscriptionSignal.count} recurring subscriptions totaling $${subscriptionSignal.monthly_spend.toFixed(2)}/month.`,
                });
              }
              
              setAlerts(newAlerts.slice(0, 2));
            }
            
            // Success! Hide progress bar
            setRefreshStatus('Complete!');
            setTimeout(() => {
              setRefreshProgress(0);
              setRefreshStatus('');
              setRefreshing(false);
            }, 500);
          } else {
            // No recommendations - check why
            let errorMessage = 'No recommendations generated';
            let debugDetails = '';
            
            if ((recsResponse as any).error) {
              const error = (recsResponse as any).error;
              errorMessage = 'Failed to fetch recommendations';
              debugDetails = `Error: ${error?.response?.data?.error || error?.message || 'Unknown error'}\n`;
              debugDetails += `Status: ${error?.response?.status || 'N/A'}\n`;
            }
            
            // Try to get debug info from profile
            if (profile && !(profileResponse as any).error) {
              const primaryPersona = profile.personas?.['30d']?.primary;
              const signals30d = profile.signals?.['30d'];
              
              debugDetails += `\nDebug Info:\n`;
              debugDetails += `- Primary Persona: ${primaryPersona?.type || 'None'}\n`;
              debugDetails += `- Persona Score: ${primaryPersona?.score || 'N/A'}\n`;
              debugDetails += `- Signals Available: ${signals30d ? Object.keys(signals30d).join(', ') : 'None'}\n`;
              debugDetails += `- Recommendations Count: 0\n`;
              
              if (!primaryPersona) {
                debugDetails += `\nIssue: No primary persona assigned. Cannot generate recommendations without a persona.`;
              } else if (!signals30d || Object.keys(signals30d).length === 0) {
                debugDetails += `\nIssue: No signals found. Signals are required for recommendation generation.`;
              } else {
                debugDetails += `\nIssue: Generation may have failed. Check backend logs for [generateUserData] errors.`;
              }
            } else if ((profileResponse as any).error) {
              const error = (profileResponse as any).error;
              debugDetails += `\nProfile fetch error: ${error?.response?.data?.error || error?.message || 'Unknown'}`;
            }
            
            // Show error toast with debug info
            showToast(errorMessage, 'error', debugDetails);
            
            setRefreshStatus('No recommendations generated. Check error message.');
            setTimeout(() => {
              setRefreshProgress(0);
              setRefreshStatus('');
              setRefreshing(false);
            }, 2000);
          }
        } catch (error: any) {
          console.error('Error checking for recommendations:', error);
          
          showToast(
            'Failed to check recommendations',
            'error',
            `Error: ${error?.response?.data?.error || error?.message || 'Unknown error'}\nStatus: ${error?.response?.status || 'N/A'}`
          );
          
          setRefreshStatus('Error occurred. Check error message.');
          setTimeout(() => {
            setRefreshProgress(0);
            setRefreshStatus('');
            setRefreshing(false);
          }, 2000);
        }
      }, 6000); // Wait 6 seconds before checking (gives time for generation + progress animation)
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      if (timeoutId) clearTimeout(timeoutId);
      alert('Failed to refresh recommendations. Please try again.');
      setRefreshing(false);
      setRefreshProgress(0);
      setRefreshStatus('');
    }
  };

  const handleAction = async (recId: string, action: string) => {
    try {
      await recommendationsApi.submitFeedback(recId, action);
      if (action === 'dismissed' || action === 'completed') {
        setRecommendations(recs => recs.filter(r => r.id !== recId));
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user?.consentStatus) {
    return (
      <div className="text-center py-12">
        <p className="text-lg mb-4">Enable personalized insights by allowing SpendSense to analyze your data.</p>
        <button
          onClick={async () => {
            try {
              const response = await profileApi.updateConsent(true);
              if (response.data.token && response.data.user) {
                // This will trigger useEffect to call loadDataWithProgress
                window.location.reload(); // Simple reload to refresh user state
              }
            } catch (error) {
              console.error('Error enabling insights:', error);
              showToast('Failed to enable insights', 'error', 'Please try again or refresh the page');
            }
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Enable Insights
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Critical Alert Banners */}
      {alerts.map((alert, idx) => {
        // Determine topic for "Learn more" link based on alert type
        let learnMoreTopic = '';
        if (alert.message.includes('credit') || alert.message.includes('utilization') || alert.message.includes('overdue')) {
          learnMoreTopic = 'credit';
        } else if (alert.message.includes('savings') || alert.message.includes('emergency fund')) {
          learnMoreTopic = 'savings';
        } else if (alert.message.includes('subscription')) {
          learnMoreTopic = 'budgeting';
        }

        return (
          <div
            key={idx}
            className={`p-4 rounded-md ${
              alert.type === 'critical'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : alert.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {alert.type === 'critical' && '🔴 '}
                {alert.type === 'warning' && '🟡 '}
                {alert.type === 'info' && 'ℹ️ '}
                {alert.message}
              </div>
              {learnMoreTopic && (
                <Link
                  to={`/library?topic=${learnMoreTopic}`}
                  className="ml-4 text-sm font-medium underline hover:no-underline whitespace-nowrap"
                >
                  Learn more →
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {/* Recommendations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">For You Today</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {/* Progress Bar */}
        {refreshing && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{refreshStatus || 'Generating insights...'}</span>
              <span className="text-sm text-gray-500">{refreshProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${refreshProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This usually takes 3-5 seconds. We're analyzing your latest transactions and updating your personalized recommendations.
            </p>
          </div>
        )}
        {recommendations.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            You're doing great! Check back later for new insights.
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{rec.title}</h3>
                    {expandedId === rec.id ? (
                      <div>
                        <p className="text-gray-700 mb-4">{rec.rationale}</p>
                        <p className="text-sm text-gray-500 mt-4">
                          This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-600">{rec.rationale.substring(0, 100)}...</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {expandedId !== rec.id ? (
                    <button
                      onClick={() => setExpandedId(rec.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Expand
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedId(null)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Collapse
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(rec.id, 'dismissed')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleAction(rec.id, 'saved')}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Save for Later
                  </button>
                  <Link
                    to={`/article/${rec.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Learn More →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
