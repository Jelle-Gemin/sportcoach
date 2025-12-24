import React, { useState, useEffect } from 'react';
import { StravaActivityDetail, StravaStream } from '@/services/stravaApi';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface ActivityAnalysisProps {
  activity: StravaActivityDetail;
  streams: Record<string, StravaStream> | null;
}

interface AIAnalysis {
  performance_summary: string;
  pace_analysis: string;
  heart_rate: string;
  consistency: string;
}

export function ActivityAnalysis({ activity, streams }: ActivityAnalysisProps) {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (activity) {
      loadAnalysis();
    }
  }, [activity?.id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached analysis first
      const cachedResponse = await fetch(`/api/activities/${activity.id}/analyze`);
      const cachedData = await cachedResponse.json();

      if (cachedData.exists) {
        setAiAnalysis(cachedData.analysis);
        setLoading(false);
      } else {
        // Generate new analysis
        await generateAnalysis();
      }
    } catch (err) {
      setError('Failed to load analysis');
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    try {
      setRegenerating(true);
      const response = await fetch(`/api/activities/${activity.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: regenerating })
      });

      const data = await response.json();

      if (data.success) {
        setAiAnalysis(data.analysis);
      } else {
        setError('Failed to generate analysis');
      }
    } catch (err) {
      setError('Failed to generate analysis');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await generateAnalysis();
  };

  // Fallback to simple analysis if AI fails
  const getPaceAnalysis = (): string => {
    if (!activity.average_speed) return 'No pace data available.';

    const pacePerKm = 1000 / activity.average_speed / 60; // minutes per km
    if (pacePerKm < 4) return 'Excellent pace! You\'re running very fast.';
    if (pacePerKm < 5) return 'Great pace! You maintained a good speed throughout.';
    if (pacePerKm < 6) return 'Solid pace for a steady effort.';
    return 'Comfortable pace for endurance building.';
  };

  const getHeartRateAnalysis = (): string => {
    if (!activity.average_heartrate) return 'No heart rate data available.';

    const avgHR = activity.average_heartrate;
    if (avgHR > 180) return 'High intensity effort with elevated heart rate.';
    if (avgHR > 160) return 'Good threshold effort in the tempo zone.';
    if (avgHR > 140) return 'Steady aerobic effort.';
    return 'Recovery or easy pace effort.';
  };

  const getConsistencyAnalysis = (): string => {
    // Simple consistency check based on splits
    if (!activity.splits_metric || activity.splits_metric.length < 2) {
      return 'Not enough split data for consistency analysis.';
    }

    const paces = activity.splits_metric
      .map((split: any) => split.average_speed)
      .filter((speed: number) => speed > 0);

    if (paces.length < 2) return 'Limited split data available.';

    const avgPace = paces.reduce((a: number, b: number) => a + b, 0) / paces.length;
    const variance = paces.reduce((acc: number, pace: number) =>
      acc + Math.pow(pace - avgPace, 2), 0) / paces.length;
    const stdDev = Math.sqrt(variance);

    const cv = stdDev / avgPace; // coefficient of variation

    if (cv < 0.05) return 'Excellent pace consistency throughout the activity!';
    if (cv < 0.1) return 'Good pace consistency with minor variations.';
    if (cv < 0.15) return 'Moderate pace consistency.';
    return 'Pace varied significantly throughout the activity.';
  };

  const getOverallAnalysis = (): string => {
    const analyses = [getPaceAnalysis(), getHeartRateAnalysis(), getConsistencyAnalysis()];
    return analyses.filter(a => !a.includes('No') && !a.includes('Not enough')).join(' ');
  };

  if (loading) {
    return (
      <div className="bg-cardrounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-600">Generating AI insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
          <button
            onClick={loadAnalysis}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <p className="text-red-600 text-sm mt-2">Falling back to basic analysis...</p>
        </div>

        {/* Fallback to simple analysis */}
        <div className="space-y-4 mt-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3">💡</div>
              <div>
                <div className="font-medium text-blue-900 mb-1">Performance Summary</div>
                <div className="text-blue-800 text-sm">{getOverallAnalysis()}</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-start">
                <div className="text-green-600 mr-3">🏃</div>
                <div>
                  <div className="font-medium text-green-900 mb-1">Pace Analysis</div>
                  <div className="text-green-800 text-sm">{getPaceAnalysis()}</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-start">
                <div className="text-red-600 mr-3">❤️</div>
                <div>
                  <div className="font-medium text-red-900 mb-1">Heart Rate</div>
                  <div className="text-red-800 text-sm">{getHeartRateAnalysis()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-purple-600 mr-3">📊</div>
              <div>
                <div className="font-medium text-purple-900 mb-1">Consistency</div>
                <div className="text-purple-800 text-sm">{getConsistencyAnalysis()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <div className="text-blue-600 mr-3">💡</div>
            <div>
              <div className="font-medium text-blue-900 mb-1">Performance Summary</div>
              <div className="text-blue-800 text-sm whitespace-pre-wrap">{aiAnalysis?.performance_summary || 'Analysis not available'}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-green-600 mr-3">🏃</div>
              <div>
                <div className="font-medium text-green-900 mb-1">Pace Analysis</div>
                <div className="text-green-800 text-sm whitespace-pre-wrap">{aiAnalysis?.pace_analysis || 'Analysis not available'}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-red-600 mr-3">❤️</div>
              <div>
                <div className="font-medium text-red-900 mb-1">Heart Rate Analysis</div>
                <div className="text-red-800 text-sm whitespace-pre-wrap">{aiAnalysis?.heart_rate || 'Analysis not available'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-start">
            <div className="text-purple-600 mr-3">📊</div>
            <div>
              <div className="font-medium text-purple-900 mb-1">Consistency Analysis</div>
              <div className="text-purple-800 text-sm whitespace-pre-wrap">{aiAnalysis?.consistency || 'Analysis not available'}</div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Analysis generated by AI • Powered by GPT-4o
      </p>
    </div>
  );
}
