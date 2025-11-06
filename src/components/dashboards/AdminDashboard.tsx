import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, DollarSign, Settings, BarChart3, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { studentUtils, teacherUtils, classUtils, feesUtils } from '../../utils/firebaseUtils';
import { roleUtils } from '../../utils/roleUtils';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalUsers: number;
  monthlyRevenue: number;
  pendingPayments: number;
}

const AdminDashboard = () => {
  const { currentUser, userRoleData } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [students, teachers, classes, users, currentPeriod] = await Promise.all([
          studentUtils.getStudents(),
          teacherUtils.getTeachers(),
          classUtils.getClasses(),
          roleUtils.getAllUsersWithRoles(),
          feesUtils.getCurrentAcademicPeriod()
        ]);

        let monthlyRevenue = 0;
        let pendingPayments = 0;

        if (currentPeriod) {
          const paymentStats = await feesUtils.getPeriodPaymentStats(
            currentPeriod.academicYear, 
            currentPeriod.term
          );
          monthlyRevenue = paymentStats.totalAmount;
          
          // Calculate pending payments (simplified)
          const classFees = await feesUtils.getCurrentClassFees();
          const totalExpectedRevenue = students.length * (classFees[0]?.feeAmount || 0);
          pendingPayments = Math.max(0, totalExpectedRevenue - monthlyRevenue);
        }

        setStats({
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalClasses: classes.length,
          totalUsers: users.length,
          monthlyRevenue,
          pendingPayments
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      name: 'Manage Users',
      description: 'Add, edit, or remove user roles',
      icon: UserPlus,
      href: '/settings',
      color: 'blue'
    },
    {
      name: 'Add Student',
      description: 'Register a new student',
      icon: Users,
      href: '/students',
      color: 'green'
    },
    {
      name: 'Add Teacher',
      description: 'Register a new teacher',
      icon: GraduationCap,
      href: '/teachers',
      color: 'purple'
    },
    {
      name: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      href: '/settings',
      color: 'gray'
    }
  ];

  const statCards = [
    {
      name: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'blue',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Total Teachers',
      value: stats.totalTeachers,
      icon: GraduationCap,
      color: 'green',
      change: '+3%',
      changeType: 'positive'
    },
    {
      name: 'Active Classes',
      value: stats.totalClasses,
      icon: BookOpen,
      color: 'purple',
      change: '+5%',
      changeType: 'positive'
    },
    {
      name: 'System Users',
      value: stats.totalUsers,
      icon: Shield,
      color: 'indigo',
      change: '+2%',
      changeType: 'positive'
    },
    {
      name: 'Monthly Revenue',
      value: `₵${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'yellow',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Pending Payments',
      value: `₵${stats.pendingPayments.toLocaleString()}`,
      icon: BarChart3,
      color: 'red',
      change: '-5%',
      changeType: 'negative'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome back, {userRoleData?.displayName || currentUser?.displayName || 'Administrator'}!
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Here's what's happening at your school today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${item.color}-600`} aria-hidden="true" />
                </div>
                <div className="ml-4 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-base sm:text-lg font-medium text-gray-900">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 sm:px-5 py-2 sm:py-3">
              <div className="text-xs sm:text-sm">
                <span className={`font-medium ${
                  item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.change}
                </span>
                <span className="text-gray-500"> from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <div
              key={action.name}
              className="relative group bg-white p-4 sm:p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = action.href}
            >
              <div>
                <span className={`rounded-lg inline-flex p-2 sm:p-3 bg-${action.color}-50 text-${action.color}-600 ring-4 ring-white`}>
                  <action.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  <span className="absolute inset-0" aria-hidden="true" />
                  {action.name}
                </h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                  {action.description}
                </p>
              </div>
              <span
                className="pointer-events-none absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-300 group-hover:text-gray-400"
                aria-hidden="true"
              >
                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="m11.293 17.293 1.414 1.414L19.414 12l-6.707-6.707-1.414 1.414L15.586 11H6v2h9.586l-4.293 4.293z" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Administrative Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <Shield className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  System Administration
                </p>
                <p className="text-sm text-blue-700">
                  You have full access to all system features and user management.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <Users className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  User Management
                </p>
                <p className="text-sm text-green-700">
                  {stats.totalUsers} users are currently registered in the system.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-yellow-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Financial Overview
                </p>
                <p className="text-sm text-yellow-700">
                  ₵{stats.monthlyRevenue.toLocaleString()} collected this period, ₵{stats.pendingPayments.toLocaleString()} pending.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

