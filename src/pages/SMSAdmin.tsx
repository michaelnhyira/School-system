import React, { useState } from 'react';
import { useSMSPricing } from '../contexts/SMSPricingContext';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

const SMSAdmin: React.FC = () => {
  const { pricing, loading, error, updatePricing } = useSMSPricing();
  const { currentUser } = useAuth();
  const [newPrice, setNewPrice] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleUpdatePricing = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      setUpdateStatus('error');
      return;
    }

    setIsUpdating(true);
    setUpdateStatus('idle');

    try {
      const success = await updatePricing(price, currentUser?.email || 'admin');
      if (success) {
        setUpdateStatus('success');
        setNewPrice('');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      } else {
        setUpdateStatus('error');
      }
    } catch (err) {
      console.error('Error updating pricing:', err);
      setUpdateStatus('error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMS pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">SMS Pricing Administration</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Manage SMS point pricing for your school management system.
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Current Pricing */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Pricing</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per SMS Point
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      ₵{pricing?.pricePerPoint || 0}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <div className="text-lg text-gray-900">
                      {pricing?.currency || 'GHS'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated
                    </label>
                    <div className="text-sm text-gray-600">
                      {pricing?.lastUpdated ? 
                        new Date(pricing.lastUpdated.seconds * 1000).toLocaleDateString() : 
                        'Never'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Pricing */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Pricing</h2>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Price per SMS Point (GHS)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="Enter new price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the price in Ghana Cedis (GHS)
                    </p>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleUpdatePricing}
                      disabled={!newPrice || isUpdating}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Pricing
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {updateStatus === 'success' && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <p className="text-green-800">Pricing updated successfully!</p>
                    </div>
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-red-800">Failed to update pricing. Please try again.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Examples */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Examples</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[50, 100, 200, 500].map((points) => (
                    <div key={points} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{points}</div>
                        <div className="text-sm text-gray-600 mb-2">SMS Points</div>
                        <div className="text-lg font-semibold text-purple-600">
                          ₵{pricing ? (points * pricing.pricePerPoint).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notes</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Price changes will affect all new SMS point purchases immediately</li>
                <li>• Existing SMS points are not affected by price changes</li>
                <li>• Consider notifying users before making significant price changes</li>
                <li>• All prices are in Ghana Cedis (GHS)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSAdmin;

