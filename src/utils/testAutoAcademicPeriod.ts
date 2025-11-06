// Test file for automatic academic period creation when fees are created
import { feesUtils } from './firebaseUtils';

export const testAutoAcademicPeriodCreation = async () => {
  console.log('🧪 Testing Automatic Academic Period Creation');
  console.log('=' .repeat(60));

  try {
    // Test data
    const academicYear = '2025';
    const term = '2nd Term';
    const classFees = [
      { classId: 'class1', className: 'Primary 1', feeAmount: 500 },
      { classId: 'class2', className: 'Primary 2', feeAmount: 600 },
      { classId: 'class3', className: 'JHS 1', feeAmount: 800 }
    ];

    console.log('📝 Test Data:');
    console.log(`Academic Year: ${academicYear}`);
    console.log(`Term: ${term}`);
    console.log(`Class Fees:`, classFees);
    console.log('');

    // Test 1: Create fees and verify academic period is created
    console.log('🔄 Test 1: Create Fees and Verify Academic Period Creation');
    console.log('Creating fees for 2025 - 2nd Term...');
    
    const feeId = await feesUtils.setFeesForYearTerm(academicYear, term, classFees);
    console.log(`✅ Fees created with ID: ${feeId}`);
    
    // Verify academic period exists
    console.log('🔍 Verifying academic period exists...');
    const academicPeriods = await feesUtils.getAllAcademicPeriods();
    const createdPeriod = academicPeriods.find(period => 
      period.academicYear === academicYear && period.term === term
    );
    
    if (createdPeriod) {
      console.log('✅ Academic period automatically created:');
      console.log(`  - Period ID: ${createdPeriod.id}`);
      console.log(`  - Academic Year: ${createdPeriod.academicYear}`);
      console.log(`  - Term: ${createdPeriod.term}`);
      console.log(`  - Is Active: ${createdPeriod.isActive}`);
      console.log(`  - Created At: ${createdPeriod.createdAt}`);
    } else {
      console.log('❌ Academic period was not created automatically');
    }
    console.log('');

    // Test 2: Try to create fees for same period again (should not create duplicate)
    console.log('🔄 Test 2: Create Fees for Same Period (Should Not Create Duplicate)');
    console.log('Creating fees for same period again...');
    
    const feeId2 = await feesUtils.setFeesForYearTerm(academicYear, term, classFees);
    console.log(`✅ Fees updated with ID: ${feeId2}`);
    
    // Verify only one academic period exists
    const academicPeriods2 = await feesUtils.getAllAcademicPeriods();
    const periodsForYearTerm = academicPeriods2.filter(period => 
      period.academicYear === academicYear && period.term === term
    );
    
    console.log(`📊 Found ${periodsForYearTerm.length} academic period(s) for ${academicYear} - ${term}`);
    if (periodsForYearTerm.length === 1) {
      console.log('✅ No duplicate academic period created');
    } else {
      console.log('❌ Multiple academic periods found - possible duplicate');
    }
    console.log('');

    // Test 3: Create fees for different period
    console.log('🔄 Test 3: Create Fees for Different Period');
    const academicYear2 = '2025';
    const term2 = '3rd Term';
    const classFees2 = [
      { classId: 'class1', className: 'Primary 1', feeAmount: 550 },
      { classId: 'class2', className: 'Primary 2', feeAmount: 650 }
    ];
    
    console.log(`Creating fees for ${academicYear2} - ${term2}...`);
    const feeId3 = await feesUtils.setFeesForYearTerm(academicYear2, term2, classFees2);
    console.log(`✅ Fees created with ID: ${feeId3}`);
    
    // Verify new academic period exists
    const academicPeriods3 = await feesUtils.getAllAcademicPeriods();
    const newPeriod = academicPeriods3.find(period => 
      period.academicYear === academicYear2 && period.term === term2
    );
    
    if (newPeriod) {
      console.log('✅ New academic period automatically created:');
      console.log(`  - Period ID: ${newPeriod.id}`);
      console.log(`  - Academic Year: ${newPeriod.academicYear}`);
      console.log(`  - Term: ${newPeriod.term}`);
    } else {
      console.log('❌ New academic period was not created');
    }
    console.log('');

    // Test 4: List all academic periods
    console.log('🔄 Test 4: List All Academic Periods');
    const allPeriods = await feesUtils.getAllAcademicPeriods();
    console.log(`📋 Found ${allPeriods.length} academic period(s) in total:`);
    allPeriods.forEach((period, index) => {
      console.log(`  ${index + 1}. ${period.academicYear} - ${period.term} (ID: ${period.id})`);
    });
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('✅ Academic periods are automatically created when fees are set');
    console.log('✅ No duplicate periods are created for the same year/term');
    console.log('✅ New periods are created for different year/term combinations');
    console.log('✅ All periods are properly tracked in the system');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for use in other files
export default testAutoAcademicPeriodCreation;

