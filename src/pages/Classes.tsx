import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Eye, Users, GraduationCap, BookOpen, Calendar, MapPin, Trash2, AlertTriangle } from 'lucide-react'
import { classUtils, studentUtils, teacherUtils, subjectUtils } from '../utils/firebaseUtils'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

interface Teacher {
  id: string
  fullName: string
  assignedClass?: string
  subjects: string[]
  photoUrl?: string
}

interface Class {
  id: string
  name: string
  value: string
  level: 'Early Childhood' | 'Primary' | 'Junior High'
  ageRange: string
  grade: string
  subdivision?: string // A, B, C, etc. - optional for main classes
  classTeacher: Teacher | null
  room: string
  studentCount: number
  capacity: number
  maxStudents: number
  academicYear: string
  subjects: string[]
  description: string
  createdAt: string
  updatedAt: string
}

interface ClassFormData {
  level: 'Early Childhood' | 'Primary' | 'Junior High'
  grade: string
  subdivision?: string
  classTeacherId: string
  room: string
  maxStudents: number
  academicYear: string
  subjects: string[]
}

interface Student {
  id: string
  name: string
  fullName?: string
  currentClass: string
  email?: string
  phone?: string
  parentName?: string
  parentPhone?: string
}

const Classes = () => {
  const { isTeacher } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [isUpdatingClass, setIsUpdatingClass] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [isCreatingClass, setIsCreatingClass] = useState(false)

  // Class members state - populated when viewing class members
  const [classMembers, setClassMembers] = useState<Student[]>([])

  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completedBatches, setCompletedBatches] = useState<any[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [batchStudents, setBatchStudents] = useState<Student[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<any>(null)
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)

  // Add Class form state (modal)
  const [addForm, setAddForm] = useState<{
    grade: string
    subdivision?: string
    classTeacherId: string
    room: string
    maxStudents: number
    academicYear: string
    subjects: string[]
  }>({
    grade: '',
    subdivision: '',
    classTeacherId: '',
    room: '',
    maxStudents: 30,
    academicYear: '2024-2025',
    subjects: []
  })

  // Edit Class form state (modal)
  const [editForm, setEditForm] = useState<{
    id: string
    grade: string
    subdivision?: string
    classTeacherId: string
    room: string
    maxStudents: number
    academicYear: string
    subjects: string[]
  }>({
    id: '',
    grade: '',
    subdivision: '',
    classTeacherId: '',
    room: '',
    maxStudents: 30,
    academicYear: '2024-2025',
    subjects: []
  })

  // Available subdivisions for the selected grade
  const [availableSubdivisions, setAvailableSubdivisions] = useState<string[]>(['A', 'B', 'C', 'D'])
  const [hasBaseClass, setHasBaseClass] = useState(false) // Track if a base class (no subdivision) exists

  // Function to update available subdivisions based on selected grade
  const updateAvailableSubdivisions = async (grade: string, excludeClassId?: string, currentSubdivision?: string) => {
    try {
      const allClasses = await classUtils.getClasses()
      const gradeClasses = allClasses.filter((cls: any) => cls.grade === grade && (!excludeClassId || cls.id !== excludeClassId))
      
      // Check if a base class (no subdivision) exists for this grade
      const baseClassExists = gradeClasses.some((cls: any) => !cls.subdivision || cls.subdivision.trim() === '')
      setHasBaseClass(baseClassExists)
      
      // If base class exists, subdivisions are not allowed
      if (baseClassExists) {
        setAvailableSubdivisions([])
        return
      }
      
      const usedSubdivisions = gradeClasses
        .map((cls: any) => cls.subdivision)
        .filter((sub: any) => sub && sub.trim() !== '')
      
      const allSubdivisions = ['A', 'B', 'C', 'D']
      let available = allSubdivisions.filter(sub => !usedSubdivisions.includes(sub))
      
      // If we're editing a class and it has a current subdivision, make sure it's available
      if (currentSubdivision && currentSubdivision.trim() !== '' && !available.includes(currentSubdivision)) {
        available = [currentSubdivision, ...available]
      }
      
      setAvailableSubdivisions(available)
    } catch (error) {
      console.error('Error updating available subdivisions:', error)
      setAvailableSubdivisions(['A', 'B', 'C', 'D'])
      setHasBaseClass(false)
    }
  }

  // Debug function to check teacher assignment
  const debugTeacherAssignment = (className: string, classData: any, teachers: Teacher[]) => {
    console.log(`\n=== Debugging Teacher Assignment for ${className} ===`)
    console.log('Class Data:', {
      id: classData.id,
      name: classData.name,
      classTeacherId: classData.classTeacherId,
      classTeacherName: classData.classTeacherName
    })
    console.log('Available Teachers:', teachers.map(t => ({
      id: t.id,
      fullName: t.fullName,
      assignedClass: t.assignedClass
    })))
    
    // Check by classTeacherId
    if (classData.classTeacherId) {
      const teacherById = teachers.find(t => t.id === classData.classTeacherId)
      console.log(`Teacher found by ID (${classData.classTeacherId}):`, teacherById)
    }
    
    // Check by assignedClass matching
    const teacherByAssignedClass = teachers.find(t => 
      t.assignedClass === classData.name || t.assignedClass === classData.value
    )
    console.log(`Teacher found by assignedClass (${classData.name}):`, teacherByAssignedClass)
    console.log('=== End Debug ===\n')
  }

  // Fetch teachers from Firestore
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const firestoreTeachers = await teacherUtils.getTeachers()
        
        // Transform Firestore data to match our Teacher interface
        const transformedTeachers = firestoreTeachers.map((teacher: any) => ({
          id: teacher.id,
          fullName: teacher.fullName,
          assignedClass: teacher.assignedClass || '',
          subjects: teacher.subjects || [],
          photoUrl: teacher.photoUrl || ''
        }))
        
        setTeachers(transformedTeachers)
        console.log('Teachers loaded from Firestore:', transformedTeachers.length)
        console.log('Teachers data:', transformedTeachers.map(t => ({ id: t.id, fullName: t.fullName, assignedClass: t.assignedClass })))
      } catch (error) {
        console.error('Error fetching teachers:', error)
        setTeachers([])
      }
    }

    fetchTeachers()
  }, [])

  // Load subjects from database
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const subjectsData = await subjectUtils.getSubjects()
        setSubjects(subjectsData)
      } catch (error) {
        console.error('Error loading subjects:', error)
      }
    }
    loadSubjects()
  }, [])

  // Fetch classes from Firestore
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true)
        const firestoreClasses = await classUtils.getClasses()
        console.log('Classes loaded from Firestore:', firestoreClasses.length)
        console.log('Classes data:', firestoreClasses.map((c: any) => ({ 
          id: c.id, 
          name: c.name, 
          classTeacherId: c.classTeacherId, 
          classTeacherName: c.classTeacherName 
        })))
        
        // Transform Firestore data to match our Class interface
        const transformedClasses = firestoreClasses.map((cls: any) => {
          // Debug teacher assignment for this class
          debugTeacherAssignment(cls.name, cls, teachers)
          
          // Find the teacher assigned to this class
          // First try to find by classTeacherId, then fallback to assignedClass matching
          let assignedTeacher = null
          
          if (cls.classTeacherId) {
            assignedTeacher = teachers.find(teacher => teacher.id === cls.classTeacherId)
          }
          if (!assignedTeacher) {
            assignedTeacher = teachers.find(teacher => teacher.assignedClass === cls.name || teacher.assignedClass === cls.value)
          }
          
          return {
            id: cls.id,
            name: cls.name,
            value: cls.value,
            level: cls.level,
            ageRange: cls.ageRange,
            grade: cls.grade || cls.name,
            subdivision: cls.subdivision || '',
            classTeacher: assignedTeacher || null,
            room: cls.room || 'TBA',
            studentCount: 0, // Will be calculated from student assignments
            capacity: cls.capacity,
            maxStudents: cls.capacity,
            academicYear: cls.academicYear || '2024-2025',
            subjects: Array.isArray(cls.subjects) ? cls.subjects : [],
            description: cls.description || '',
            createdAt: cls.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: cls.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          }
        })
        
        setClasses(transformedClasses)
        console.log('Classes loaded from Firestore:', transformedClasses.length)
      } catch (error) {
        console.error('Error fetching classes:', error)
        setClasses([])
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [teachers])

  // Fetch completed batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const batches = await studentUtils.getCompletedBatches()
        setCompletedBatches(batches)
      } catch (error) {
        console.error('Error fetching completed batches:', error)
        setCompletedBatches([])
      }
    }
    fetchBatches()
  }, [])

  // Fetch student counts for each class
  useEffect(() => {
    const fetchStudentCounts = async () => {
      if (classes.length === 0) return
      
      try {
        const students = await studentUtils.getStudents()
        
        // Calculate student count for each class
        const updatedClasses = classes.map(cls => {
          const studentCount = students.filter((student: any) => 
            student.assignedClass === cls.value || student.assignedClass === cls.name
          ).length
          
          return {
            ...cls,
            studentCount
          }
        })
        
        setClasses(updatedClasses)
      } catch (error) {
        console.error('Error fetching student counts:', error)
      }
    }

    fetchStudentCounts()
  }, [classes.length > 0])


  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (cls.classTeacher && cls.classTeacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesLevel = levelFilter === 'all' || cls.level === levelFilter
    return matchesSearch && matchesLevel
  }).sort((a, b) => {
    // Define the proper hierarchy order
    const levelOrder = {
      'Early Childhood': 1,
      'Primary': 2,
      'Junior High': 3
    }
    
    // First sort by level
    const levelA = levelOrder[a.level as keyof typeof levelOrder] || 999
    const levelB = levelOrder[b.level as keyof typeof levelOrder] || 999
    
    if (levelA !== levelB) {
      return levelA - levelB
    }
    
    // Within the same level, sort by class name/number
    const getClassNumber = (className: string) => {
      // Extract number from class names for proper sorting
      if (className.includes('Creche')) return 0
      if (className.includes('Nursery 1')) return 1
      if (className.includes('Nursery 2')) return 2
      if (className.includes('Kindergarten 1')) return 3
      if (className.includes('Kindergarten 2')) return 4
      if (className.includes('Primary 1')) return 1
      if (className.includes('Primary 2')) return 2
      if (className.includes('Primary 3')) return 3
      if (className.includes('Primary 4')) return 4
      if (className.includes('Primary 5')) return 5
      if (className.includes('Primary 6')) return 6
      if (className.includes('JHS 1')) return 1
      if (className.includes('JHS 2')) return 2
      if (className.includes('JHS 3')) return 3
      return 999
    }
    
    const numA = getClassNumber(a.name)
    const numB = getClassNumber(b.name)
    
    return numA - numB
  })

  const handleCreateClass = async (formData: ClassFormData) => {
    setIsCreatingClass(true)
    try {
      // Find the selected teacher
      const selectedTeacher = teachers.find(teacher => teacher.id === formData.classTeacherId)

      // Check if trying to create a subdivision when a base class (no subdivision) already exists
      if (formData.subdivision && formData.subdivision.trim() !== '') {
        const existingClasses = await classUtils.getClasses()
        const baseClassExists = existingClasses.some((cls: any) => 
          cls.grade === formData.grade && 
          (!cls.subdivision || cls.subdivision.trim() === '')
        )
        
        if (baseClassExists) {
          alert(`Cannot create a subdivision for ${formData.grade} because a base class (no subdivision) already exists. Please delete the base class first or choose a different grade.`)
          setIsCreatingClass(false)
          return
        }
        
        // Check for duplicate subdivision
        const duplicateSubdivision = existingClasses.find((cls: any) => 
          cls.grade === formData.grade && 
          cls.subdivision === formData.subdivision
        )
        
        if (duplicateSubdivision) {
          alert(`Subdivision ${formData.subdivision} already exists for ${formData.grade}. Please choose a different subdivision.`)
          setIsCreatingClass(false)
          return
        }
      }
      
      // Check if trying to create a base class when subdivisions already exist
      if (!formData.subdivision || formData.subdivision.trim() === '') {
        const existingClasses = await classUtils.getClasses()
        const hasSubdivisions = existingClasses.some((cls: any) => 
          cls.grade === formData.grade && 
          cls.subdivision && 
          cls.subdivision.trim() !== ''
        )
        
        if (hasSubdivisions) {
          alert(`Cannot create a base class (no subdivision) for ${formData.grade} because subdivisions already exist. Please delete all subdivisions first or create a subdivision instead.`)
          setIsCreatingClass(false)
          return
        }
      }

      // Build class payload for Firestore
      const className = formData.subdivision && formData.subdivision.trim() !== '' 
        ? `${formData.grade} ${formData.subdivision}` 
        : formData.grade
      
      const payload = {
        name: className,
        value: className,
        level: formData.level,
        grade: formData.grade,
        subdivision: formData.subdivision && formData.subdivision.trim() !== '' ? formData.subdivision : '',
        room: formData.room || 'TBA',
        capacity: formData.maxStudents,
        academicYear: formData.academicYear,
        subjects: formData.subjects || [],
        description: `${formData.level} ${formData.grade} class`,
        // Reference data to help linking
        classTeacherId: formData.classTeacherId || '',
        classTeacherName: selectedTeacher?.fullName || '',
        classTeacher: selectedTeacher ? selectedTeacher : null
      }

      // Persist to Firestore
      const newId = await classUtils.createClass(payload)
      
      // Create subcollection for subdivision if subdivision is selected
      if (formData.subdivision && formData.subdivision.trim() !== '') {
        await classUtils.createSubdivisionSubcollection(String(newId), formData.subdivision)
      }
      
      // Update teacher's assignedClass field if a teacher was selected
      if (formData.classTeacherId && selectedTeacher) {
        await teacherUtils.updateTeacher(formData.classTeacherId, {
          assignedClass: className
        })
      }

      const newClass: Class = {
        id: String(newId),
        name: payload.name,
        value: payload.value,
        level: payload.level,
        ageRange: 'TBA',
        grade: payload.grade,
        subdivision: payload.subdivision,
        classTeacher: selectedTeacher ? selectedTeacher : null,
        room: payload.room,
        studentCount: 0,
        capacity: payload.capacity,
        maxStudents: payload.capacity,
        academicYear: payload.academicYear,
        subjects: payload.subjects,
        description: payload.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setClasses(prev => [...prev, newClass])
      setShowAddModal(false)
    } catch (error) {
      console.error('Error creating class:', error)
      alert('Failed to create class. Please try again.')
    } finally {
      setIsCreatingClass(false)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Primary': return 'bg-blue-100 text-blue-800'
      case 'JHS': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const primaryClasses = classes.filter(cls => cls.level === 'Primary')
  const jhsClasses = classes.filter(cls => cls.level === 'Junior High')
  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0)

  const handleViewMembers = async (cls: Class) => {
    setSelectedClass(cls)
    setShowMembersModal(true)
    
    // Fetch real students for this class
    try {
      const students = await studentUtils.getStudents()
      const classStudents = students.filter((student: any) => 
        student.assignedClass === cls.value || student.assignedClass === cls.name
      ).map((student: any) => ({
        id: student.id,
        name: student.fullName || student.name,
        currentClass: cls.name,
        email: '', // Students don't have email in our structure
        phone: student.contactNumber || student.phone || '',
        parentName: student.guardianName || student.parentName || '',
        parentPhone: student.guardianContact || student.parentPhone || '',
      }))
      
      setClassMembers(classStudents)
    } catch (error) {
      console.error('Error fetching class members:', error)
      setClassMembers([])
    }
  }

  const handleEditClass = (cls: Class) => {
    setEditForm({
      id: cls.id,
      grade: cls.grade || '',
      subdivision: cls.subdivision || '',
      classTeacherId: cls.classTeacher?.id || '',
      room: cls.room || '',
      maxStudents: cls.maxStudents || 30,
      academicYear: cls.academicYear || '2024-2025',
      subjects: cls.subjects || []
    })
    // Update available subdivisions for the current grade
    if (cls.grade) {
      updateAvailableSubdivisions(cls.grade, cls.id, cls.subdivision)
    }
    // Reset states
    setIsUpdatingClass(false)
    setUpdateSuccess(false)
    setShowEditModal(true)
  }

  const handleDeleteClick = (cls: Class) => {
    setClassToDelete(cls)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!classToDelete) return

    setIsDeleting(true)
    try {
      await classUtils.deleteClass(classToDelete.id)
      
      // Remove from local state
      setClasses(prev => prev.filter(cls => cls.id !== classToDelete.id))
      
      // Close modal
      setShowDeleteModal(false)
      setClassToDelete(null)
      
      alert(`Class "${classToDelete.name}" deleted successfully.`)
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Failed to delete class. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteBatchClick = (batch: any) => {
    setBatchToDelete(batch)
    setShowDeleteBatchModal(true)
  }

  const handleConfirmDeleteBatch = async () => {
    if (!batchToDelete) return

    setIsDeletingBatch(true)
    try {
      // Delete all students in the batch subcollection
      const batchStudents = await studentUtils.getBatchStudents(batchToDelete.batchYear)
      const deleteStudentPromises = batchStudents.map(async (student: any) => {
        const studentRef = doc(db, 'completedBatches', batchToDelete.batchYear, 'students', student.id)
        await deleteDoc(studentRef)
      })
      await Promise.all(deleteStudentPromises)

      // Delete the batch summary document
      const batchRef = doc(db, 'completedBatches', batchToDelete.batchYear)
      await deleteDoc(batchRef)

      // Remove from local state
      setCompletedBatches(prev => prev.filter(batch => batch.id !== batchToDelete.id))
      
      // Close modal
      setShowDeleteBatchModal(false)
      setBatchToDelete(null)
      
      alert(`Batch "${batchToDelete.batchYear} Batch" deleted successfully.`)
    } catch (error) {
      console.error('Error deleting batch:', error)
      alert('Failed to delete batch. Please try again.')
    } finally {
      setIsDeletingBatch(false)
    }
  }

  const handleUpdateClassData = async () => {
    try {
      setIsUpdatingClass(true)
      // Find the selected teacher
      const selectedTeacher = teachers.find(teacher => teacher.id === editForm.classTeacherId)
      
      // Check for duplicate subdivision if subdivision is selected
      if (editForm.subdivision && editForm.subdivision.trim() !== '') {
        const existingClasses = await classUtils.getClasses()
        const duplicateSubdivision = existingClasses.find((cls: any) => 
          cls.grade === editForm.grade && 
          cls.subdivision === editForm.subdivision && 
          cls.id !== editForm.id
        )
        
        if (duplicateSubdivision) {
          alert(`Subdivision ${editForm.subdivision} already exists for ${editForm.grade}. Please choose a different subdivision.`)
          setIsUpdatingClass(false)
          return
        }
      }
      
      // Generate class name based on grade and subdivision
      const level: "Early Childhood" | "Primary" | "Junior High" = editForm.grade.includes('Creche') || editForm.grade.includes('Nursery') || editForm.grade.includes('Kindergarten') 
        ? 'Early Childhood' 
        : editForm.grade.includes('Primary') 
        ? 'Primary' 
        : 'Junior High'
      
      const className = editForm.subdivision && editForm.subdivision.trim() !== '' 
        ? `${editForm.grade} ${editForm.subdivision}` 
        : editForm.grade
      
      // Build updated class data
      const updatedClassData = {
        name: className,
        value: className,
        level: level,
        grade: editForm.grade,
        subdivision: editForm.subdivision && editForm.subdivision.trim() !== '' ? editForm.subdivision : '',
        room: editForm.room,
        maxStudents: editForm.maxStudents,
        academicYear: editForm.academicYear,
        subjects: editForm.subjects,
        classTeacher: selectedTeacher ? selectedTeacher : null,
        classTeacherId: editForm.classTeacherId,
        classTeacherName: selectedTeacher?.fullName || '',
        updatedAt: new Date().toISOString()
      }

      // Update in Firestore
      await classUtils.updateClass(editForm.id, updatedClassData)
      
      // Handle subdivision subcollection updates
      if (editForm.subdivision && editForm.subdivision.trim() !== '') {
        // Create or update subcollection for subdivision
        await classUtils.createSubdivisionSubcollection(editForm.id, editForm.subdivision)
      }
      // Note: If subdivision is removed (set to empty), we keep the existing subcollection
      // This allows for potential future subdivision reassignment
      
      // Update teacher's assignedClass field if a teacher was selected
      if (editForm.classTeacherId && selectedTeacher) {
        await teacherUtils.updateTeacher(editForm.classTeacherId, {
          assignedClass: className
        })
      }

      // Update local state
      setClasses(prev => prev.map(cls => 
        cls.id === editForm.id 
          ? { 
              ...cls, 
              name: updatedClassData.name,
              value: updatedClassData.value,
              level: updatedClassData.level,
              grade: updatedClassData.grade,
              subdivision: updatedClassData.subdivision,
              room: updatedClassData.room,
              maxStudents: updatedClassData.maxStudents,
              academicYear: updatedClassData.academicYear,
              subjects: updatedClassData.subjects,
              classTeacher: updatedClassData.classTeacher,
              classTeacherId: updatedClassData.classTeacherId,
              classTeacherName: updatedClassData.classTeacherName,
              updatedAt: updatedClassData.updatedAt
            }
          : cls
      ))

      setUpdateSuccess(true)
      setTimeout(() => {
        setShowEditModal(false)
        setUpdateSuccess(false)
      }, 1500) // Show success message for 1.5 seconds before closing
    } catch (error) {
      console.error('Error updating class:', error)
      alert('Failed to update class. Please try again.')
    } finally {
      setIsUpdatingClass(false)
    }
  }

  const filteredMembers = classMembers.filter(member =>
    member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) &&
    member.currentClass === selectedClass?.name
  )

  // Redirect teachers away from the admin Classes page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student classes and groupings (Creche to JHS 3)
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </button>
        </div>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Classes</dt>
                  <dd className="text-lg font-medium text-gray-900">{classes.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Students</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalStudents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Primary Classes</dt>
                  <dd className="text-lg font-medium text-gray-900">{primaryClasses.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">JHS Classes</dt>
                  <dd className="text-lg font-medium text-gray-900">{jhsClasses.length}</dd>
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
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
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
          <span className="ml-3 text-gray-600">Loading classes...</span>
        </div>
      )}

      {/* Educational Hierarchy Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Educational Hierarchy</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">Early Childhood</div>
              <div className="text-sm text-blue-800">Creche → Nursery → Kindergarten</div>
              <div className="text-xs text-blue-600 mt-1">Ages 6 months - 6 years</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Primary</div>
              <div className="text-sm text-green-800">Primary 1 → Primary 6</div>
              <div className="text-xs text-green-600 mt-1">Ages 6 - 12 years</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">Junior High</div>
              <div className="text-sm text-purple-800">JHS 1 → JHS 2 → JHS 3</div>
              <div className="text-xs text-purple-600 mt-1">Ages 12 - 15 years</div>
            </div>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
            </div>
          ) : (
            filteredClasses.map((cls) => (
          <div key={cls.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {cls.name}
                </h3>
                <div className="flex space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(cls.level)}`}>
                    {cls.level}
                  </span>
                </div>
              </div>
              
              <p className="mt-1 text-sm text-gray-500">{cls.grade}</p>
              <p className="text-sm text-gray-600">
                Class Teacher: {cls.classTeacher ? cls.classTeacher.fullName : 'Not Assigned'}
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-2" />
                  {cls.room}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-2" />
                  {cls.studentCount}/{cls.maxStudents} students
                </div>
              </div>

              {/* Subjects */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Subjects:</p>
                <div className="flex flex-wrap gap-1">
                  {cls.subjects && cls.subjects.length > 0 ? (
                    <>
                      {cls.subjects.slice(0, 3).map((subject, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {subject}
                        </span>
                      ))}
                      {cls.subjects.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{cls.subjects.length - 3} more
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      No subjects assigned
                    </span>
                  )}
                </div>
              </div>


              <div className="mt-4 flex space-x-2">
                <button 
                  onClick={() => handleViewMembers(cls)}
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>
                <button 
                  onClick={() => handleEditClass(cls)}
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteClick(cls)}
                  className="inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
            ))
          )}
        </div>
      )}

      {/* Completed Batches Section */}
      {completedBatches.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Completed Batches</h3>
            <p className="mt-1 text-sm text-gray-500">Graduated JHS 3 students by year</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-purple-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-purple-900">
                      {batch.batchYear} Batch
                    </h4>
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Students:</span>
                      <span className="font-semibold text-purple-700">
                        {batch.studentCount || batch.studentIds?.length || 0}
                      </span>
                    </div>
                    {batch.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-semibold text-gray-700">
                          {new Date(batch.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const students = await studentUtils.getBatchStudents(batch.batchYear)
                          setBatchStudents(students)
                          setSelectedBatch(batch)
                          setShowBatchModal(true)
                        } catch (error) {
                          console.error('Error fetching batch students:', error)
                          alert('Failed to load batch students')
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Students
                    </button>
                    <button
                      onClick={() => handleDeleteBatchClick(batch)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batch Students Modal */}
      {showBatchModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {selectedBatch.batchYear} Batch
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {batchStudents.length} graduated students
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setShowBatchModal(false)
                  setSelectedBatch(null)
                  setBatchStudents([])
                }}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchStudents.map((student) => (
                  <div
                    key={student.id}
                    className="border border-purple-200 rounded-lg p-4 bg-purple-50"
                  >
                    <h3 className="font-semibold text-purple-900">
                      {student.fullName || student.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Batch: {selectedBatch.batchYear}
                    </p>
                  </div>
                ))}
                {batchStudents.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No students found in this batch
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setShowBatchModal(false)
                  setSelectedBatch(null)
                  setBatchStudents([])
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Add New Class</h2>
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
            <div className="overflow-y-auto p-8 space-y-8">
              {/* Class Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Class Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="classTeacher">Class Teacher</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" id="classTeacher" value={addForm.classTeacherId} onChange={(e) => setAddForm(prev => ({...prev, classTeacherId: e.target.value}))}>
                      <option value="">Select Teacher (Optional)</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Can be assigned later using edit</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="maxStudents">Max Class Number</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="maxStudents" 
                      placeholder="30" 
                      type="number"
                      min="1"
                      value={addForm.maxStudents}
                      onChange={(e) => setAddForm(prev => ({...prev, maxStudents: Math.max(1, Number(e.target.value || 0))}))}
                    />
                    <p className="mt-1 text-xs text-gray-500">Can be exceeded without restriction</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="grade">Grade</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" id="grade" value={addForm.grade} onChange={(e) => {
                      setAddForm(prev => ({...prev, grade: e.target.value, subdivision: ''}))
                      updateAvailableSubdivisions(e.target.value)
                    }}>
                      <option value="">Select Grade</option>
                      <optgroup label="Early Childhood">
                        <option value="Creche">Creche</option>
                        <option value="Nursery 1">Nursery 1</option>
                        <option value="Nursery 2">Nursery 2</option>
                        <option value="Kindergarten 1">Kindergarten 1</option>
                        <option value="Kindergarten 2">Kindergarten 2</option>
                      </optgroup>
                      <optgroup label="Primary">
                        <option value="Primary 1">Primary 1</option>
                        <option value="Primary 2">Primary 2</option>
                        <option value="Primary 3">Primary 3</option>
                        <option value="Primary 4">Primary 4</option>
                        <option value="Primary 5">Primary 5</option>
                        <option value="Primary 6">Primary 6</option>
                      </optgroup>
                      <optgroup label="Junior High">
                        <option value="JHS 1">JHS 1</option>
                        <option value="JHS 2">JHS 2</option>
                        <option value="JHS 3">JHS 3</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="room">Room</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="room" 
                      placeholder="e.g., Room 101" 
                      type="text"
                      value={addForm.room}
                      onChange={(e) => setAddForm(prev => ({...prev, room: e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="subdivision">Subdivision (Optional)</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                      id="subdivision"
                      value={addForm.subdivision || ''}
                      onChange={(e) => setAddForm(prev => ({...prev, subdivision: e.target.value}))}
                      disabled={!addForm.grade || hasBaseClass}
                    >
                      <option value="">No subdivision</option>
                      {availableSubdivisions.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    {!addForm.grade && (
                      <p className="mt-1 text-xs text-gray-500">Please select a grade first</p>
                    )}
                    {addForm.grade && hasBaseClass && (
                      <p className="mt-1 text-xs text-red-500">⚠️ A base class (no subdivision) already exists for this grade. Subdivisions cannot be created.</p>
                    )}
                    {addForm.grade && !hasBaseClass && availableSubdivisions.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">All subdivisions are already used for this grade</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject Selection */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-700">Assigned Subject(s) * (Multiple Selection)</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  {subjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {subjects.map((subject) => (
                        <label key={subject.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            checked={addForm.subjects.includes(subject.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddForm(prev => ({
                                  ...prev,
                                  subjects: [...prev.subjects, subject.name]
                                }))
                              } else {
                                setAddForm(prev => ({
                                  ...prev,
                                  subjects: prev.subjects.filter(s => s !== subject.name)
                                }))
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No subjects found. Please add subjects first.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-4 p-6 border-t border-gray-200">
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-blue-50"
                onClick={() => setShowAddModal(false)}
                disabled={isCreatingClass}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                onClick={() => {
                  const formData: ClassFormData = {
                    level: addForm.grade.includes('Primary') ? 'Primary' : 
                           addForm.grade.includes('JHS') ? 'Junior High' : 'Early Childhood',
                    grade: addForm.grade,
                    subdivision: addForm.subdivision,
                    classTeacherId: addForm.classTeacherId,
                    room: addForm.room,
                    maxStudents: addForm.maxStudents,
                    academicYear: addForm.academicYear,
                    subjects: addForm.subjects
                  }
                  handleCreateClass(formData)
                }}
                disabled={isCreatingClass}
              >
                {isCreatingClass ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Save Class'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Edit Class</h2>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowEditModal(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-8 space-y-8">
              {/* Status Information */}
              {(isUpdatingClass || updateSuccess) && (
                <div className={`border rounded-lg p-4 ${
                  isUpdatingClass 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${
                    isUpdatingClass ? 'text-blue-800' : 'text-green-800'
                  }`}>
                    {isUpdatingClass ? 'Updating Class...' : 'Class Updated Successfully!'}
                  </h4>
                  <div className={`text-xs ${
                    isUpdatingClass ? 'text-blue-700' : 'text-green-700'
                  }`}>
                    {isUpdatingClass ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Please wait while we update the class...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Class has been updated successfully! Closing modal...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Class Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Class Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editClassTeacher">Class Teacher</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editClassTeacher" 
                      value={editForm.classTeacherId} 
                      onChange={(e) => setEditForm(prev => ({...prev, classTeacherId: e.target.value}))}
                    >
                      <option value="">Select Teacher (Optional)</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Can be assigned later using edit</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editMaxStudents">Max Class Number</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editMaxStudents" 
                      placeholder="30" 
                      type="number"
                      min="1"
                      value={editForm.maxStudents}
                      onChange={(e) => setEditForm(prev => ({...prev, maxStudents: Math.max(1, Number(e.target.value || 0))}))}
                    />
                    <p className="mt-1 text-xs text-gray-500">Can be exceeded without restriction</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editGrade">Grade</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editGrade" 
                      value={editForm.grade} 
                      onChange={(e) => {
                        setEditForm(prev => ({...prev, grade: e.target.value, subdivision: ''}))
                        updateAvailableSubdivisions(e.target.value, editForm.id, '')
                      }}
                    >
                      <option value="">Select Grade</option>
                      <optgroup label="Early Childhood">
                        <option value="Creche">Creche</option>
                        <option value="Nursery 1">Nursery 1</option>
                        <option value="Nursery 2">Nursery 2</option>
                        <option value="Kindergarten 1">Kindergarten 1</option>
                        <option value="Kindergarten 2">Kindergarten 2</option>
                      </optgroup>
                      <optgroup label="Primary">
                        <option value="Primary 1">Primary 1</option>
                        <option value="Primary 2">Primary 2</option>
                        <option value="Primary 3">Primary 3</option>
                        <option value="Primary 4">Primary 4</option>
                        <option value="Primary 5">Primary 5</option>
                        <option value="Primary 6">Primary 6</option>
                      </optgroup>
                      <optgroup label="Junior High">
                        <option value="JHS 1">JHS 1</option>
                        <option value="JHS 2">JHS 2</option>
                        <option value="JHS 3">JHS 3</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editRoom">Room</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editRoom" 
                      placeholder="e.g., Room 101" 
                      type="text"
                      value={editForm.room}
                      onChange={(e) => setEditForm(prev => ({...prev, room: e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editSubdivision">Subdivision (Optional)</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editSubdivision"
                      value={editForm.subdivision || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, subdivision: e.target.value}))}
                      disabled={!editForm.grade}
                    >
                      <option value="">No subdivision</option>
                      {availableSubdivisions.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    {!editForm.grade && (
                      <p className="mt-1 text-xs text-gray-500">Please select a grade first</p>
                    )}
                    {editForm.grade && availableSubdivisions.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">All subdivisions are already used for this grade</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject Selection */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-700">Assigned Subject(s) * (Multiple Selection)</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  {subjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {subjects.map((subject) => (
                        <label key={subject.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            checked={editForm.subjects.includes(subject.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm(prev => ({
                                  ...prev,
                                  subjects: [...prev.subjects, subject.name]
                                }))
                              } else {
                                setEditForm(prev => ({
                                  ...prev,
                                  subjects: prev.subjects.filter(s => s !== subject.name)
                                }))
                              }
                            }}
                          />
                          <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No subjects found. Please add subjects first.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* For School Use Only */}
              <div className="space-y-6 bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-blue-200 pb-2">For School Use Only</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editClassId">Class ID</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editClassId" 
                      placeholder="Auto-generated" 
                      type="text"
                      value={editForm.id}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editAcademicYear">Academic Year</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editAcademicYear" 
                      placeholder="2024-2025" 
                      type="text"
                      value={editForm.academicYear}
                      onChange={(e) => setEditForm(prev => ({...prev, academicYear: e.target.value}))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-4 p-6 border-t border-gray-200">
              <button 
                className={`px-6 py-2 rounded-md text-sm font-semibold ${
                  isUpdatingClass 
                    ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed' 
                    : 'text-gray-500 bg-gray-50 border-gray-300 hover:bg-blue-50'
                }`}
                onClick={() => setShowEditModal(false)}
                disabled={isUpdatingClass}
              >
                Cancel
              </button>
              <button 
                className={`px-6 py-2 rounded-md text-sm font-semibold text-white ${
                  isUpdatingClass 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={handleUpdateClassData}
                disabled={isUpdatingClass}
              >
                {isUpdatingClass ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </div>
                ) : (
                  'Update Class'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Members Modal */}
      {showMembersModal && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedClass.name} Members</h2>
                <p className="mt-1 text-sm text-gray-500">Manage students in {selectedClass.name}.</p>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowMembersModal(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  className="w-full rounded border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600" 
                  placeholder="Search students by name..." 
                  type="text"
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Members Table */}
            <div className="flex-1 overflow-hidden">
              <div className="overflow-x-auto h-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500" scope="col">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500" scope="col">Current Class</th>
                      <th className="relative px-6 py-3" scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                            {member.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {member.currentClass}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                            <span className="text-base">✏️</span>
                            Edit Class
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                          No students found in this class.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Showing {filteredMembers.length} of {classMembers.filter(m => m.currentClass === selectedClass.name).length} students
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setShowMembersModal(false)}
                >
                  Close
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  Export List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {showDeleteModal && classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Class</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{classToDelete.name}"</span>?
              </p>
              {classToDelete.studentCount > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Warning: This class has {classToDelete.studentCount} student(s). Deleting this class may affect student records.
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setClassToDelete(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Class
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      {showDeleteBatchModal && batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Completed Batch</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{batchToDelete.batchYear} Batch"</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Warning: This will permanently delete {batchToDelete.studentCount || batchToDelete.studentIds?.length || 0} graduated student record(s). This action cannot be reversed.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteBatchModal(false)
                  setBatchToDelete(null)
                }}
                disabled={isDeletingBatch}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteBatch}
                disabled={isDeletingBatch}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingBatch ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Batch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Classes

