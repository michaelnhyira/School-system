import { useState, useEffect } from 'react'
import { Calendar, Users, CheckCircle, XCircle, Search, Eye, Save } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useGradesAcademicPeriod } from '../contexts/GradesAcademicPeriodContext'
import { studentUtils, teacherUtils, attendanceUtils } from '../utils/firebaseUtils'

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
  parentName: string
  guardianName: string
  parentPhone: string
  guardianContact: string
  address: string
  dob: string
  gender: string
  nationality: string
  religion: string
  prevSchool: string
  lastClass: string
  subjects: string
  specialNeeds: string
  relationship: string
  occupation: string
  guardianAddress: string
  admissionNumber: string
  house: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

interface Teacher {
  id: string
  fullName: string
  email: string
  assignedClass: string
  subjects: string[]
}


const Attendance = () => {
  const { currentUser } = useAuth()
  const { currentPeriod } = useGradesAcademicPeriod()
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: 'present' | 'absent'; remarks: string }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null)

  // Fetch teacher information and students
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.email) return

      try {
        setLoading(true)
        
        // Get all teachers and find the current teacher
        const teachers = await teacherUtils.getTeachers()
        const currentTeacher = teachers.find((t: any) => t.email === currentUser.email)
        
        if (currentTeacher) {
          const teacherData = {
            id: currentTeacher.id,
            fullName: (currentTeacher as any).fullName,
            email: (currentTeacher as any).email,
            assignedClass: (currentTeacher as any).assignedClass || '',
            subjects: (currentTeacher as any).subjects || []
          }
          setTeacher(teacherData)
          
          // Fetch all students
          const allStudents = await studentUtils.getStudents()
          
          // Filter students by the teacher's assigned class
          const classStudents = allStudents.filter((student: any) => 
            student.assignedClass === teacherData.assignedClass || 
            student.class === teacherData.assignedClass
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
            photoUrl: student.photoUrl,
            createdAt: student.createdAt || new Date().toISOString(),
            updatedAt: student.updatedAt || new Date().toISOString()
          }))
          
          setStudents(classStudents)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser])

  // Load attendance data for selected date
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!currentPeriod || !teacher) return

      try {
        const existingAttendance = await attendanceUtils.getClassAttendance(
          currentPeriod.academicYear,
          currentPeriod.term,
          teacher.assignedClass,
          selectedDate
        )

        if (existingAttendance && (existingAttendance as any).attendanceData) {
          setAttendanceData((existingAttendance as any).attendanceData)
        } else {
          // Initialize with all students as present by default
          const initialData: Record<string, { status: 'present' | 'absent'; remarks: string }> = {}
          students.forEach(student => {
            initialData[student.id] = { status: 'present', remarks: '' }
          })
          setAttendanceData(initialData)
        }
      } catch (error) {
        console.error('Error loading attendance data:', error)
        // Initialize with all students as present by default
        const initialData: Record<string, { status: 'present' | 'absent'; remarks: string }> = {}
        students.forEach(student => {
          initialData[student.id] = { status: 'present', remarks: '' }
        })
        setAttendanceData(initialData)
      }
    }

    loadAttendanceData()
  }, [currentPeriod, teacher, selectedDate, students])

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.guardianName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }))
  }

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }))
  }

  const handleSaveAttendance = async () => {
    if (!currentPeriod || !teacher) return

    setIsSaving(true)
    try {
      await attendanceUtils.markAttendance(
        currentPeriod.academicYear,
        currentPeriod.term,
        teacher.assignedClass,
        selectedDate,
        attendanceData
      )
      alert('Attendance saved successfully!')
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert('Failed to save attendance. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewSummary = async () => {
    if (!currentPeriod || !teacher) return

    try {
      const summary = await attendanceUtils.getClassAttendanceSummary(
        currentPeriod.academicYear,
        currentPeriod.term,
        teacher.assignedClass
      )
      setAttendanceSummary(summary)
      setShowSummaryModal(true)
    } catch (error) {
      console.error('Error loading attendance summary:', error)
      alert('Failed to load attendance summary.')
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Teacher Found</h3>
        <p className="text-gray-500">Please contact the administrator to set up your teacher profile.</p>
      </div>
    )
  }

  if (!currentPeriod) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Period Selected</h3>
        <p className="text-gray-500">Please select an academic period to manage attendance.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Mark attendance for students in {teacher.assignedClass}
            </p>
          </div>
          <div className="mt-2 sm:mt-0">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{currentPeriod.academicYear} - {currentPeriod.term}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Selection and Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleViewSummary}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Summary
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
          <input
            type="text"
            placeholder="Search students..."
            className="w-full pl-8 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Student Attendance - {new Date(selectedDate).toLocaleDateString()}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500">
            {filteredStudents.length} students
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                const studentAttendance = attendanceData[student.id] || { status: 'present', remarks: '' }
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                          {student.photoUrl ? (
                            <img
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                              src={student.photoUrl}
                              alt={student.fullName}
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-medium text-gray-700">
                                {student.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <div className="text-sm sm:text-sm font-medium text-gray-900">
                            {student.fullName}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {student.admissionNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                          className={`flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            studentAttendance.status === 'present'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                          className={`flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            studentAttendance.status === 'absent'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                          }`}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Absent
                        </button>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <input
                        type="text"
                        placeholder="Add remarks..."
                        value={studentAttendance.remarks}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Summary Modal */}
      {showSummaryModal && attendanceSummary && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-4 border w-11/12 sm:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Attendance Summary</h3>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-100 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">
                      {Object.values(attendanceSummary.students).reduce((sum: number, student: any) => sum + student.present, 0)}
                    </div>
                    <div className="text-sm text-green-600">Total Present</div>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-800">
                      {Object.values(attendanceSummary.students).reduce((sum: number, student: any) => sum + student.absent, 0)}
                    </div>
                    <div className="text-sm text-red-600">Total Absent</div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Present
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Absent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Days
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(attendanceSummary.students).map(([studentId, stats]: [string, any]) => {
                        const student = students.find(s => s.id === studentId)
                        if (!student) return null
                        
                        return (
                          <tr key={studentId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.fullName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {stats.present}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              {stats.absent}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stats.total}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Attendance
