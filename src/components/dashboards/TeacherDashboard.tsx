import { useState, useEffect } from 'react';
import { Users, BookOpen, BarChart3, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGradesAcademicPeriod } from '../../contexts/GradesAcademicPeriodContext';
import { studentUtils, teacherUtils } from '../../utils/firebaseUtils';

interface TeacherStats {
  totalStudents: number;
  myStudents: number;
  assignedClass: string;
  subjects: string[];
}

const TeacherDashboard = () => {
  const { currentUser, userRoleData } = useAuth();
  const { currentPeriod } = useGradesAcademicPeriod();
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    myStudents: 0,
    assignedClass: '',
    subjects: []
  });
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.email) return;
      
      try {
        setLoading(true);
        
        // Fetch teacher information and students
        const [allStudents, teachers] = await Promise.all([
          studentUtils.getStudents(),
          teacherUtils.getTeachers()
        ]);

        // Find current teacher
        const currentTeacher = teachers.find((t: any) => t.email === currentUser.email);
        
        if (currentTeacher) {
          // Count students in teacher's assigned class
          const myStudents = allStudents.filter((student: any) => 
            student.assignedClass === (currentTeacher as any).assignedClass || 
            student.class === (currentTeacher as any).assignedClass
          );

          setStats({
            totalStudents: allStudents.length,
            myStudents: myStudents.length,
            assignedClass: (currentTeacher as any).assignedClass || 'Not Assigned',
            subjects: (currentTeacher as any).subjects || []
          });
        } else {
          setStats({
            totalStudents: allStudents.length,
            myStudents: 0,
            assignedClass: 'Not Assigned',
            subjects: []
          });
        }
      } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const quickActions = [
    {
      name: 'My Students',
      description: 'View students in your assigned class',
      icon: Users,
      href: '/my-students',
      color: 'blue'
    },
    {
      name: 'All Students',
      description: 'View all students in the school',
      icon: Users,
      href: '/students',
      color: 'green'
    },
    {
      name: 'View Reports',
      description: 'Generate academic reports',
      icon: BarChart3,
      href: '/reports',
      color: 'indigo'
    }
  ];

  const statCards = [
    {
      name: 'My Students',
      value: stats.myStudents,
      icon: Users,
      color: 'blue',
      description: `Students in ${stats.assignedClass}`
    },
    {
      name: 'Assigned Class',
      value: stats.assignedClass,
      icon: BookOpen,
      color: 'green',
      description: 'Your assigned class'
    },
    {
      name: 'Subjects Taught',
      value: stats.subjects.length,
      icon: BookOpen,
      color: 'purple',
      description: stats.subjects.join(', ') || 'No subjects assigned'
    }
  ];

  const upcomingTasks = [
    {
      title: 'Grade Assessments',
      description: 'Mathematics test papers due for grading',
      time: '2 hours ago',
      priority: 'high'
    },
    {
      title: 'Parent Meeting',
      description: 'Scheduled meeting with Class 6 parents',
      time: 'Tomorrow 10:00 AM',
      priority: 'medium'
    },
    {
      title: 'Lesson Plan Review',
      description: 'Review and update lesson plans for next week',
      time: 'Friday',
      priority: 'low'
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {userRoleData?.displayName || currentUser?.displayName || 'Teacher'}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here's your teaching overview for today.
            </p>
            {stats.assignedClass && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <BookOpen className="h-4 w-4 mr-1" />
                <span>Assigned to: <strong>{stats.assignedClass}</strong></span>
              </div>
            )}
            {currentPeriod && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Current Period: <strong>{currentPeriod.academicYear} - {currentPeriod.term}</strong></span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Today</div>
            <div className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
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
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </dd>
                  </dl>
                </div>
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

        {/* Upcoming Tasks */}
        <div>
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Upcoming Tasks</h2>
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <div className="space-y-4">
                {upcomingTasks.map((task, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-400' :
                      task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.description}</p>
                      <div className="flex items-center mt-1">
                        <Clock className="h-3 w-3 text-gray-400 mr-1" />
                        <p className="text-xs text-gray-400">{task.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Features */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Teacher Features
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Student Management
                </p>
                <p className="text-sm text-blue-700">
                  View and manage student information, track attendance, and monitor progress.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <BookOpen className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Class & Subject Management
                </p>
                <p className="text-sm text-green-700">
                  Organize classes, manage subjects, and create lesson plans.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-indigo-50 rounded-lg">
              <BarChart3 className="h-8 w-8 text-indigo-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-indigo-900">
                  Academic Reports
                </p>
                <p className="text-sm text-indigo-700">
                  Generate and view academic reports for your students and classes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TeacherDashboard;

