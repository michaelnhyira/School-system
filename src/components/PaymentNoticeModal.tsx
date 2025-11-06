import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { usePaymentLock } from '../contexts/PaymentLockContext';

const PaymentNoticeModal: React.FC = () => {
  const { lockData, isNoticeActive, isLockActive, shouldShowModal, canDismiss, getRemainingDays, dismissNotice, hasUserDismissed, loading } = usePaymentLock();
  const [isDismissing, setIsDismissing] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Update remaining days every minute
  useEffect(() => {
    if (!shouldShowModal()) {
      setShowModal(false);
      return;
    }

    const updateRemainingDays = () => {
      const days = getRemainingDays();
      setRemainingDays(days);
      
      // Show modal if:
      // 1. Lock is active (always show, cannot dismiss) OR
      // 2. Notice is active and user hasn't dismissed
      const dismissed = hasUserDismissed();
      const lockActive = isLockActive();
      const noticeActive = isNoticeActive();
      
      if (lockActive && shouldShowModal()) {
        // Lock is active - always show, cannot dismiss
        setShowModal(true);
      } else if (noticeActive && !dismissed && shouldShowModal()) {
        // Notice is active and not dismissed - show dismissible modal
        setShowModal(true);
      } else {
        // Notice dismissed or nothing active - don't show
        setShowModal(false);
      }
    };

    updateRemainingDays();
    const interval = setInterval(updateRemainingDays, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [shouldShowModal, isLockActive, isNoticeActive, getRemainingDays, hasUserDismissed]);

  // Don't show if loading or shouldn't show modal
  if (loading || !shouldShowModal() || !showModal) {
    return null;
  }

  const canDismissNotice = canDismiss();
  const isLocked = isLockActive();
  const isNotice = isNoticeActive();
  const dismissed = hasUserDismissed();

  const handleDismiss = async () => {
    if (!canDismissNotice) return;

    setIsDismissing(true);
    try {
      await dismissNotice();
      setShowModal(false);
    } catch (error) {
      console.error('Error dismissing notice:', error);
      alert('Failed to dismiss notice. Please try again.');
    } finally {
      setIsDismissing(false);
    }
  };

  const handleContinue = () => {
    // Allow continue if user has dismissed (regardless of remaining days)
    if (dismissed) {
      setShowModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 relative">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-900">
                  {isLocked ? 'Payment Lock Active' : 'Outstanding Payment Notice'}
                </h2>
                <p className="text-sm text-red-700 mt-1">
                  {isLocked ? 'Access Restricted' : 'Action Required'}
                </p>
              </div>
            </div>
            {canDismissNotice && !isLocked && (
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Dismiss notice"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Countdown Timer - Only show for notice */}
          {isNotice && remainingDays > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    You have <span className="text-xl font-bold text-yellow-700">{remainingDays}</span> day{remainingDays !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please make payment before the deadline to continue using the system.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lock Active Warning */}
          {isLocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    System Access Locked
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Access to the system has been restricted due to non-payment. Please contact the administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Message */}
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              There is an outstanding payment for your school management system subscription. 
              Please make the payment as soon as possible to avoid service interruption.
            </p>

            {isLocked && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">
                  ⚠️ Access to the system has been restricted due to non-payment. 
                  This notice cannot be dismissed. Please contact the administrator to resolve this issue.
                </p>
              </div>
            )}

            {isNotice && !dismissed && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  {remainingDays > 0 
                    ? `You can dismiss this notice, but please ensure payment is made within the next ${remainingDays} day${remainingDays !== 1 ? 's' : ''}.`
                    : 'You can dismiss this notice to continue using the system, but please contact the administrator to resolve the payment issue.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {isLocked ? (
              <span className="text-red-600 font-medium">Access Restricted - Cannot Dismiss</span>
            ) : (
              <span>Please contact administrator for payment details</span>
            )}
          </div>
          <div className="flex gap-3">
            {canDismissNotice && !isLocked && (
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDismissing ? 'Dismissing...' : 'Dismiss'}
              </button>
            )}
            {dismissed && !isLocked && (
              <button
                onClick={handleContinue}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to App
              </button>
            )}
            {isLocked && (
              <p className="text-sm text-red-600 font-medium">
                Please contact administrator to resolve payment issue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentNoticeModal;

