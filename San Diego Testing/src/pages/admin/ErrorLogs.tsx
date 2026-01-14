import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ServerError {
  id: string;
  url_path: string;
  error_type: string;
  status_code: number | null;
  error_message: string | null;
  stack_trace: string | null;
  user_agent: string | null;
  ip_address: string | null;
  referrer: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface HealthStatus {
  database: boolean;
  storage: boolean;
  timestamp: string;
}

const ERROR_TYPES = ['all', '5xx', 'react_error', 'edge_function', 'middleware', 'unhandled_error', 'unhandled_rejection'];

export default function ErrorLogs() {
  const [errors, setErrors] = useState<ServerError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedError, setSelectedError] = useState<ServerError | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('server_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedFilter !== 'all') {
        if (selectedFilter === '5xx') {
          query = query.gte('status_code', 500).lt('status_code', 600);
        } else {
          query = query.eq('error_type', selectedFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setErrors(data || []);
    } catch (err) {
      console.error('Failed to fetch errors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`
      );
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      console.error('Failed to fetch health:', err);
      setHealthStatus(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [selectedFilter]);

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
        <button
          onClick={() => { fetchErrors(); fetchHealth(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Health Status */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">System Health</h2>
        {healthLoading ? (
          <p className="text-gray-500">Checking health...</p>
        ) : healthStatus ? (
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${healthStatus.database ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Database: {healthStatus.database ? 'Healthy' : 'Unhealthy'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${healthStatus.storage ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Storage: {healthStatus.storage ? 'Healthy' : 'Unhealthy'}</span>
            </div>
            <span className="text-gray-500 text-sm">
              Last checked: {formatDate(healthStatus.timestamp)}
            </span>
          </div>
        ) : (
          <p className="text-red-500">Failed to check health</p>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ERROR_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedFilter(type)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedFilter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'All' : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Error List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading errors...</div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No errors found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">URL</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Message</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {errors.map((error) => (
                <tr key={error.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(error.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {error.url_path}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      error.error_type === 'react_error' ? 'bg-purple-100 text-purple-800' :
                      error.error_type === '5xx' || (error.status_code && error.status_code >= 500) ? 'bg-red-100 text-red-800' :
                      error.error_type === 'unhandled_rejection' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {error.error_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                    {error.error_message || 'No message'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedError(error)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Error Details</h2>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamp</label>
                  <p className="text-gray-900">{formatDate(selectedError.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{selectedError.error_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">URL Path</label>
                  <p className="text-gray-900">{selectedError.url_path}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status Code</label>
                  <p className="text-gray-900">{selectedError.status_code || 'N/A'}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Error Message</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded mt-1">
                  {selectedError.error_message || 'No message'}
                </p>
              </div>

              {selectedError.stack_trace && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Stack Trace</label>
                  <pre className="text-sm text-gray-800 bg-gray-900 text-gray-100 p-4 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <p className="text-gray-900 text-sm break-all">{selectedError.user_agent || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">IP Address</label>
                  <p className="text-gray-900">{selectedError.ip_address || 'N/A'}</p>
                </div>
              </div>

              {selectedError.metadata && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Metadata</label>
                  <pre className="text-sm bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
