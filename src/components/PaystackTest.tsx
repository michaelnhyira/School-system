import React, { useState } from 'react';

declare global {
  interface Window {
    PaystackPop?: any;
  }
}
import PaystackPayment from './PaystackPayment';

const PaystackTest: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleTestPayment = () => {
    addResult('Starting Paystack test...');
    addResult(`Testing with: 10 points = ₵5.00 (${5 * 100} pesewas)`);
    addResult(`Public Key: ${import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? 'Set' : 'Not set'}`);
    addResult(`Email: ${import.meta.env.VITE_PAYSTACK_EMAIL || 'admin@school.com'}`);
    setShowModal(true);
  };

  const handlePaymentSuccess = (reference: string) => {
    addResult(`Payment successful! Reference: ${reference}`);
    setShowModal(false);
  };

  const handlePaymentClose = () => {
    addResult('Payment modal closed');
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Paystack Integration Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleTestPayment}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Paystack Payment (10 points - ₵5.00)
        </button>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <div className="space-y-1 text-sm">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet...</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="font-mono text-xs">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Configuration Check:</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>Public Key: {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'Not set (using fallback)'}</p>
            <p>Email: {import.meta.env.VITE_PAYSTACK_EMAIL || 'admin@school.com (fallback)'}</p>
            <p>Paystack Script: {typeof window !== 'undefined' && window.PaystackPop ? '✅ Loaded' : '❌ Not loaded'}</p>
          </div>
        </div>
      </div>

      <PaystackPayment
        isOpen={showModal}
        onClose={handlePaymentClose}
        amount={5.00}
        points={10}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default PaystackTest;
