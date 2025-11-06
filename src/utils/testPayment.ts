import { feesUtils } from './firebaseUtils';

/**
 * Simple test function to verify payment system works correctly
 */
export async function testPaymentSystem() {
  console.log('🧪 Testing Payment System...\n');
  
  try {
    // Test 1: Record a payment
    console.log('Test 1: Recording payment...');
    const paymentId = await feesUtils.recordPayment(
      'test_student_123',
      'Test Student',
      100,
      'cash',
      'Test Class',
      '2025',
      '1st Term'
    );
    console.log('✅ Payment recorded with ID:', paymentId);
    
    // Test 2: Wait a moment
    console.log('\nTest 2: Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 3: Get payment summary
    console.log('Test 3: Getting payment summary...');
    const summary = await feesUtils.getStudentPaymentSummary(
      'test_student_123',
      'Test Class',
      '2025',
      '1st Term'
    );
    console.log('✅ Payment summary:', summary);
    
    // Test 4: Verify status calculation
    console.log('\nTest 4: Verifying status calculation...');
    if (summary.totalPaid === 100) {
      console.log('✅ Total paid is correct:', summary.totalPaid);
    } else {
      console.log('❌ Total paid is wrong:', summary.totalPaid);
    }
    
    if (summary.status === 'Partial Payment' || summary.status === 'Full Payment') {
      console.log('✅ Status is correct:', summary.status);
    } else {
      console.log('❌ Status is wrong:', summary.status);
    }
    
    console.log('\n🎉 Payment system test completed!');
    return { success: true, paymentId, summary };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error };
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).testPaymentSystem = testPaymentSystem;
  console.log('💡 Test function loaded. Run testPaymentSystem() to test.');
}

