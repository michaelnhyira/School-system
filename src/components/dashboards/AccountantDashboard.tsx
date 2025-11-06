import { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { studentUtils, feesUtils } from '../../utils/firebaseUtils';

interface AccountantStats {
  totalStudents: number;
  monthlyRevenue: number;
  pendingPayments: number;
  totalPayments: number;
  collectionRate: number;
  overduePayments: number;
}

const AccountantDashboard = () => {
  const { currentUser, userRoleData } = useAuth();
  const [stats, setStats] = useState<AccountantStats>({
    totalStudents: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    totalPayments: 0,
    collectionRate: 0,
    overduePayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch financial data
        const [students, currentPeriod] = await Promise.all([
          studentUtils.getStudents(),
          feesUtils.getCurrentAcademicPeriod()
        ]);

        let monthlyRevenue = 0;
        let totalPayments = 0;
        let pendingPayments = 0;
        let collectionRate = 0;

        if (currentPeriod) {
          const paymentStats = await feesUtils.getPeriodPaymentStats(
            currentPeriod.academicYear, 
            currentPeriod.term
          );
          monthlyRevenue = paymentStats.totalAmount;
          totalPayments = paymentStats.paymentCount;
          
          // Calculate expected revenue and collection rate
          const classFees = await feesUtils.getCurrentClassFees();
          const totalExpectedRevenue = students.length * (classFees[0]?.feeAmount || 0);
          pendingPayments = Math.max(0, totalExpectedRevenue - monthlyRevenue);
          collectionRate = totalExpectedRevenue > 0 ? (monthlyRevenue / totalExpectedRevenue) * 100 : 0;
        }

        setStats({
          totalStudents: students.length,
          monthlyRevenue,
          pendingPayments,
          totalPayments,
          collectionRate,
          overduePayments: Math.floor(pendingPayments * 0.3) // Estimated overdue
        });
      } catch (error) {
        console.error('Error fetching accountant dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      name: 'Record Payment',
      description: 'Add a new fee payment',
      icon: CreditCard,
      href: '/fees',
      color: 'green'
    },
    {
      name: 'View Students',
      description: 'Check student payment status',
      icon: Users,
      href: '/students',
      color: 'blue'
    },
    {
      name: 'Financial Reports',
      description: 'Generate financial reports',
      icon: FileText,
      href: '/reports',
      color: 'purple'
    },
    {
      name: 'Fee Management',
      description: 'Configure fee structures',
      icon: DollarSign,
      href: '/fees',
      color: 'yellow'
    }
  ];

  const statCards = [
    {
      name: 'Monthly Revenue',
      value: `₵${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'green',
      change: '+8%',
      changeType: 'positive',
      description: 'Total collected this period'
    },
    {
      name: 'Pending Payments',
      value: `₵${stats.pendingPayments.toLocaleString()}`,
      icon: AlertCircle,
      color: 'red',
      change: '-5%',
      changeType: 'negative',
      description: 'Outstanding fee payments'
    },
    {
      name: 'Collection Rate',
      value: `${stats.collectionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'blue',
      change: '+2%',
      changeType: 'positive',
      description: 'Payment collection efficiency'
    },
    {
      name: 'Total Payments',
      value: stats.totalPayments,
      icon: CreditCard,
      color: 'purple',
      change: '+15%',
      changeType: 'positive',
      description: 'Number of payments recorded'
    }
  ];

  const recentPayments = [
    {
      studentName: 'John Doe',
      amount: 500,
      method: 'Cash',
      time: '2 hours ago',
      status: 'completed'
    },
    {
      studentName: 'Jane Smith',
      amount: 750,
      method: 'Bank Transfer',
      time: '4 hours ago',
      status: 'completed'
    },
    {
      studentName: 'Mike Johnson',
      amount: 300,
      method: 'Mobile Money',
      time: '1 day ago',
      status: 'pending'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {userRoleData?.displayName || currentUser?.displayName || 'Accountant'}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's your financial overview for today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className={`h-6 w-6 text-${item.color}-600`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {quickActions.map((action) => (
              <div
                key={action.name}
                className="relative group bg-white p-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.location.href = action.href}
              >
                <div>
                  <span className={`rounded-lg inline-flex p-2 bg-${action.color}-50 text-${action.color}-600`}>
                    <action.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {action.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div>
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Payments</h2>
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <div className="space-y-4">
                {recentPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <CreditCard className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{payment.studentName}</p>
                        <p className="text-sm text-gray-500">{payment.method} • {payment.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        ₵{payment.amount.toLocaleString()}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Financial Management Features
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Fee Management
                </p>
                <p className="text-sm text-green-700">
                  Configure fee structures, track payments, and manage student accounts.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Student Financial Records
                </p>
                <p className="text-sm text-blue-700">
                  View and manage individual student payment histories and balances.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-purple-50 rounded-lg">
              <FileText className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-purple-900">
                  Financial Reports
                </p>
                <p className="text-sm text-purple-700">
                  Generate comprehensive financial reports and analytics for school management.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-yellow-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Revenue Tracking
                </p>
                <p className="text-sm text-yellow-700">
                  Monitor revenue trends, collection rates, and financial performance metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;

