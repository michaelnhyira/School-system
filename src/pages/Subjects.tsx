import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, BookOpen, GraduationCap, Clock, User } from 'lucide-react'
import { subjectUtils, teacherUtils } from '../utils/firebaseUtils'
import { useAuth } from '../contexts/AuthContext'

interface Subject {
  id: string
  name: string
  code: string
  description: string
  teacher: string
  credits: number
  level: 'Early Childhood' | 'Primary' | 'Junior High'
  gradeLevel: string
  duration: string
  status: 'active' | 'inactive'
  isCore: boolean
  isElective?: boolean
  prerequisites?: string[]
  createdAt: string
  updatedAt: string
}


const Subjects = () => {
  const { userRole, currentUser } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [teacherSubjectNames, setTeacherSubjectNames] = useState<string[] | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form data for adding new subjects
  const [formData, setFormData] = useState({
    name: ''
  })

  // Fetch subjects from Firestore
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true)
        const firestoreSubjects = await subjectUtils.getSubjects()
        
        // Transform Firestore data to match our Subject interface
        const transformedSubjects = firestoreSubjects.map((subject: any) => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          description: subject.description,
          teacher: subject.teacher || 'TBA',
          credits: subject.credits || 3,
          level: subject.level,
          gradeLevel: subject.gradeLevel,
          duration: subject.duration || 'Full Year',
          status: subject.status || 'active',
          isCore: subject.isCore || false,
          isElective: subject.isElective || false,
          prerequisites: subject.prerequisites || [],
          createdAt: subject.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: subject.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }))
        
        setSubjects(transformedSubjects)
        console.log('Subjects loaded from Firestore:', transformedSubjects.length)

        // If user is a teacher, fetch their assigned subject names for filtering
        if (userRole === 'teacher' && currentUser?.email) {
          try {
            const teachers = await teacherUtils.getTeachers()
            const me = teachers.find((t: any) => t.email === currentUser.email)
            if (me) {
              setTeacherSubjectNames(Array.isArray(me.subjects) ? me.subjects : (me.subject ? [me.subject] : []))
            } else {
              setTeacherSubjectNames([])
            }
          } catch (e) {
            console.error('Error fetching teacher subjects:', e)
            setTeacherSubjectNames([])
          }
        } else {
          setTeacherSubjectNames(null)
        }
      } catch (error) {
        console.error('Error fetching subjects:', error)
        setSubjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [userRole, currentUser?.email])


  // Apply teacher-specific restriction: show only the teacher's subjects when role is 'teacher'
  const baseSubjects = (userRole === 'teacher' && Array.isArray(teacherSubjectNames))
    ? subjects.filter(s => teacherSubjectNames.includes(s.name))
    : subjects

  const filteredSubjects = baseSubjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.teacher.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = gradeFilter === 'all' || subject.level === gradeFilter
    return matchesSearch && matchesLevel
  })

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      // Create subject in Firestore
      const newSubject = {
        name: formData.name
      }

      const subjectId = await subjectUtils.createSubject(newSubject)
      
      // Refresh subjects list
      const firestoreSubjects = await subjectUtils.getSubjects()
      const transformedSubjects = firestoreSubjects.map((subject: any) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        teacher: subject.teacher || 'TBA',
        credits: subject.credits || 3,
        level: subject.level || 'Primary',
        gradeLevel: subject.gradeLevel || '',
        duration: subject.duration || 'Full Year',
        status: subject.status || 'active',
        isCore: subject.isCore || false,
        isElective: subject.isElective || false,
        prerequisites: subject.prerequisites || [],
        createdAt: subject.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: subject.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }))
      
      setSubjects(transformedSubjects)
      setShowAddModal(false)
      
      // Reset form
      setFormData({
        name: ''
      })
      
      console.log('Subject created successfully:', formData.name)
    } catch (error) {
      console.error('Error creating subject:', error)
      alert('Failed to create subject. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    // Check if user is admin
    if (userRole !== 'admin') {
      alert('Only administrators can delete subjects.')
      return
    }

    // Get the subject to show in confirmation
    const subject = subjects.find(s => s.id === id)
    if (!subject) return

    // Request confirmation
    const confirmed = window.confirm(
      `Are you sure you want to delete the subject "${subject.name}"?\n\n` +
      `This action cannot be undone and will remove the subject from all classes and grade records.\n\n` +
      `Click OK to confirm deletion, or Cancel to abort.`
    )

    if (!confirmed) {
      return
    }

    try {
      await subjectUtils.deleteSubject(id)
      setSubjects(subjects.filter(subject => subject.id !== id))
      console.log('Subject deleted successfully')
      alert(`Subject "${subject.name}" has been deleted successfully.`)
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert('Failed to delete subject. Please try again.')
    }
  }



  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage academic subjects and curriculum
          </p>
        </div>
        {userRole === 'admin' && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Subjects</dt>
                  <dd className="text-lg font-medium text-gray-900">{subjects.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Subjects</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {subjects.filter(subject => subject.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Full Year</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {subjects.filter(subject => subject.duration === 'Full Year').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Teachers</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Set(subjects.map(s => s.teacher)).size}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="Early Childhood">Early Childhood</option>
              <option value="Primary">Primary</option>
              <option value="Junior High">Junior High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading subjects...</span>
        </div>
      )}

      {/* Subjects Grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No subjects found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new subject.</p>
            </div>
          ) : (
            filteredSubjects.map((subject) => (
          <div key={subject.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {subject.name}
                </h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  subject.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subject.status}
                </span>
              </div>

              <div className="mt-4 flex space-x-2">
                {userRole === 'admin' && (
                  <button className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
                {userRole === 'admin' && (
                  <button 
                    onClick={() => handleDelete(subject.id)}
                    className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
            ))
          )}
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Add New Subject</h2>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowAddModal(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <form id="add-subject-form" onSubmit={handleCreateSubject} className="overflow-y-auto p-8 space-y-8">
              {/* Subject Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Subject Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-500" htmlFor="subjectName">Subject Name *</label>
                  <input 
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                    id="subjectName" 
                    placeholder="e.g., Mathematics" 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex justify-end items-center gap-4 p-6 border-t border-gray-200">
              <button 
                type="button"
                className="px-6 py-2 rounded-md text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-blue-50"
                onClick={() => setShowAddModal(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="add-subject-form"
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  'Add Subject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Subjects
