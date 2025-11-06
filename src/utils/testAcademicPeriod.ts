import { feesUtils } from './firebaseUtils';

/**
 * Test function to verify academic period management works correctly
 */
export async function testAcademicPeriodSystem() {
  console.log('🧪 Testing Academic Period System...\n');
  
  try {
    // Test 1: Set an active period
    console.log('Test 1: Setting active academic period...');
    await feesUtils.setActiveAcademicPeriod('2025', '1st Term');
    console.log('✅ Active period set to 2025 - 1st Term');
    
    // Test 2: Get system active period
    console.log('\nTest 2: Getting system active period...');
    const systemActive = await feesUtils.getSystemActivePeriod();
    console.log('✅ System active period:', systemActive);
    
    // Test 3: Verify it persists
    console.log('\nTest 3: Verifying persistence...');
    const systemActive2 = await feesUtils.getSystemActivePeriod();
    if (systemActive2?.academicYear === '2025' && systemActive2?.term === '1st Term') {
      console.log('✅ Period persists correctly');
    } else {
      console.log('❌ Period does not persist');
    }
    
    // Test 4: Change to different period
    console.log('\nTest 4: Changing to different period...');
    await feesUtils.setActiveAcademicPeriod('2025', '2nd Term');
    const newActive = await feesUtils.getSystemActivePeriod();
    if (newActive?.academicYear === '2025' && newActive?.term === '2nd Term') {
      console.log('✅ Period changed successfully');
    } else {
      console.log('❌ Period change failed');
    }
    
    console.log('\n🎉 Academic period system test completed!');
    return { success: true, systemActive, newActive };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error };
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).testAcademicPeriodSystem = testAcademicPeriodSystem;
  console.log('💡 Test function loaded. Run testAcademicPeriodSystem() to test.');
}

