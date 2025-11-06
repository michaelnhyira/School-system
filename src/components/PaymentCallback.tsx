import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useSMSPoints } from '../contexts/SMSPointsContext';

interface PaymentCallbackProps {
  reference: string;
  onComplete: (success: boolean) => void;
}

const PaymentCallback: React.FC<PaymentCallbackProps> = ({ reference, onComplete }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying payment...');
  const { purchasePoints } = useSMSPoints();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log('Verifying payment with reference:', reference);
        
        const response = await fetch(
          `https://us-central1-school-management-e6e17.cloudfunctions.net/verifyPayment?reference=${reference}`
        );
        
        const data = await response.json();
        console.log('Payment verification response:', data);
        
        if (data.success && data.data.status === 'success') {
          // Payment successful - add points to account
          const points = Math.round(data.data.amount / 100); // Convert pesewas to points (1 point = 1 pesewa)
          const success = await purchasePoints(points, data.data.amount / 100, reference, 'admin');
          
          if (success) {
            setStatus('success');
            setMessage(`Payment successful! ${points} SMS points added to your account.`);
          } else {
            setStatus('failed');
            setMessage('Payment verified but failed to add points. Please contact support.');
          }
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment verification failed.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage('Failed to verify payment. Please contact support.');
      } finally {
        setTimeout(() => {
          onComplete(status === 'success');
        }, 3000);
      }
    };

    if (reference) {
      verifyPayment();
    }
  }, [reference, purchasePoints, onComplete, status]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Payment</h3>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Successful!</h3>
              <p className="text-green-700">{message}</p>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Payment Failed</h3>
              <p className="text-red-700">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;
