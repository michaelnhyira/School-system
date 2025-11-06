import { useState, useEffect } from 'react'
import { Eye, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { studentUtils, teacherUtils } from '../utils/firebaseUtils'
import { CLASS_LEVELS } from '../constants/classes'
import { getNextClass } from '../utils/promotionUtils'
import type { Student } from '../types/student'
import { Navigate } from 'react-router-dom'

interface Teacher {
  id: string
  fullName: string
  email: string
  assignedClass?: string
}

interface ClassPromotionStatus {
  className: string
  teacher: Teacher | null
  studentCount: number
  pendingCount: number
  confirmedCount: number
  newlyPromotedCount: number
  repeatingCount: number
  nextClass: string | null
  isJHS3: boolean
}

const PromoteAll = () => {
  const { isTeacher, isAccountant } = useAuth()
  const [classes, setClasses] = useState<ClassPromotionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [showClassDetail, setShowClassDetail] = useState(false)
  const [classStudents, setClassStudents] = useState<Student[]>([])

  // Redirect teachers and accountants - they shouldn't access this page
  if (isTeacher() || isAccountant()) {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const [allStudents, allTeachers] = await Promise.all([
          studentUtils.getStudents(),
          teacherUtils.getTeachers()
        ])

        // Group students by class
        const studentsByClass = new Map<string, Student[]>()
        allStudents.forEach((student: any) => {
          const className = student.assignedClass || student.class || 'Unassigned'
          if (!studentsByClass.has(className)) {
            studentsByClass.set(className, [])
          }
          studentsByClass.get(className)!.push({
            ...student,
            promotionStatus: student.promotionStatus || null,
            isRepeating: student.isRepeating || false,
            promotedFromClass: student.promotedFromClass || null
          } as Student)
        })

        // Build class status array
        const classStatuses: ClassPromotionStatus[] = CLASS_LEVELS.map(classLevel => {
          const className = classLevel.value
          const classStudents = studentsByClass.get(className) || []
          
          // Find teacher for this class
          const teacher = allTeachers.find((t: any) => 
            (t.assignedClass || '').toLowerCase() === className.toLowerCase()
          ) as Teacher | undefined

          const pendingCount = classStudents.filter(s => 
            s.promotionStatus === 'pending' && s.promotedFromClass === className
          ).length

          const confirmedCount = classStudents.filter(s => 
            s.promotionStatus === 'confirmed' || !s.promotionStatus
          ).length

          const newlyPromotedCount = classStudents.filter(s => 
            s.promotionStatus === 'pending' && s.promotedFromClass && s.promotedFromClass !== className
          ).length

          const repeatingCount = classStudents.filter(s => s.isRepeating).length

          // Get next class
          const nextClass = getNextClass(className)

          return {
            className,
            teacher: teacher || null,
            studentCount: classStudents.length,
            pendingCount,
            confirmedCount,
            newlyPromotedCount,
            repeatingCount,
            nextClass,
            isJHS3: className === 'JHS 3'
          }
        })

        // Add unassigned class if any students exist
        const unassignedStudents = studentsByClass.get('Unassigned') || []
        if (unassignedStudents.length > 0) {
          classStatuses.push({
            className: 'Unassigned',
            teacher: null,
            studentCount: unassignedStudents.length,
            pendingCount: 0,
            confirmedCount: unassignedStudents.length,
            newlyPromotedCount: 0,
            repeatingCount: 0,
            nextClass: null,
            isJHS3: false
          })
        }

        setClasses(classStatuses)
      } catch (error) {
        console.error('Error fetching promotion data:', error)
        alert('Failed to load promotion data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleViewClass = async (className: string) => {
    try {
      const students = await studentUtils.getStudentsByClass(className)
      setClassStudents(students.map((s: any) => ({
        ...s,
        promotionStatus: s.promotionStatus || null,
        isRepeating: s.isRepeating || false,
        promotedFromClass: s.promotedFromClass || null
      })))
      setSelectedClass(className)
      setShowClassDetail(true)
    } catch (error) {
      console.error('Error fetching class students:', error)
      alert('Failed to load class students')
    }
  }

  const getStatusBadge = (status: ClassPromotionStatus) => {
    if (status.pendingCount > 0) {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
          In Progress ({status.pendingCount} pending)
        </span>
      )
    }
    if (status.newlyPromotedCount > 0) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
          New Students ({status.newlyPromotedCount})
        </span>
      )
    }
    if (status.repeatingCount > 0) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
          Has Repeaters ({status.repeatingCount})
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
        Ready
      </span>
    )
  }

  const getStudentStatusColor = (student: Student, currentClass: string) => {
    if (student.isRepeating) return 'border-yellow-400 bg-yellow-50'
    if (student.promotionStatus === 'pending' && student.promotedFromClass !== currentClass) {
      return 'border-blue-400 bg-blue-50'
    }
    if (student.promotionStatus === 'pending') return 'border-orange-400 bg-orange-50'
    if (student.promotionStatus === 'reversed') return 'border-red-400 bg-red-50'
    return 'border-gray-200 bg-white'
  }

  const getStudentStatusText = (student: Student, currentClass: string) => {
    if (student.isRepeating) return 'Repeating'
    if (student.promotionStatus === 'pending' && student.promotedFromClass !== currentClass) {
      return `From ${student.promotedFromClass}`
    }
    if (student.promotionStatus === 'pending') return 'Pending'
    if (student.promotionStatus === 'reversed') return 'Reversed'
    return 'Normal'
  }

  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Promotions</h1>
          <p className="text-gray-600 mt-1">Overview of all class promotions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Classes</div>
          <div className="text-2xl font-bold text-gray-900">{classes.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Classes with Pending</div>
          <div className="text-2xl font-bold text-orange-600">
            {classes.filter(c => c.pendingCount > 0).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Students</div>
          <div className="text-2xl font-bold text-gray-900">
            {classes.reduce((sum, c) => sum + c.studentCount, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Newly Promoted</div>
          <div className="text-2xl font-bold text-blue-600">
            {classes.reduce((sum, c) => sum + c.newlyPromotedCount, 0)}
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">All Classes</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classStatus) => (
              <div
                key={classStatus.className}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{classStatus.className}</h3>
                    {classStatus.teacher && (
                      <p className="text-sm text-gray-600 mt-1">
                        Teacher: {classStatus.teacher.fullName}
                      </p>
                    )}
                    {!classStatus.teacher && (
                      <p className="text-sm text-gray-400 mt-1">No teacher assigned</p>
                    )}
                  </div>
                  {getStatusBadge(classStatus)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Students:</span>
                    <span className="font-semibold">{classStatus.studentCount}</span>
                  </div>
                  {classStatus.nextClass && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Class:</span>
                      <span className="font-semibold">{classStatus.nextClass}</span>
                    </div>
                  )}
                  {classStatus.isJHS3 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completion:</span>
                      <span className="font-semibold text-purple-600">Graduation</span>
                    </div>
                  )}
                  {classStatus.pendingCount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Pending Promotions:</span>
                      <span className="font-semibold">{classStatus.pendingCount}</span>
                    </div>
                  )}
                  {classStatus.newlyPromotedCount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Newly Promoted:</span>
                      <span className="font-semibold">{classStatus.newlyPromotedCount}</span>
                    </div>
                  )}
                  {classStatus.repeatingCount > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Repeating:</span>
                      <span className="font-semibold">{classStatus.repeatingCount}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleViewClass(classStatus.className)}
                  className="mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Detail Modal */}
      {showClassDetail && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">{selectedClass} Students</h2>
              <button
                onClick={() => {
                  setShowClassDetail(false)
                  setSelectedClass(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classStudents.map((student) => (
                <div
                  key={student.id}
                  className={`border-2 rounded-lg p-4 ${getStudentStatusColor(student, selectedClass)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{student.fullName || student.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {getStudentStatusText(student, selectedClass)}
                      </p>
                      {student.promotedFromClass && (
                        <p className="text-xs text-blue-600 mt-1">
                          Promoted from {student.promotedFromClass}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {classStudents.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No students in this class
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromoteAll

