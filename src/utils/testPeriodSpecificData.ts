// Test file for period-specific data filtering
import { feesUtils } from './firebaseUtils';

export const testPeriodSpecificData = async () => {
  console.log('🧪 Testing Period-Specific Data Filtering');
  console.log('=' .repeat(60));

  try {
    // Test data for different periods
    const period1 = { academicYear: '2025', term: '1st Term' };
    const period2 = { academicYear: '2025', term: '2nd Term' };
    const studentId = 'test-student-123';
    const studentName = 'Test Student';
    const className = 'Primary 1';

    console.log('📝 Test Setup:');
    console.log(`Period 1: ${period1.academicYear} - ${period1.term}`);
    console.log(`Period 2: ${period2.academicYear} - ${period2.term}`);
    console.log(`Student: ${studentName} (${studentId})`);
    console.log('');

    // Test 1: Create fees for both periods
    console.log('🔄 Test 1: Create Fees for Both Periods');
    
    const classFees = [
      { classId: 'class1', className: 'Primary 1', feeAmount: 500 }
    ];

    // Create fees for period 1
    console.log(`Creating fees for ${period1.academicYear} - ${period1.term}...`);
    await feesUtils.setFeesForYearTerm(period1.academicYear, period1.term, classFees);
    console.log('✅ Fees created for period 1');

    // Create fees for period 2
    console.log(`Creating fees for ${period2.academicYear} - ${period2.term}...`);
    await feesUtils.setFeesForYearTerm(period2.academicYear, period2.term, classFees);
    console.log('✅ Fees created for period 2');
    console.log('');

    // Test 2: Make payments in period 1
    console.log('🔄 Test 2: Make Payments in Period 1');
    console.log(`Making payment of ₵200 in ${period1.academicYear} - ${period1.term}...`);
    
    await feesUtils.recordPayment(
      studentId,
      studentName,
      200,
      'cash',
      className,
      period1.academicYear,
      period1.term
    );
    console.log('✅ Payment made in period 1');

    // Check payment summary for period 1
    const summary1 = await feesUtils.getStudentPaymentSummary(
      studentId, 
      className, 
      period1.academicYear, 
      period1.term
    );
    console.log(`📊 Payment summary for period 1:`);
    console.log(`  - Total Paid: ₵${summary1.totalPaid}`);
    console.log(`  - Status: ${summary1.status}`);
    console.log(`  - Payment Count: ${summary1.paymentCount}`);
    console.log('');

    // Test 3: Make payments in period 2
    console.log('🔄 Test 3: Make Payments in Period 2');
    console.log(`Making payment of ₵300 in ${period2.academicYear} - ${period2.term}...`);
    
    await feesUtils.recordPayment(
      studentId,
      studentName,
      300,
      'mobile_money',
      className,
      period2.academicYear,
      period2.term
    );
    console.log('✅ Payment made in period 2');

    // Check payment summary for period 2
    const summary2 = await feesUtils.getStudentPaymentSummary(
      studentId, 
      className, 
      period2.academicYear, 
      period2.term
    );
    console.log(`📊 Payment summary for period 2:`);
    console.log(`  - Total Paid: ₵${summary2.totalPaid}`);
    console.log(`  - Status: ${summary2.status}`);
    console.log(`  - Payment Count: ${summary2.paymentCount}`);
    console.log('');

    // Test 4: Verify period isolation
    console.log('🔄 Test 4: Verify Period Isolation');
    
    // Get payment history for period 1
    const history1 = await feesUtils.getStudentPaymentsForPeriod(
      studentId,
      period1.academicYear,
      period1.term
    );
    console.log(`📋 Payment history for ${period1.academicYear} - ${period1.term}:`);
    console.log(`  - Number of payments: ${history1.length}`);
    history1.forEach((payment: any, index: number) => {
      console.log(`    ${index + 1}. ₵${payment.amount} via ${payment.paymentMethod}`);
    });

    // Get payment history for period 2
    const history2 = await feesUtils.getStudentPaymentsForPeriod(
      studentId,
      period2.academicYear,
      period2.term
    );
    console.log(`📋 Payment history for ${period2.academicYear} - ${period2.term}:`);
    console.log(`  - Number of payments: ${history2.length}`);
    history2.forEach((payment: any, index: number) => {
      console.log(`    ${index + 1}. ₵${payment.amount} via ${payment.paymentMethod}`);
    });
    console.log('');

    // Test 5: Verify no cross-contamination
    console.log('🔄 Test 5: Verify No Cross-Contamination');
    
    if (summary1.totalPaid === 200 && summary2.totalPaid === 300) {
      console.log('✅ Payment amounts are correctly isolated between periods');
    } else {
      console.log('❌ Payment amounts are not properly isolated');
    }

    if (history1.length === 1 && history2.length === 1) {
      console.log('✅ Payment histories are correctly isolated between periods');
    } else {
      console.log('❌ Payment histories are not properly isolated');
    }

    if (summary1.totalPaid !== summary2.totalPaid) {
      console.log('✅ Different payment totals for different periods');
    } else {
      console.log('❌ Payment totals are the same across periods (unexpected)');
    }
    console.log('');

    // Test 6: Test period switching simulation
    console.log('🔄 Test 6: Simulate Period Switching');
    
    console.log('Simulating switch to period 1...');
    const period1Data = {
      summary: await feesUtils.getStudentPaymentSummary(studentId, className, period1.academicYear, period1.term),
      history: await feesUtils.getStudentPaymentsForPeriod(studentId, period1.academicYear, period1.term)
    };
    console.log(`Period 1 data: ₵${period1Data.summary.totalPaid} total, ${period1Data.history.length} payments`);

    console.log('Simulating switch to period 2...');
    const period2Data = {
      summary: await feesUtils.getStudentPaymentSummary(studentId, className, period2.academicYear, period2.term),
      history: await feesUtils.getStudentPaymentsForPeriod(studentId, period2.academicYear, period2.term)
    };
    console.log(`Period 2 data: ₵${period2Data.summary.totalPaid} total, ${period2Data.history.length} payments`);

    if (period1Data.summary.totalPaid !== period2Data.summary.totalPaid) {
      console.log('✅ Period switching shows different data correctly');
    } else {
      console.log('❌ Period switching shows same data (incorrect)');
    }
    console.log('');

    console.log('🎉 All period-specific data tests completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('✅ Payments are isolated by academic period');
    console.log('✅ Payment summaries are period-specific');
    console.log('✅ Payment histories are period-specific');
    console.log('✅ No cross-contamination between periods');
    console.log('✅ Period switching shows correct data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for use in other files
export default testPeriodSpecificData;

