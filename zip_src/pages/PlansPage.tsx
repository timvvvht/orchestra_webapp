import React, { useState } from 'react';
import { getPlansBySession } from '@/services/supabase/planService';
import { PlanRow } from '@/types/planTypes';
import LazyMarkdown from '@/components/chat-interface/LazyMarkdown';

/**
 * Plans inspection page - allows users to input a session_id and view associated plans
 */
const PlansPage: React.FC = () => {
  const [sessionInput, setSessionInput] = useState('');
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = sessionInput.trim();
    if (!trimmedInput) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);
    setPlans([]);
    setSelectedPlanId(null);

    try {
      const fetchedPlans = await getPlansBySession(trimmedInput);
      setPlans(fetchedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = selectedPlanId ? plans.find(p => p.id === selectedPlanId) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Plans Inspector</h1>
      
      {/* Input Form */}
      <form onSubmit={handleFetch} className="mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="sessionId" className="block text-sm font-medium text-white/70 mb-2">
              Session ID
            </label>
            <input
              id="sessionId"
              type="text"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="Enter session ID to inspect plans..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !sessionInput.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Fetch Plans'}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-md">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}

      {/* No Plans Message */}
      {!loading && plans.length === 0 && sessionInput.trim() && !error && (
        <div className="text-center py-8">
          <p className="text-white/70">No plans found for session.</p>
        </div>
      )}

      {/* Plans Table */}
      {plans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Plans for Session: {sessionInput.trim()}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-gray-800 border border-gray-700 rounded-lg">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Version</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Updated</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`border-b border-gray-700 cursor-pointer transition-colors ${
                      selectedPlanId === plan.id
                        ? 'bg-blue-900/30'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-white">
                      {plan.title || 'Untitled'}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {plan.current_version || 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'draft' 
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : plan.status === 'complete'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {plan.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {plan.updated_at 
                        ? new Date(plan.updated_at).toLocaleString()
                        : 'Unknown'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Plan Markdown */}
      {selectedPlan && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {selectedPlan.title || 'Untitled Plan'}
            </h3>
            <button
              onClick={() => setSelectedPlanId(null)}
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="prose prose-invert max-w-none text-white/90">
            <LazyMarkdown 
              content={selectedPlan.markdown}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;