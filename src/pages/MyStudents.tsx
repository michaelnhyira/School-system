import { useState, useEffect } from 'react'
import { Search, Users, Phone, MapPin, Calendar, User, BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useGradesAcademicPeriod } from '../contexts/GradesAcademicPeriodContext'
import { studentUtils, teacherUtils } from '../utils/firebaseUtils'
import { formatDate } from '../utils/dateUtils'
import StudentHistoryModal from '../components/StudentHistoryModal'

interface Student {
  id: string
  name: string
  fullName: string
  phone: string
  contactNumber: string
  grade: string
  class: string
  assignedClass: string
  enrollmentDate: string
  status: 'active' | 'inactive'
  balance: number
  lastPaymentDate?: string
  parentName: string
  parentPhone: string
  address: string
  createdAt: string
  updatedAt: string
  // Additional fields for detailed view
  dob?: string
  gender?: string
  birthPlace?: string
  nationality?: string
  religion?: string
  prevSchool?: string
  lastClass?: string
  subjects?: string
  specialNeeds?: string
  guardianName?: string
  relationship?: string
  occupation?: string
  guardianContact?: string
  guardianAddress?: string
  admissionNumber?: string
  house?: string
  photoUrl?: string
}

interface Teacher {
  id: string
  fullName: string
  email: string
  assignedClass: string
  subjects: string[]
}

const MyStudents = () => {
  const { currentUser, userRoleData } = useAuth()
  const { currentPeriod } = useGradesAcademicPeriod()
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  // Fetch teacher information and their assigned class
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!currentUser?.email) return

      try {
        setLoading(true)
        
        // Get all teachers and find the current teacher
        const teachers = await teacherUtils.getTeachers()
        const currentTeacher = teachers.find((t: any) => t.email === currentUser.email)
        
        if (currentTeacher) {
          setTeacher({
            id: currentTeacher.id || '',
            fullName: (currentTeacher as any).fullName || '',
            email: (currentTeacher as any).email || '',
            assignedClass: (currentTeacher as any).assignedClass || '',
            subjects: (currentTeacher as any).subjects || []
          })
        }
      } catch (error) {
        console.error('Error fetching teacher data:', error)
      }
    }

    fetchTeacherData()
  }, [currentUser])

  // Fetch students in the teacher's assigned class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!teacher?.assignedClass) {
        setLoading(false)
        return
      }

      try {
        const allStudents = await studentUtils.getStudents()
        
        // Filter students by the teacher's assigned class
        const classStudents = allStudents.filter((student: any) => 
          student.assignedClass === teacher.assignedClass || 
          student.class === teacher.assignedClass
        ).map((student: any) => ({
          id: student.id,
          name: student.fullName || student.name,
          fullName: student.fullName || student.name,
          phone: student.contactNumber || student.phone || '',
          contactNumber: student.contactNumber || student.phone || '',
          grade: student.grade || student.assignedClass || '',
          class: student.class || student.assignedClass || '',
          assignedClass: student.assignedClass || student.class || '',
          enrollmentDate: student.enrollmentDate || new Date().toISOString().split('T')[0],
          status: student.status || 'active',
          balance: student.balance || 0,
          lastPaymentDate: student.lastPaymentDate || '',
          parentName: student.guardianName || student.parentName || '',
          guardianName: student.guardianName || student.parentName || '',
          parentPhone: student.guardianContact || student.parentPhone || '',
          guardianContact: student.guardianContact || student.parentPhone || '',
          address: student.address || '',
          dob: student.dob || '',
          gender: student.gender || '',
          nationality: student.nationality || '',
          religion: student.religion || '',
          prevSchool: student.prevSchool || '',
          lastClass: student.lastClass || '',
          subjects: student.subjects || '',
          specialNeeds: student.specialNeeds || '',
          relationship: student.relationship || '',
          occupation: student.occupation || '',
          guardianAddress: student.guardianAddress || '',
          admissionNumber: student.admissionNumber || '',
          house: student.house || '',
          photoUrl: student.photoUrl || '',
          createdAt: student.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: student.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }))
        
        setStudents(classStudents)
      } catch (error) {
        console.error('Error fetching students:', error)
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    if (teacher) {
      fetchStudents()
    }
  }, [teacher])

  const filteredStudents = students.filter(student =>
    (student.fullName || student.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowDetailModal(true)
  }

  const handleViewHistory = (student: Student) => {
    setSelectedStudent(student)
    setShowDetailModal(false)
    setShowHistoryModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your students...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="text-yellow-600 mb-4">
              <User className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Class Assigned</h3>
            <p className="text-yellow-700">
              You don't have a class assigned yet. Please contact an administrator to assign you to a class.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
            <p className="text-gray-600 mt-1">
              {teacher.fullName} - {teacher.assignedClass}
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <BookOpen className="h-4 w-4 mr-1" />
              <span>Subjects: {teacher.subjects.join(', ')}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{students.length}</div>
            <div className="text-sm text-gray-500">Total Students</div>
          </div>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students by name, admission number, or parent name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                <div className="text-sm text-blue-600">Total Students</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-green-600">
                  {students.filter(s => s.status === 'active').length}
                </div>
                <div className="text-sm text-green-600">Active Students</div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-yellow-600">
                  {students.filter(s => s.status === 'inactive').length}
                </div>
                <div className="text-sm text-yellow-600">Inactive Students</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <div className="text-2xl font-bold text-purple-600">{teacher.subjects.length}</div>
                <div className="text-sm text-purple-600">Subjects Taught</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Students in {teacher.assignedClass}</h2>
        </div>
        
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No students match your search criteria.' : 'No students are assigned to this class yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.gender} • {student.dob ? formatDate(student.dob) : 'No DOB'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.assignedClass}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewStudent(student)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Student Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Student Basic Info */}
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedStudent.fullName}</h4>
                  <p className="text-gray-600">{selectedStudent.assignedClass}</p>
                  <div className="flex items-center mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedStudent.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedStudent.status}
                    </span>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Personal Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">DOB:</span>
                        <span className="ml-2">{selectedStudent.dob ? formatDate(selectedStudent.dob) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Gender:</span>
                        <span className="ml-2">{selectedStudent.gender || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Nationality:</span>
                        <span className="ml-2">{selectedStudent.nationality || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600">Religion:</span>
                        <span className="ml-2">{selectedStudent.religion || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2">{selectedStudent.contactNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Address:</span>
                        <span className="ml-2">{selectedStudent.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Academic Information */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Academic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Admission Number:</span>
                      <span className="ml-2">{selectedStudent.admissionNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Previous School:</span>
                      <span className="ml-2">{selectedStudent.prevSchool || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Class:</span>
                      <span className="ml-2">{selectedStudent.lastClass || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">House:</span>
                      <span className="ml-2">{selectedStudent.house || 'N/A'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Special Needs:</span>
                      <span className="ml-2">{selectedStudent.specialNeeds || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewHistory(selectedStudent)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student History Modal */}
      <StudentHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false)
          setSelectedStudent(null)
        }}
        student={selectedStudent}
      />
    </div>
  )
}

export default MyStudents

