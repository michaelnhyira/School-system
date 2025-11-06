import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home,
  Users, 
  GraduationCap, 
  BookOpen, 
  Menu,
  X,
  MessageSquare,
  DollarSign,
  Settings,
  Users2,
  LogOut,
  User,
  Calendar,
  Award,
  CheckSquare,
  Plus,
  ArrowRightCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAcademicPeriod } from '../contexts/AcademicPeriodContext'
import { useGradesAcademicPeriod } from '../contexts/GradesAcademicPeriodContext'
import { feesUtils, gradesUtils } from '../utils/firebaseUtils'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import AcademicPeriodSelector from './AcademicPeriodSelector'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [teacherPeriodModalOpen, setTeacherPeriodModalOpen] = useState(false)
  const [editPeriodModalOpen, setEditPeriodModalOpen] = useState(false)
  const [createPeriodModalOpen, setCreatePeriodModalOpen] = useState(false)
  const [selectedPeriodForEdit, setSelectedPeriodForEdit] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    isActive: false,
    description: ''
  })
  const [createPeriodForm, setCreatePeriodForm] = useState({
    academicYear: new Date().getFullYear().toString(),
    term: '1st Term'
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false)
  const location = useLocation()
  const { currentUser, logout, hasPermission, userRoleData, userRole } = useAuth()
  
  // Use different contexts based on user role
  const academicPeriodContext = useAcademicPeriod()
  const gradesAcademicPeriodContext = useGradesAcademicPeriod()
  
  // Select the appropriate context based on user role
  const isTeacher = userRole === 'teacher'
  const currentPeriod = isTeacher ? gradesAcademicPeriodContext.currentPeriod : academicPeriodContext.currentPeriod
  const allPeriods = isTeacher ? gradesAcademicPeriodContext.allPeriods : academicPeriodContext.allPeriods
  const setCurrentPeriod = isTeacher ? gradesAcademicPeriodContext.setCurrentPeriod : academicPeriodContext.setCurrentPeriod
  const refreshPeriods = isTeacher ? gradesAcademicPeriodContext.refreshPeriods : academicPeriodContext.refreshPeriods
  const periodLoading = isTeacher ? gradesAcademicPeriodContext.loading : academicPeriodContext.loading

  console.log('Layout - userRole:', userRole, 'isTeacher:', isTeacher)
  console.log('Layout - academicPeriodContext.allPeriods:', academicPeriodContext.allPeriods)
  console.log('Layout - gradesAcademicPeriodContext.allPeriods:', gradesAcademicPeriodContext.allPeriods)
  console.log('Layout - selected allPeriods:', allPeriods)
  console.log('Layout - currentPeriod:', currentPeriod)

  // Ensure periods are loaded when user logs in
  useEffect(() => {
    if (currentUser?.uid && !periodLoading && allPeriods.length === 0) {
      console.log('User logged in but no periods loaded, forcing refresh...');
      refreshPeriods().catch(err => {
        console.error('Failed to force refresh periods:', err);
      });
    }
  }, [currentUser?.uid, periodLoading, allPeriods.length]);

  // Load user's selected period when component mounts
  useEffect(() => {
    const loadUserSelectedPeriod = async () => {
      if (currentUser?.uid && allPeriods.length > 0) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const selectedPeriod = userData.selectedAcademicPeriod;
            
            if (selectedPeriod) {
              console.log('Loading user selected period:', selectedPeriod);
              console.log('User role:', userRole);
              console.log('Is teacher:', isTeacher);
              
              // Find the period in the available periods
              const period = allPeriods.find(p => 
                p.academicYear === selectedPeriod.academicYear && 
                p.term === selectedPeriod.term
              );
              
              if (period) {
                console.log('Found matching period:', period);
                // Update the context with the user's selected period
                if (isTeacher) {
                  console.log('Setting grades academic period context');
                  gradesAcademicPeriodContext.setCurrentPeriod(selectedPeriod.academicYear, selectedPeriod.term);
                } else {
                  console.log('Setting regular academic period context');
                  academicPeriodContext.setCurrentPeriod(selectedPeriod.academicYear, selectedPeriod.term);
                }
              } else {
                console.log('No matching period found in available periods');
              }
            } else {
              console.log('No selected period found in user data');
            }
          } else {
            console.log('User document does not exist');
          }
        } catch (error) {
          console.error('Error loading user selected period:', error);
        }
      }
    };

    loadUserSelectedPeriod();
  }, [currentUser?.uid, allPeriods.length, isTeacher, userRole]);

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  const handleSelectPeriod = async (period: any) => {
    try {
      console.log('Selecting period:', period);
      console.log('Current user:', currentUser?.uid);
      console.log('Is teacher:', isTeacher);
      console.log('Context being used:', isTeacher ? 'gradesAcademicPeriodContext' : 'academicPeriodContext');
      
      // Store user's selected period in their user document
      if (currentUser?.uid) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, {
            selectedAcademicPeriod: {
              academicYear: period.academicYear,
              term: period.term,
              updatedAt: new Date().toISOString()
            }
          });
          console.log('✅ User period selection saved to Firebase:', period.academicYear, period.term);
        } catch (error) {
          console.error('❌ Failed to save period selection to Firebase:', error);
          // Try to create the user document if it doesn't exist
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || '',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              selectedAcademicPeriod: {
                academicYear: period.academicYear,
                term: period.term,
                updatedAt: new Date().toISOString()
              }
            });
            console.log('✅ User document created and period saved');
          } catch (createError) {
            console.error('❌ Failed to create user document:', createError);
          }
        }
      }
      
      console.log('Setting current period in context:', period.academicYear, period.term);
      await setCurrentPeriod(period.academicYear, period.term)
      console.log('✅ Period set successfully in context');
      
      setPeriodModalOpen(false)
      setTeacherPeriodModalOpen(false)
      console.log('✅ Modals closed');
      
      // Show success message
      alert(`✅ Academic period "${period.academicYear} - ${period.term}" selected and saved! This will be remembered for your next login.`);
    } catch (error) {
      console.error('❌ Failed to select period:', error)
      alert('❌ Failed to select period. Please try again.');
    }
  }

  const handleEditPeriod = (period: any) => {
    setSelectedPeriodForEdit(period)
    setEditFormData({
      isActive: period.isActive || false,
      description: period.description || ''
    })
    setEditPeriodModalOpen(true)
  }

  const handleSavePeriod = async () => {
    if (!selectedPeriodForEdit) return

    setIsSaving(true)
    try {
      // Update the period in Firebase using the appropriate utils
      if (isTeacher) {
        await gradesUtils.updateAcademicPeriod(
          selectedPeriodForEdit.academicYear,
          selectedPeriodForEdit.term,
          {
            isActive: editFormData.isActive,
            description: editFormData.description,
            updatedAt: new Date().toISOString()
          }
        )
      } else {
        await feesUtils.updateAcademicPeriod(
          selectedPeriodForEdit.academicYear,
          selectedPeriodForEdit.term,
          {
            isActive: editFormData.isActive,
            description: editFormData.description,
            updatedAt: new Date().toISOString()
          }
        )
      }

      // If we're setting this period as active, update the current period
      if (editFormData.isActive) {
        await setCurrentPeriod(selectedPeriodForEdit.academicYear, selectedPeriodForEdit.term)
      }

      // Close the modal
      setEditPeriodModalOpen(false)
      setSelectedPeriodForEdit(null)
      
      // Show success message
      alert('Academic period updated successfully!')
    } catch (error) {
      console.error('Error updating academic period:', error)
      alert('Failed to update academic period. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePeriod = async () => {
    if (!createPeriodForm.academicYear || !createPeriodForm.term) {
      alert('Please fill in all required fields')
      return
    }

    // Check if period already exists
    const existingPeriod = allPeriods.find(period => 
      period.academicYear === createPeriodForm.academicYear && period.term === createPeriodForm.term
    )

    if (existingPeriod) {
      alert(`Academic period "${createPeriodForm.academicYear} - ${createPeriodForm.term}" already exists.`)
      return
    }

    setIsCreatingPeriod(true)
    try {
      const { academicYear, term } = createPeriodForm
      
      // Create the appropriate period based on user role - both will sync automatically
      if (isTeacher) {
        await gradesUtils.ensureGradesAcademicPeriodExists(academicYear, term)
      } else {
        await feesUtils.ensureAcademicPeriodExists(academicYear, term)
      }
      
      // Refresh periods list to show the newly created period
      await refreshPeriods()
      
      setCreatePeriodModalOpen(false)
      setCreatePeriodForm({
        academicYear: new Date().getFullYear().toString(),
        term: '1st Term'
      })
      alert(`Academic period "${academicYear} - ${term}" created successfully! You can now select it from the period dropdown.`)
    } catch (error) {
      console.error('Error creating academic period:', error)
      alert('Failed to create academic period. Please try again.')
    } finally {
      setIsCreatingPeriod(false)
    }
  }

  // Role-based navigation
  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: Home, permission: 'canViewDashboard' },
    { name: 'Students', href: '/students', icon: Users, permission: 'canManageStudents' },
    { name: 'My Students', href: '/my-students', icon: Users, permission: 'canManageStudents', role: 'teacher' },
    { name: 'Grades', href: '/grades', icon: Award, permission: 'canManageStudents', role: 'teacher' },
    { name: 'Attendance', href: '/attendance', icon: CheckSquare, permission: 'canManageStudents', role: 'teacher' },
    { name: 'Promote', href: '/promote', icon: ArrowRightCircle, permission: 'canManageStudents', role: 'teacher' },
    { name: 'Teachers', href: '/teachers', icon: GraduationCap, permission: 'canManageTeachers' },
    { name: 'Classes', href: '/classes', icon: Users2, permission: 'canManageClasses' },
    { name: 'Promotions', href: '/promote-all', icon: ArrowRightCircle, permission: 'canManageStudents', excludeRole: 'teacher' },
    { name: 'Subjects', href: '/subjects', icon: BookOpen, permission: 'canManageSubjects' },
    { name: 'Messaging', href: '/messaging', icon: MessageSquare, permission: 'canSendMessages' },
    { name: 'Fees', href: '/fees', icon: DollarSign, permission: 'canManageFees' },
    { name: 'Functions', href: '/functions', icon: Settings, permission: 'canManageUsers' },
    { name: 'Settings', href: '/settings', icon: Settings, permission: 'canManageSettings' },
  ]

  // Filter navigation based on user permissions and role
  const navigation = allNavigation.filter(item => {
    const hasPermissionForItem = hasPermission(item.permission as any)

    // Teachers should not see Students or Classes pages in the sidebar
    if (userRole === 'teacher' && (item.href === '/students' || item.href === '/classes')) {
      return false
    }
    
    // Exclude items for specific roles
    if ((item as any).excludeRole && userRole === (item as any).excludeRole) {
      return false
    }
    
    // Accountants should not see Messaging page
    if (userRole === 'accountant' && item.href === '/messaging') {
      return false
    }
    
    // Accountants should not see Promotions page
    if (userRole === 'accountant' && item.href === '/promote-all') {
      return false
    }
    
    // If item has a specific role requirement, check if user has that role
    if (item.role) {
      return hasPermissionForItem && userRole === item.role
    }
    
    // For items without specific role requirements, use permission-based filtering
    return hasPermissionForItem
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900">School Management</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Mobile Academic Period Selector */}
          <div className="px-4 py-2 border-b border-gray-200">
            <AcademicPeriodSelector />
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          {/* Logout button at bottom of sidebar */}
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-gray-900">School Management</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          {/* Logout button at bottom of sidebar */}
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

        {/* Main content */}
        <div className="lg:pl-64">
          <div className="sticky top-0 z-10 flex h-16 bg-white shadow lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex flex-1 items-center justify-between px-2 sm:px-4">
              <h1 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">School Management</h1>
              <div className="flex items-center space-x-1">
                {/* Current Period Display for Mobile - Clickable for Teachers and Admins */}
                {isTeacher && currentPeriod && (
                  <button
                    onClick={() => setTeacherPeriodModalOpen(true)}
                    className="bg-blue-600 text-white px-2 py-1 rounded-md font-bold text-xs sm:text-sm shadow-md hover:bg-blue-700 transition-colors active:bg-blue-800"
                  >
                    {currentPeriod.academicYear} - {currentPeriod.term}
                  </button>
                )}
                {!isTeacher && currentPeriod && (
                  <>
                    <button
                      onClick={() => setPeriodModalOpen(true)}
                      className="bg-blue-600 text-white px-2 py-1 rounded-md font-bold text-xs sm:text-sm shadow-md hover:bg-blue-700 transition-colors active:bg-blue-800"
                    >
                      {currentPeriod.academicYear} - {currentPeriod.term}
                    </button>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setCreatePeriodModalOpen(true)}
                        className="bg-blue-600 text-white p-1 rounded-md shadow-md hover:bg-blue-700 transition-colors active:bg-blue-800"
                        title="Create New Academic Period"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
                {isTeacher && !currentPeriod && (
                  <button
                    onClick={() => setTeacherPeriodModalOpen(true)}
                    className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium text-xs sm:text-sm hover:bg-gray-200 transition-colors active:bg-gray-300 cursor-pointer"
                    title="Click to select an academic period"
                  >
                    No Period Selected
                  </button>
                )}
                {!isTeacher && !currentPeriod && (
                  <button
                    onClick={() => setPeriodModalOpen(true)}
                    className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium text-xs sm:text-sm hover:bg-gray-200 transition-colors active:bg-gray-300 cursor-pointer"
                    title="Click to select an academic period"
                  >
                    No Period Selected
                  </button>
                )}
              </div>
            </div>
          </div>

        {/* Desktop header with academic period and user menu */}
        <div className="hidden lg:flex lg:justify-between lg:items-center lg:h-16 lg:bg-white lg:shadow lg:px-6">
          {/* Academic Period Display */}
          <div className="flex items-center space-x-2">
            {/* Academic Period Display - Clickable for Teachers and Admins */}
            {isTeacher && currentPeriod ? (
              <button
                onClick={() => setTeacherPeriodModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-md hover:bg-blue-700 transition-colors active:bg-blue-800"
              >
                {currentPeriod.academicYear} - {currentPeriod.term}
              </button>
            ) : !isTeacher && currentPeriod ? (
              <>
                <button
                  onClick={() => setPeriodModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-md hover:bg-blue-700 transition-colors active:bg-blue-800"
                >
                  {currentPeriod.academicYear} - {currentPeriod.term}
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => setCreatePeriodModalOpen(true)}
                    className="bg-blue-600 text-white p-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors active:bg-blue-800"
                    title="Create New Academic Period"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => isTeacher ? setTeacherPeriodModalOpen(true) : setPeriodModalOpen(true)}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium text-lg hover:bg-gray-200 transition-colors active:bg-gray-300 cursor-pointer"
                title="Click to select an academic period"
              >
                No Period Selected
              </button>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 text-gray-700 hover:text-gray-900"
            >
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">{currentUser?.email}</span>
              </div>
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                  <div className="font-medium">{userRoleData?.displayName || currentUser?.displayName || 'User'}</div>
                  <div className="text-gray-500">{currentUser?.email}</div>
                  {userRoleData?.role && (
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      {userRoleData.role.charAt(0).toUpperCase() + userRoleData.role.slice(1)}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1">
          <div className="py-3 sm:py-6">
            <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Academic Period Selection Modal */}
      {periodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Select Academic Period</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isTeacher ? 'Grades Management' : 'Fees Management'} 
                  {allPeriods.length > 0 && ` (${allPeriods.length} periods)`}
                </p>
              </div>
              <button
                onClick={() => setPeriodModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isTeacher ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Academic Period Selection Disabled</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Teachers cannot change their academic period through this interface.
                  </p>
                  <p className="text-xs text-gray-400">
                    Your current period is managed by the system administrator.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  Choose the academic year and term for fees management
                </p>
              )}
              
              {/* Show periods list only for non-teachers */}
              {!isTeacher && (
                <>
                  {periodLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading periods...</p>
                    </div>
                  ) : allPeriods.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No academic periods found</p>
                      <p className="text-xs text-gray-400 mt-1">Set fees for a period to create it</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allPeriods.map((period) => (
                        <div
                          key={`${period.academicYear}_${period.term}`}
                          className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                            currentPeriod?.academicYear === period.academicYear && 
                            currentPeriod?.term === period.term 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-left flex-1">
                            <div className="font-medium">{period.academicYear} - {period.term}</div>
                            <div className="text-sm text-gray-500">
                              {period.isActive ? 'Currently Active' : 'Available Period'}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {period.isActive && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                            {currentPeriod?.academicYear === period.academicYear && 
                             currentPeriod?.term === period.term && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleSelectPeriod(period)}
                                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                              >
                                Select
                              </button>
                              <button
                                onClick={() => handleEditPeriod(period)}
                                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              {isTeacher ? (
                <button
                  onClick={() => setPeriodModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={() => setPeriodModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Period Modal */}
      {editPeriodModalOpen && selectedPeriodForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Academic Period</h2>
              <button
                onClick={() => {
                  setEditPeriodModalOpen(false)
                  setSelectedPeriodForEdit(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={selectedPeriodForEdit.academicYear}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Academic year cannot be changed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term
                  </label>
                  <input
                    type="text"
                    value={selectedPeriodForEdit.term}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Term cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editFormData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditFormData(prev => ({...prev, isActive: e.target.value === 'active'}))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Add a description for this academic period..."
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({...prev, description: e.target.value}))}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Period Information
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>This period was created when fees were set for {selectedPeriodForEdit.academicYear} - {selectedPeriodForEdit.term}.</p>
                        <p className="mt-1">To modify the academic year or term, you would need to create a new period by setting fees for the desired period.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setEditPeriodModalOpen(false)
                  setSelectedPeriodForEdit(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePeriod}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Period Selection Modal */}
      {teacherPeriodModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10 max-h-[90vh] overflow-y-auto">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Academic Period</h3>
                  <button
                    onClick={() => setTeacherPeriodModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the academic year and term for grades management
                  </p>
                  
                  
                  {periodLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading periods...</p>
                    </div>
                  ) : allPeriods.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No academic periods found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Create a new academic period using the "Set Term" button in the Grades page
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allPeriods.map((period) => (
                        <div
                          key={`${period.academicYear}_${period.term}`}
                          className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                            currentPeriod?.academicYear === period.academicYear && 
                            currentPeriod?.term === period.term 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-left flex-1">
                            <div className="font-medium">{period.academicYear} - {period.term}</div>
                            <div className="text-sm text-gray-500">
                              {period.isActive ? 'Currently Active' : 'Available Period'}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {period.isActive && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                            {currentPeriod?.academicYear === period.academicYear && 
                             currentPeriod?.term === period.term && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleSelectPeriod(period)}
                                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setTeacherPeriodModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Academic Period Modal */}
      {createPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Academic Period</h2>
              <button
                onClick={() => setCreatePeriodModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Create a new academic period for {isTeacher ? 'grades management' : 'fees management'}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={createPeriodForm.academicYear}
                    onChange={(e) => setCreatePeriodForm(prev => ({...prev, academicYear: e.target.value}))}
                  >
                    {(() => {
                      const currentYear = new Date().getFullYear()
                      const years = []
                      // Generate options from current year to 10 years in the future
                      for (let year = currentYear; year <= currentYear + 10; year++) {
                        years.push(
                          <option key={year} value={year.toString()}>
                            {year} {year === currentYear ? '(Current Year)' : ''}
                          </option>
                        )
                      }
                      return years
                    })()}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={createPeriodForm.term}
                    onChange={(e) => setCreatePeriodForm(prev => ({...prev, term: e.target.value}))}
                  >
                    <option value="1st Term">1st Term</option>
                    <option value="2nd Term">2nd Term</option>
                    <option value="3rd Term">3rd Term</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setCreatePeriodModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isCreatingPeriod}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePeriod}
                disabled={isCreatingPeriod}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingPeriod ? 'Creating...' : 'Create Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout
