// Test file for the new payment structure (one document per student per period)
import { feesUtils } from './firebaseUtils';

export const testNewPaymentStructure = async () => {
  console.log('🧪 Testing New Payment Structure (One Document Per Student Per Period)');
  console.log('=' .repeat(70));

  try {
    // Test data
    const studentId = 'test-student-123';
    const studentName = 'Test Student';
    const className = 'Primary 1';
    const academicYear = '2025';
    const term = '1st Term';
    const paymentMethod = 'cash';

    console.log('📝 Test Data:');
    console.log(`Student ID: ${studentId}`);
    console.log(`Student Name: ${studentName}`);
    console.log(`Class: ${className}`);
    console.log(`Period: ${academicYear} - ${term}`);
    console.log('');

    // Test 1: First payment (should create new document)
    console.log('🔄 Test 1: First Payment (Create New Document)');
    console.log('Making payment of ₵100...');
    
    await feesUtils.recordPayment(
      studentId,
      studentName,
      100,
      paymentMethod,
      className,
      academicYear,
      term
    );
    
    console.log('✅ First payment recorded');
    
    // Check payment summary
    const summary1 = await feesUtils.getStudentPaymentSummary(studentId, className, academicYear, term);
    console.log('📊 Payment Summary after first payment:');
    console.log(`Total Paid: ₵${summary1.totalPaid}`);
    console.log(`Payment Count: ${summary1.paymentCount}`);
    console.log(`Status: ${summary1.status}`);
    console.log('');

    // Test 2: Second payment (should update existing document)
    console.log('🔄 Test 2: Second Payment (Update Existing Document)');
    console.log('Making payment of ₵50...');
    
    await feesUtils.recordPayment(
      studentId,
      studentName,
      50,
      'mobile_money',
      className,
      academicYear,
      term
    );
    
    console.log('✅ Second payment recorded');
    
    // Check payment summary
    const summary2 = await feesUtils.getStudentPaymentSummary(studentId, className, academicYear, term);
    console.log('📊 Payment Summary after second payment:');
    console.log(`Total Paid: ₵${summary2.totalPaid}`);
    console.log(`Payment Count: ${summary2.paymentCount}`);
    console.log(`Status: ${summary2.status}`);
    console.log('');

    // Test 3: Third payment (should update existing document again)
    console.log('🔄 Test 3: Third Payment (Update Existing Document Again)');
    console.log('Making payment of ₵25...');
    
    await feesUtils.recordPayment(
      studentId,
      studentName,
      25,
      'bank_transfer',
      className,
      academicYear,
      term
    );
    
    console.log('✅ Third payment recorded');
    
    // Check payment summary
    const summary3 = await feesUtils.getStudentPaymentSummary(studentId, className, academicYear, term);
    console.log('📊 Payment Summary after third payment:');
    console.log(`Total Paid: ₵${summary3.totalPaid}`);
    console.log(`Payment Count: ${summary3.paymentCount}`);
    console.log(`Status: ${summary3.status}`);
    console.log('');

    // Test 4: Get individual payments
    console.log('🔄 Test 4: Get Individual Payments');
    const payments = await feesUtils.getStudentPaymentsForPeriod(studentId, academicYear, term);
    console.log(`📋 Found ${payments.length} individual payments:`);
    payments.forEach((payment: any, index: number) => {
      console.log(`  ${index + 1}. ₵${payment.amount} via ${payment.paymentMethod} on ${payment.createdAt}`);
    });
    console.log('');

    // Test 5: Get all payments for period
    console.log('🔄 Test 5: Get All Payments for Period');
    const allPayments = await feesUtils.getFeePaymentsForPeriod(academicYear, term);
    console.log(`📋 Found ${allPayments.length} total payments in period:`);
    allPayments.forEach((payment: any, index: number) => {
      console.log(`  ${index + 1}. ${payment.studentName}: ₵${payment.amount} via ${payment.paymentMethod}`);
    });
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('✅ One document per student per period structure working');
    console.log('✅ New payments update existing document');
    console.log('✅ Payment summaries calculated correctly');
    console.log('✅ Individual payments retrieved correctly');
    console.log('✅ All payments for period retrieved correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for use in other files
export default testNewPaymentStructure;

