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
  const [showDismissed, setShowDismissed] = useState(false);
  const [dismissedRecs, setDismissedRecs] = useState<Recommendation[]>([]);

  const loadDataWithProgress = useCallback(async () => {
    if (!user) return;
    
    // Show progress bar during initial load
    setRefreshing(true);
    setLoading(true); // Ensure loading state is set
    setRefreshProgress(0);
    setRefreshStatus('Loading your dashboard...');
    
    // Start API calls immediately and update progress based on actual progress
    // This prevents the progress bar from hanging at 95% while waiting for generateUserData
    if (!user) return;
    
    // Set initial progress
    setRefreshProgress(10);
    setRefreshStatus('Connecting to server...');
    
      // Start API calls in parallel - they will trigger generateUserData if needed
      const profilePromise = profileApi.getProfile(user.id);
      const recommendationsPromise = recommendationsApi.getRecommendations(user.id, 'active');
      const dismissedPromise = recommendationsApi.getRecommendations(user.id, 'dismissed');
    
    // Update progress as we wait for responses
    const progressInterval = setInterval(() => {
      setRefreshProgress(prev => {
        // Gradually increase progress up to 90% while waiting
        if (prev < 90) {
          return Math.min(prev + 5, 90);
        }
        return prev;
      });
    }, 500);
    
    // Update status messages while waiting
    const statusMessages = [
      'Checking your data...',
      'Analyzing transactions...',
      'Generating insights...',
      'Preparing recommendations...',
    ];
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setRefreshStatus(statusMessages[statusIndex]);
        statusIndex++;
      }
    }, 1500);
    
    try {
      // Wait for both API calls to complete
      setRefreshProgress(90);
      setRefreshStatus('Finalizing...');
      
      const [profileResponse, recsResponse, dismissedResponse] = await Promise.allSettled([
        profilePromise,
        recommendationsPromise,
        dismissedPromise,
      ]);
      
      // Extract data or handle errors
      const profile = profileResponse.status === 'fulfilled' ? profileResponse.value.data : null;
      const recommendations = recsResponse.status === 'fulfilled' ? recsResponse.value.data.recommendations : [];
      const dismissed = dismissedResponse.status === 'fulfilled' ? dismissedResponse.value.data.recommendations : [];
      
      // Set recommendations
      setRecommendations(recommendations);
      setDismissedRecs(dismissed);
      
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
      
      // Clear intervals once we have responses
      clearInterval(progressInterval);
      clearInterval(statusInterval);
      
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
      // Clear intervals on error
      clearInterval(progressInterval);
      clearInterval(statusInterval);
      
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
      
      // Update the status locally
      setRecommendations(recs => recs.map(r => 
        r.id === recId ? { ...r, status: action } : r
      ));
      
      // If dismissed or completed, remove from view
      if (action === 'dismissed' || action === 'completed') {
        setRecommendations(recs => recs.filter(r => r.id !== recId));
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Sort recommendations: saved ones first, then by date
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    // Saved items come first
    if (a.status === 'saved' && b.status !== 'saved') return -1;
    if (a.status !== 'saved' && b.status === 'saved') return 1;
    // Then sort by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
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

        // Define alert styling based on type
        const alertStyles = {
          critical: {
            gradient: 'bg-gradient-to-r from-red-50 via-red-50/80 to-red-50/60',
            border: 'border-l-4 border-red-500',
            icon: (
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ),
            textColor: 'text-red-900',
            badgeColor: 'bg-red-100 text-red-700'
          },
          warning: {
            gradient: 'bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-50/60',
            border: 'border-l-4 border-amber-500',
            icon: (
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ),
            textColor: 'text-amber-900',
            badgeColor: 'bg-amber-100 text-amber-700'
          },
          info: {
            gradient: 'bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-50/60',
            border: 'border-l-4 border-blue-500',
            icon: (
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            textColor: 'text-blue-900',
            badgeColor: 'bg-blue-100 text-blue-700'
          }
        };

        const style = alertStyles[alert.type];

        return (
          <div
            key={idx}
            className={`${style.gradient} ${style.border} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-start gap-3">
              {style.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <p className={`text-sm font-medium ${style.textColor} leading-relaxed`}>
                    {alert.message}
                  </p>
                  {learnMoreTopic && (
                    <Link
                      to={`/library?topic=${learnMoreTopic}`}
                      className={`${style.badgeColor} px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap hover:opacity-80 transition-opacity flex items-center gap-1`}
                    >
                      Learn more
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Recommendations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {showDismissed ? 'Dismissed Recommendations' : 'For You Today'}
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(e) => {
                setShowDismissed(e.target.checked);
                if (e.target.checked && dismissedRecs.length === 0) {
                  // Load dismissed recommendations if not already loaded
                  recommendationsApi.getRecommendations(user!.id, 'dismissed')
                    .then(res => setDismissedRecs(res.data.recommendations))
                    .catch(err => console.error('Error loading dismissed:', err));
                }
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show dismissed</span>
          </label>
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
        {(() => {
          const displayRecs = showDismissed ? dismissedRecs : sortedRecommendations;
          
          if (displayRecs.length === 0) {
            return (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
                {showDismissed 
                  ? "You haven't dismissed any recommendations yet."
                  : "You're doing great! Check back later for new insights."}
              </div>
            );
          }
          
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {displayRecs.map((rec) => {
              const isSaved = rec.status === 'saved';
              
              // Icon and color mapping for categories
              const getCategoryIcon = (category: string) => {
                switch (category) {
                  case 'Credit':
                    return '💳';
                  case 'Savings':
                    return '💰';
                  case 'Budgeting':
                    return '📊';
                  case 'Income':
                    return '💵';
                  case 'Subscriptions':
                    return '🔄';
                  case 'Investing':
                    return '📈';
                  case 'Offer':
                    return '🎁';
                  default:
                    return '📚';
                }
              };
              
              return (
              <div
                key={rec.id}
                className={`bg-white rounded-2xl shadow-md border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative ${
                  isSaved ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100 hover:border-blue-200'
                }`}
              >
                {isSaved && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    ⭐ Saved
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors pr-2">{rec.title}</h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap flex-shrink-0">
                      {getCategoryIcon(rec.category || 'Education')} {rec.category || 'Education'}
                    </span>
                  </div>
                  {expandedId === rec.id ? (
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">{rec.rationale}</p>
                      <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 p-2 rounded-md border-l-2 border-gray-300">
                        This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed">{rec.rationale.substring(0, 200)}...</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  {expandedId !== rec.id ? (
                    <button
                      onClick={() => setExpandedId(rec.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1"
                    >
                      Read more
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedId(null)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1"
                    >
                      Show less
                      <svg className="w-3 h-3 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    {showDismissed ? (
                      <button
                        onClick={async () => {
                          try {
                            await recommendationsApi.submitFeedback(rec.id, 'undismiss');
                            setDismissedRecs(recs => recs.filter(r => r.id !== rec.id));
                            // Reload active recommendations to show the restored item
                            const activeResponse = await recommendationsApi.getRecommendations(user!.id, 'active');
                            setRecommendations(activeResponse.data.recommendations);
                          } catch (error) {
                            console.error('Error undismissing:', error);
                          }
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all duration-150"
                        title="Restore"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(rec.id, 'dismissed')}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all duration-150"
                        title="Dismiss"
                      >
                        Dismiss
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(rec.id, isSaved ? 'active' : 'saved')}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-150 ${
                        isSaved
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title={isSaved ? 'Click to unsave' : 'Save for later'}
                    >
                      {isSaved ? '✓ Saved' : 'Save'}
                    </button>
                    <Link
                      to={`/article/${rec.id}`}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1 shadow-sm"
                    >
                      Learn More
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
