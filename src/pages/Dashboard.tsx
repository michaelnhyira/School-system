import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from '../components/dashboards/AdminDashboard'
import TeacherDashboard from '../components/dashboards/TeacherDashboard'
import AccountantDashboard from '../components/dashboards/AccountantDashboard'

const Dashboard = () => {
  const { userRole, loading, roleLoading } = useAuth()

  console.log('Dashboard rendering, userRole:', userRole, 'loading:', loading, 'roleLoading:', roleLoading);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {roleLoading ? 'Loading your account...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  // Render role-specific dashboard
  switch (userRole) {
    case 'admin':
      return <AdminDashboard />
    case 'teacher':
      return <TeacherDashboard />
    case 'accountant':
      return <AccountantDashboard />
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-red-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800 mb-2">Access Denied</h3>
              <p className="text-red-700 mb-4">
                You don't have a valid role assigned. Please contact an administrator.
              </p>
              <div className="bg-red-100 border border-red-300 rounded-md p-3">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> If you believe you should have access, please also check your internet connection 
                  and try refreshing the page, as connectivity issues can sometimes cause this message to appear.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
  }
}

export default Dashboard