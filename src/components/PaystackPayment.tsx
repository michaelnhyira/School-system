import React, { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';

interface PaystackPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  points: number;
  onSuccess: (reference: string) => void;
}

const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  isOpen,
  onClose,
  amount,
  points,
  onSuccess: _onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paystackError, setPaystackError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (amount <= 0) {
      setPaystackError('Invalid payment amount.');
      return;
    }

    try {
      console.log('Initializing payment via Cloud Function...');
      setIsProcessing(true);
      setPaystackError(null);

      const reference = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Call our Cloud Function to initialize payment
      const response = await fetch('https://us-central1-school-management-e6e17.cloudfunctions.net/initializePayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'michaelnhyira77@gmail.com',
          amount: amount,
          reference: reference,
          currency: 'GHS'
        })
      });

      const data = await response.json();
      console.log('Cloud Function Response:', data);

      if (data.success && data.data.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error(data.message || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed. Please try again.';
      setPaystackError(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Purchase SMS Points</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              {points} SMS Points
            </h4>
            <p className="text-gray-600">
              Total Amount: <span className="font-semibold text-lg">₵{amount.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Rate: ₵0.50 per SMS point
            </p>
          </div>

          <div className="space-y-4">
            {paystackError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Payment Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{paystackError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Secure Payment
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Your payment is processed securely by Paystack. You will be redirected to complete the payment.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Pay with Paystack'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaystackPayment;
