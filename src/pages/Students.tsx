import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { CLASS_OPTIONS_WITH_LABELS, CLASS_LEVELS } from '../constants/classes'
import { studentUtils, storageUtils, classUtils } from '../utils/firebaseUtils'
import { formatDate } from '../utils/dateUtils'
import StudentHistoryModal from '../components/StudentHistoryModal'
import type { Student } from '../types/student'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

// Function to sort classes in ascending order
const sortClassesAscending = (classes: any[]) => {
  return [...classes].sort((a, b) => {
    const nameA = a.name || a.value || ''
    const nameB = b.name || b.value || ''
    
    // Extract base class name (remove subdivisions like "A", "B")
    const baseA = nameA.split(' ').slice(0, -1).join(' ') || nameA
    const baseB = nameB.split(' ').slice(0, -1).join(' ') || nameB
    
    // Find index in CLASS_LEVELS
    const indexA = CLASS_LEVELS.findIndex(cls => baseA.includes(cls.value) || cls.value === baseA)
    const indexB = CLASS_LEVELS.findIndex(cls => baseB.includes(cls.value) || cls.value === baseB)
    
    // If both found, sort by index
    if (indexA !== -1 && indexB !== -1) {
      if (indexA !== indexB) {
        return indexA - indexB
      }
      // If same base class, sort by subdivision
      return nameA.localeCompare(nameB)
    }
    
    // If one not found, put found ones first
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    
    // If neither found, sort alphabetically
    return nameA.localeCompare(nameB)
  })
}

const Students = () => {
  const { isTeacher } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [classFilter, setClassFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // Form state for student creation
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    birthPlace: '',
    nationality: '',
    religion: '',
    address: '',
    prevSchool: '',
    lastClass: '',
    specialNeeds: '',
    guardianName: '',
    relationship: '',
    occupation: '',
    guardianContact: '',
    guardianAddress: '',
    admissionNumber: '',
    assignedClass: '',
    house: '',
    photoUrl: ''
  })

  // Form state for student editing
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    birthPlace: '',
    nationality: 'Ghanaian',
    religion: '',
    address: '',
    prevSchool: '',
    lastClass: '',
    specialNeeds: '',
    guardianName: '',
    relationship: '',
    occupation: '',
    guardianContact: '',
    guardianAddress: '',
    admissionNumber: '',
    assignedClass: '',
    house: '',
    photoUrl: ''
  })

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({})

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Image upload state for editing
  const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Students data from Firestore
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])

  // Load classes from database
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classesData = await classUtils.getClasses()
        setClasses(classesData)
      } catch (error) {
        console.error('Error loading classes:', error)
      }
    }
    loadClasses()
  }, [])

  // Fetch students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        const firestoreStudents = await studentUtils.getStudents()
        
        // Transform Firestore data to match our Student interface
        const transformedStudents = firestoreStudents.map((student: any) => ({
          id: student.id,
          name: student.fullName || student.name,
          grade: student.grade || student.assignedClass || '',
          class: student.class || student.assignedClass || '',
          enrollmentDate: student.enrollmentDate || new Date().toISOString().split('T')[0],
          status: student.status || 'active',
          balance: student.balance || 0,
          lastPaymentDate: student.lastPaymentDate || '',
          parentName: student.guardianName || student.parentName || '',
          parentPhone: student.guardianContact || student.parentPhone || '',
          address: student.address || '',
          createdAt: student.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: student.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          // Detailed information
          fullName: student.fullName || student.name,
          dob: student.dob || '',
          gender: student.gender || '',
          birthPlace: student.birthPlace || '',
          nationality: student.nationality || 'Ghanaian',
          religion: student.religion || '',
          prevSchool: student.prevSchool || '',
          lastClass: student.lastClass || '',
          specialNeeds: student.specialNeeds || '',
          guardianName: student.guardianName || '',
          relationship: student.relationship || '',
          occupation: student.occupation || '',
          guardianContact: student.guardianContact || '',
          guardianAddress: student.guardianAddress || '',
          admissionNumber: student.admissionNumber || '',
          assignedClass: student.assignedClass || '',
          house: student.house || '',
          photoUrl: student.photoUrl || null
        }))
        
        setStudents(transformedStudents)
        console.log('Students loaded from Firestore:', transformedStudents.length)
      } catch (error) {
        console.error('Error fetching students:', error)
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])


  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.guardianContact?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Check class filter
    const matchesClass = classFilter === 'all' || student.grade === classFilter
    
    // If no filters selected, show all students
    if (selectedFilters.length === 0) {
      return matchesSearch && matchesClass
    }
    
    // Separate payment filters from level filters
    const paymentFilters = selectedFilters.filter(f => f === 'owing' || f === 'paid')
    const levelFilters = selectedFilters.filter(f => f === 'early-childhood' || f === 'primary' || f === 'jhs')
    
    // Check payment filters (mutually exclusive, so only one can be selected)
    const matchesPayment = paymentFilters.length === 0 || paymentFilters.some(filter => {
      switch (filter) {
        case 'owing':
          return student.balance > 0
        case 'paid':
          return student.balance === 0
        default:
          return false
      }
    })
    
    // Check level filters (if any level filter is selected, student must match at least one)
    const matchesLevel = levelFilters.length === 0 || levelFilters.some(filter => {
      switch (filter) {
        case 'early-childhood':
          return student.grade.startsWith('Creche') || 
                 student.grade.startsWith('Nursery') || 
                 student.grade.startsWith('Kindergarten')
        case 'primary':
          return student.grade.startsWith('Primary')
        case 'jhs':
          return student.grade.startsWith('JHS')
        default:
          return false
      }
    })
    
    // Use AND logic: student must match search, class, payment, AND level filters
    return matchesSearch && matchesClass && matchesPayment && matchesLevel
  }).sort((a, b) => {
    // Sort alphabetically by name (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  })

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => {
      // Handle mutual exclusivity for payment filters
      if (filter === 'owing' || filter === 'paid') {
        // If clicking the same filter, toggle it off
        if (prev.includes(filter)) {
          return prev.filter(f => f !== filter)
        }
        // If clicking a different payment filter, replace it
        const otherPaymentFilter = filter === 'owing' ? 'paid' : 'owing'
        return prev.filter(f => f !== otherPaymentFilter).concat(filter)
      }
      
      // For other filters, use normal toggle behavior
      return prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    })
  }

  const clearClassFilter = () => {
    setClassFilter('all')
  }

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student)
    setShowDetailModal(true)
  }

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowDetailModal(false)
    setShowEditModal(true)
    
    // Populate edit form with student data
    setEditFormData({
      fullName: student.fullName || student.name,
      dob: student.dob || '',
      gender: student.gender || '',
      birthPlace: student.birthPlace || '',
      nationality: student.nationality || 'Ghanaian',
      religion: student.religion || '',
      address: student.address || '',
      prevSchool: student.prevSchool || '',
      lastClass: student.lastClass || '',
      specialNeeds: student.specialNeeds || '',
      guardianName: student.guardianName || student.parentName,
      relationship: student.relationship || '',
      occupation: student.occupation || '',
      guardianContact: student.guardianContact || student.parentPhone,
      guardianAddress: student.guardianAddress || student.address,
      admissionNumber: student.admissionNumber || '',
      assignedClass: student.assignedClass || student.class,
      house: student.house || '',
      photoUrl: student.photoUrl || ''
    })
    
    // Set image preview if student has a photo
    if (student.photoUrl) {
      setEditImagePreview(student.photoUrl)
    } else {
      setEditImagePreview(null)
    }
    setEditSelectedImage(null)
  }

  const handleViewHistory = (student: Student) => {
    setSelectedStudent(student)
    setShowDetailModal(false)
    setShowHistoryModal(true)
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file')
        return
      }
      
      // Validate file size (1MB max)
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB')
        return
      }
      
      setSelectedImage(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle image upload for editing
  const handleEditImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file')
        return
      }
      
      // Validate file size (1MB max)
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB')
        return
      }
      
      setEditSelectedImage(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Validation function
  const validateForm = () => {
    const requiredFields = ['fullName', 'dob', 'gender', 'birthPlace', 'religion', 'address', 'guardianName', 'relationship', 'occupation', 'guardianContact']
    const errors: {[key: string]: boolean} = {}
    let isValid = true

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]?.trim()) {
        errors[field] = true
        isValid = false
      }
    })

    setValidationErrors(errors)
    return isValid
  }

  // Validation function for editing
  const validateEditForm = () => {
    const requiredFields = ['fullName', 'dob', 'gender', 'birthPlace', 'religion', 'address', 'guardianName', 'relationship', 'occupation', 'guardianContact']
    const errors: {[key: string]: boolean} = {}
    let isValid = true

    requiredFields.forEach(field => {
      if (!editFormData[field as keyof typeof editFormData]?.trim()) {
        errors[field] = true
        isValid = false
      }
    })

    setValidationErrors(errors)
    return isValid
  }

  // Backend-ready functions
  const handleCreateStudent = async () => {
    // Validate required fields
    if (!validateForm()) {
      alert('Please fill in all required fields (marked with *)')
      return
    }

    setIsCreating(true)
    try {
      // Upload photo to Firebase Storage if selected
      let photoUrl = ''
      if (selectedImage) {
        try {
          // Generate a unique file path for the student
          const timestamp = Date.now()
          const sanitizedFileName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `profile-photos/students/${timestamp}_${sanitizedFileName}`
          photoUrl = await storageUtils.uploadFile(selectedImage, filePath)
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError)
          alert('Failed to upload photo. Please try again.')
          return
        }
      }

      // Create student in Firestore
      const studentData = {
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
        birthPlace: formData.birthPlace,
        nationality: formData.nationality,
        religion: formData.religion,
        address: formData.address,
        prevSchool: formData.prevSchool,
        lastClass: formData.lastClass,
        specialNeeds: formData.specialNeeds,
        guardianName: formData.guardianName,
        relationship: formData.relationship,
        occupation: formData.occupation,
        guardianContact: formData.guardianContact,
        guardianAddress: formData.guardianAddress,
        admissionNumber: formData.admissionNumber,
        assignedClass: formData.assignedClass,
        house: formData.house,
        photoUrl: photoUrl,
        grade: formData.assignedClass || '',
        class: formData.assignedClass || '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active' as const,
        balance: 0,
        lastPaymentDate: ''
      }

      const studentId = await studentUtils.createStudent(studentData)
      
      // Add to local state
      const newStudent: Student = {
        id: studentId,
        name: formData.fullName,
        grade: formData.assignedClass || '',
        class: formData.assignedClass || '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active' as const,
        balance: 0,
        lastPaymentDate: '',
        parentName: formData.guardianName,
        parentPhone: formData.guardianContact,
        address: formData.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Additional fields
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
        birthPlace: formData.birthPlace,
        nationality: formData.nationality,
        religion: formData.religion,
        prevSchool: formData.prevSchool,
        lastClass: formData.lastClass,
        specialNeeds: formData.specialNeeds,
        guardianName: formData.guardianName,
        relationship: formData.relationship,
        occupation: formData.occupation,
        guardianContact: formData.guardianContact,
        guardianAddress: formData.guardianAddress,
        admissionNumber: formData.admissionNumber,
        assignedClass: formData.assignedClass,
        house: formData.house,
        photoUrl: photoUrl
      }

      setStudents(prev => [...prev, newStudent])
      setShowAddModal(false)
      
      console.log('Student created successfully:', newStudent.fullName)
      
      // Reset form
      setFormData({
        fullName: '',
        dob: '',
        gender: '',
        birthPlace: '',
        nationality: '',
        religion: '',
        address: '',
        prevSchool: '',
        lastClass: '',
        specialNeeds: '',
        guardianName: '',
        relationship: '',
        occupation: '',
        guardianContact: '',
        guardianAddress: '',
        admissionNumber: '',
        assignedClass: '',
        house: '',
        photoUrl: ''
      })
      setValidationErrors({})
      setSelectedImage(null)
      setImagePreview(null)
      
      alert('Student created successfully!')
    } catch (error) {
      console.error('Error creating student:', error)
      alert('Failed to create student. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  // Handle updating student from edit form
  const handleUpdateStudentFromEdit = async () => {
    if (!selectedStudent) return

    // Validate required fields
    if (!validateEditForm()) {
      alert('Please fill in all required fields (marked with *)')
      return
    }

    setIsUpdating(true)
    try {
      // Upload new photo to Firebase Storage if selected (replaces existing)
      let photoUrl = editFormData.photoUrl // Keep existing photo URL
      if (editSelectedImage) {
        try {
          // Delete old image if it exists
          if (editFormData.photoUrl) {
            await storageUtils.deleteOldImage(editFormData.photoUrl)
          }
          
          // Generate a unique file path for the student (replaces old image)
          const timestamp = Date.now()
          const sanitizedFileName = editSelectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `students/${timestamp}_${sanitizedFileName}`
          photoUrl = await storageUtils.uploadFile(editSelectedImage, filePath)
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError)
          alert('Failed to upload photo. Please try again.')
          return
        }
      }

      // Update student in Firestore
      const studentData = {
        fullName: editFormData.fullName,
        dob: editFormData.dob,
        gender: editFormData.gender,
        birthPlace: editFormData.birthPlace,
        nationality: editFormData.nationality,
        religion: editFormData.religion,
        address: editFormData.address,
        prevSchool: editFormData.prevSchool,
        lastClass: editFormData.lastClass,
        specialNeeds: editFormData.specialNeeds,
        guardianName: editFormData.guardianName,
        relationship: editFormData.relationship,
        occupation: editFormData.occupation,
        guardianContact: editFormData.guardianContact,
        guardianAddress: editFormData.guardianAddress,
        admissionNumber: editFormData.admissionNumber,
        assignedClass: editFormData.assignedClass,
        house: editFormData.house,
        photoUrl: photoUrl,
        grade: editFormData.assignedClass || '',
        class: editFormData.assignedClass || '',
        updatedAt: new Date().toISOString()
      }

      // Update in Firestore
      await studentUtils.updateStudent(selectedStudent.id, studentData)
      
      // Update local state
      setStudents(prev => prev.map(student => 
        student.id === selectedStudent.id 
          ? { 
              ...student, 
              ...studentData,
              name: editFormData.fullName,
              parentName: editFormData.guardianName,
              parentPhone: editFormData.guardianContact,
              photoUrl: photoUrl
            }
          : student
      ))

      // Update selected student for detail view
      setSelectedStudent(prev => prev ? {
        ...prev,
        ...studentData,
        name: editFormData.fullName,
        parentName: editFormData.guardianName,
        parentPhone: editFormData.guardianContact,
        photoUrl: photoUrl
      } : null)

      setShowEditModal(false)
      setShowDetailModal(true)
      
      console.log('Student updated successfully:', editFormData.fullName)
      alert('Student updated successfully!')
      
      // Reset edit form
      setEditFormData({
        fullName: '',
        dob: '',
        gender: '',
        birthPlace: '',
        nationality: 'Ghanaian',
        religion: '',
        address: '',
        prevSchool: '',
        lastClass: '',
        specialNeeds: '',
        guardianName: '',
        relationship: '',
        occupation: '',
        guardianContact: '',
        guardianAddress: '',
        admissionNumber: '',
        assignedClass: '',
        house: '',
        photoUrl: ''
      })
      setValidationErrors({})
      setEditSelectedImage(null)
      setEditImagePreview(null)
      
    } catch (error) {
      console.error('Error updating student:', error)
      alert('Failed to update student. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Redirect teachers away from the admin Students page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student information and enrollment
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Chips */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Filters:</p>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {/* Payment Filters */}
              {[
                { key: 'owing', label: 'Owing', color: 'bg-red-100 text-red-800' },
                { key: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => toggleFilter(filter.key)}
                  className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    selectedFilters.includes(filter.key)
                      ? filter.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                  {selectedFilters.includes(filter.key) && (
                    <span className="ml-1 text-xs">×</span>
                  )}
                </button>
              ))}
              
              {/* Early Childhood Filter with Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => toggleFilter('early-childhood')}
                  className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    classFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(classFilter)
                      ? 'bg-pink-100 text-pink-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">
                    {classFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(classFilter) 
                      ? classFilter 
                      : 'Early Childhood'
                    }
                  </span>
                  <span className="sm:hidden">
                    {classFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(classFilter) 
                      ? classFilter.split(' ')[0]
                      : 'Early'
                    }
                  </span>
                  <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {classFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(classFilter) && (
                    <span 
                      className="ml-1 text-xs cursor-pointer hover:bg-pink-200 rounded-full px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearClassFilter()
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
                {selectedFilters.includes('early-childhood') && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setClassFilter('all')
                          setSelectedFilters(prev => prev.filter(f => f !== 'early-childhood'))
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          classFilter === 'all' ? 'bg-gray-100' : ''
                        }`}
                      >
                        All Early Childhood
                      </button>
                      {['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].map((className) => (
                        <button
                          key={className}
                          onClick={() => {
                            setClassFilter(className)
                            setSelectedFilters(prev => prev.filter(f => f !== 'early-childhood'))
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            classFilter === className ? 'bg-gray-100' : ''
                          }`}
                        >
                          {className}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Level Filter with Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => toggleFilter('primary')}
                  className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    classFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(classFilter)
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">
                    {classFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(classFilter) 
                      ? classFilter 
                      : 'Primary Level'
                    }
                  </span>
                  <span className="sm:hidden">
                    {classFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(classFilter) 
                      ? classFilter.split(' ')[0]
                      : 'Primary'
                    }
                  </span>
                  <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {classFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(classFilter) && (
                    <span 
                      className="ml-1 text-xs cursor-pointer hover:bg-purple-200 rounded-full px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearClassFilter()
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
                {selectedFilters.includes('primary') && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setClassFilter('all')
                          setSelectedFilters(prev => prev.filter(f => f !== 'primary'))
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          classFilter === 'all' ? 'bg-gray-100' : ''
                        }`}
                      >
                        All Primary
                      </button>
                      {['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].map((className) => (
                        <button
                          key={className}
                          onClick={() => {
                            setClassFilter(className)
                            setSelectedFilters(prev => prev.filter(f => f !== 'primary'))
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            classFilter === className ? 'bg-gray-100' : ''
                          }`}
                        >
                          {className}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* JHS Level Filter with Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => toggleFilter('jhs')}
                  className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    classFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(classFilter)
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">
                    {classFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(classFilter) 
                      ? classFilter 
                      : 'JHS Level'
                    }
                  </span>
                  <span className="sm:hidden">
                    {classFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(classFilter) 
                      ? classFilter
                      : 'JHS'
                    }
                  </span>
                  <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {classFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(classFilter) && (
                    <span 
                      className="ml-1 text-xs cursor-pointer hover:bg-orange-200 rounded-full px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearClassFilter()
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
                {selectedFilters.includes('jhs') && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setClassFilter('all')
                          setSelectedFilters(prev => prev.filter(f => f !== 'jhs'))
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          classFilter === 'all' ? 'bg-gray-100' : ''
                        }`}
                      >
                        All JHS
                      </button>
                      {['JHS 1', 'JHS 2', 'JHS 3'].map((className) => (
                        <button
                          key={className}
                          onClick={() => {
                            setClassFilter(className)
                            setSelectedFilters(prev => prev.filter(f => f !== 'jhs'))
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            classFilter === className ? 'bg-gray-100' : ''
                          }`}
                        >
                          {className}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {selectedFilters.length > 0 && (
                <button
                  onClick={() => setSelectedFilters([])}
                  className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-200 text-gray-600 hover:bg-gray-300"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 sm:py-5 sm:px-6">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
            Student Directory
          </h3>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
            Complete list of enrolled students
          </p>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading students...</span>
          </div>
        )}

        {/* Students List */}
        {!loading && (
          <ul className="divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <li className="px-4 py-12 text-center">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new student.</p>
                </div>
              </li>
            ) : (
              filteredStudents.map((student) => (
            <li key={student.id}>
              <div 
                className="px-3 py-3 sm:px-6 sm:py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleStudentClick(student)}
              >
                <div className="flex items-start sm:items-center">
                  <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name}
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <svg className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm sm:text-sm font-medium text-gray-900 truncate">
                        {student.name}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {student.class}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      Parent: {student.parentName}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {student.parentPhone}
                    </p>
                    <p className={`text-xs sm:text-sm ${student.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                      Balance: ₵{student.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Add New Student</h2>
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
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="fullName">Full Name *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="fullName" 
                      placeholder="Enter full name" 
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({...formData, fullName: e.target.value})
                        if (validationErrors.fullName && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, fullName: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="dob">Date of Birth *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.dob ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="dob" 
                      placeholder="e.g., 2008-05-15" 
                      type="date"
                      value={formData.dob}
                      onChange={(e) => {
                        setFormData({...formData, dob: e.target.value})
                        if (validationErrors.dob && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, dob: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="gender">Gender *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.gender ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData({...formData, gender: e.target.value})
                        if (validationErrors.gender && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, gender: false})
                        }
                      }}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="birthPlace">Place of Birth *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.birthPlace ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="birthPlace" 
                      placeholder="Enter place of birth" 
                      type="text"
                      value={formData.birthPlace}
                      onChange={(e) => {
                        setFormData({...formData, birthPlace: e.target.value})
                        if (validationErrors.birthPlace && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, birthPlace: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="religion">Religion/Denomination *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.religion ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="religion"
                      value={formData.religion}
                      onChange={(e) => {
                        setFormData({...formData, religion: e.target.value})
                        if (validationErrors.religion && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, religion: false})
                        }
                      }}
                    >
                      <option value="">Select religion</option>
                      <option value="Christian">Christian</option>
                      <option value="Islamic">Islamic</option>
                      <option value="Traditional">Traditional</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="address">Residential Address / Digital Address *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="address" 
                      placeholder="Enter address" 
                      type="text"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({...formData, address: e.target.value})
                        if (validationErrors.address && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, address: false})
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="prevSchool">Previous School Attended</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="prevSchool" 
                      placeholder="Enter school name" 
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="lastClass">Last Class Completed</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="lastClass" 
                      placeholder="e.g., Grade 8" 
                      type="text"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="specialNeeds">Special Educational Needs / Learning Challenges</label>
                    <textarea 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="specialNeeds" 
                      placeholder="Describe any needs or challenges" 
                      rows={3}
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Parent / Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="guardianName">Full Name(s) *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.guardianName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="guardianName" 
                      placeholder="Enter guardian's full name" 
                      type="text"
                      value={formData.guardianName}
                      onChange={(e) => {
                        setFormData({...formData, guardianName: e.target.value})
                        if (validationErrors.guardianName && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, guardianName: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="relationship">Relationship to Student *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.relationship ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="relationship"
                      value={formData.relationship}
                      onChange={(e) => {
                        setFormData({...formData, relationship: e.target.value})
                        if (validationErrors.relationship && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, relationship: false})
                        }
                      }}
                    >
                      <option value="">Select relationship</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="occupation">Occupation *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.occupation ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="occupation" 
                      placeholder="Enter occupation" 
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => {
                        setFormData({...formData, occupation: e.target.value})
                        if (validationErrors.occupation && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, occupation: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="guardianContact">Contact Number(s) *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.guardianContact ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="guardianContact" 
                      placeholder="Enter contact number" 
                      type="tel"
                      value={formData.guardianContact}
                      onChange={(e) => {
                        setFormData({...formData, guardianContact: e.target.value})
                        if (validationErrors.guardianContact && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, guardianContact: false})
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="guardianAddress">Residential Address</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.guardianAddress ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="guardianAddress" 
                      placeholder="Enter residential address" 
                      type="text"
                      value={formData.guardianAddress}
                      onChange={(e) => {
                        setFormData({...formData, guardianAddress: e.target.value})
                        if (validationErrors.guardianAddress && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, guardianAddress: false})
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Documentation */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Documentation</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Passport-sized Photographs</label>
                  <p className="text-sm text-gray-600 mb-2">Required dimensions: 35mm (width) × 45mm (height)</p>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="h-32 w-32 rounded-lg object-cover border-4 border-blue-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null)
                            setSelectedImage(null)
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10">
                    <div className="text-center">
                      <svg aria-hidden="true" className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                      <div className="mt-4 flex text-sm leading-6 text-gray-500">
                        <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500" htmlFor="file-upload">
                          <span>Upload files</span>
                          <input 
                            className="sr-only" 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-500">PNG, JPG, GIF up to 1MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* For School Use Only */}
              <div className="space-y-6 bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-blue-200 pb-2">For School Use Only</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="admissionNumber">Admission/Registration No.</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="admissionNumber" 
                      placeholder="Auto-generated or manual" 
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="assignedClass">Assigned Class</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="assignedClass"
                      value={formData.assignedClass}
                      onChange={(e) => setFormData({...formData, assignedClass: e.target.value})}
                    >
                      <option value="">Select class</option>
                      {classes.length > 0 ? (
                        sortClassesAscending(classes).map((cls) => (
                          <option key={cls.id} value={cls.name}>
                            {cls.name} ({cls.level})
                          </option>
                        ))
                      ) : (
                        CLASS_OPTIONS_WITH_LABELS.map((cls) => (
                          <option key={cls.value} value={cls.value}>
                            {cls.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="house">House</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" id="house">
                      <option>Select house</option>
                      <option>Phoenix</option>
                      <option>Griffin</option>
                      <option>Dragon</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-4 p-6 border-t border-gray-200">
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-blue-50"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={handleCreateStudent}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Student'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Student Details</h2>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowDetailModal(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* Left Sidebar */}
              <div className="flex-shrink-0 lg:w-1/4 bg-gray-50 p-6">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center mb-4">
                    {selectedStudent.photoUrl ? (
                      <img 
                        src={selectedStudent.photoUrl} 
                        alt={selectedStudent.name}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    ) : (
                      <svg className="h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedStudent.name}</h2>
                  <p className="text-sm text-gray-500">Student ID: {selectedStudent.admissionNumber || `#${selectedStudent.id}`}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => handleEditStudent(selectedStudent)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Details
                    </button>
                    <button 
                      onClick={() => handleViewHistory(selectedStudent)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <nav className="space-y-1">
                    <button 
                      className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg w-full text-left"
                      onClick={() => scrollToSection('personal-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">👤</span>
                      Personal
                    </button>
                    <button 
                      className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg w-full text-left"
                      onClick={() => scrollToSection('academic-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">🎓</span>
                      Academic
                    </button>
                    <button 
                      className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg w-full text-left"
                      onClick={() => scrollToSection('parent-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">👥</span>
                      Parent/Guardian
                    </button>
                    <button 
                      className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg w-full text-left"
                      onClick={() => scrollToSection('documentation-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">📁</span>
                      Documentation
                    </button>
                    <button 
                      className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg w-full text-left"
                      onClick={() => scrollToSection('school-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">🏢</span>
                      School Use
                    </button>
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-grow overflow-y-auto p-6 sm:p-8">
                <div className="border-b border-gray-200 pb-5 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.class}</h2>
                  <p className="mt-1 text-sm text-gray-500">Class information for {selectedStudent.name}.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  {/* Personal Information Section Header */}
                  <div className="md:col-span-2" id="personal-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mb-4">Personal Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student ID</label>
                    <div className="mt-1 text-gray-900 font-semibold">{selectedStudent.admissionNumber || `ST${selectedStudent.id}`}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.fullName || selectedStudent.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.dob ? formatDate(selectedStudent.dob) : 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.gender || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Religion</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.religion || 'Not provided'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.address}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.birthPlace || 'Not provided'}</div>
                  </div>

                  {/* Academic Information */}
                  <div className="md:col-span-2" id="academic-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">Academic Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.grade}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Class</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.assignedClass || selectedStudent.class}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Previous School</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.prevSchool || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Class Completed</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.lastClass || 'Not provided'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Special Educational Needs</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.specialNeeds || 'None'}</div>
                  </div>

                  {/* Parent/Guardian Information */}
                  <div className="md:col-span-2" id="parent-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">Parent/Guardian Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guardian Name</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.guardianName || selectedStudent.parentName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Relationship</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.relationship || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Occupation</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.occupation || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guardian Contact</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.guardianContact || selectedStudent.parentPhone}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Guardian Address</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.guardianAddress || selectedStudent.address}</div>
                  </div>

                  {/* School Use Information */}
                  <div className="md:col-span-2" id="school-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">School Use Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admission Number</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.admissionNumber || `ST${selectedStudent.id}`}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">House</label>
                    <div className="mt-1 text-gray-900">{selectedStudent.house || 'Not assigned'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
                    <div className="mt-1 text-gray-900">{formatDate(selectedStudent.enrollmentDate)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedStudent.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedStudent.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Balance</label>
                    <div className={`mt-1 ${selectedStudent.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                      ₵{selectedStudent.balance.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Payment Date</label>
                    <div className="mt-1 text-gray-900">
                      {selectedStudent.lastPaymentDate ? formatDate(selectedStudent.lastPaymentDate) : 'No payments recorded'}
                    </div>
                  </div>

                  {/* Documentation Section */}
                  <div className="md:col-span-2" id="documentation-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">Documentation</h3>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Documents</label>
                    <div className="mt-1 text-gray-900">
                      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <p className="text-sm text-gray-500 mb-2">No documents uploaded</p>
                        <p className="text-xs text-gray-400">Passport-sized photographs, certificates, and other documents</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Edit Student - {selectedStudent.name}</h2>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setShowEditModal(false)
                  setShowDetailModal(true)
                }}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-8 space-y-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editFullName">Full Name *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editFullName" 
                      placeholder="Enter full name" 
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => {
                        setEditFormData({...editFormData, fullName: e.target.value})
                        if (validationErrors.fullName && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, fullName: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editDob">Date of Birth *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.dob ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editDob" 
                      placeholder="e.g., 2008-05-15" 
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => {
                        setEditFormData({...editFormData, dob: e.target.value})
                        if (validationErrors.dob && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, dob: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editGender">Gender *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.gender ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editGender"
                      value={editFormData.gender}
                      onChange={(e) => {
                        setEditFormData({...editFormData, gender: e.target.value})
                        if (validationErrors.gender && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, gender: false})
                        }
                      }}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editBirthPlace">Place of Birth *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.birthPlace ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editBirthPlace" 
                      placeholder="Enter place of birth" 
                      type="text"
                      value={editFormData.birthPlace}
                      onChange={(e) => {
                        setEditFormData({...editFormData, birthPlace: e.target.value})
                        if (validationErrors.birthPlace && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, birthPlace: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editReligion">Religion/Denomination *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.religion ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editReligion"
                      value={editFormData.religion}
                      onChange={(e) => {
                        setEditFormData({...editFormData, religion: e.target.value})
                        if (validationErrors.religion && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, religion: false})
                        }
                      }}
                    >
                      <option value="">Select religion</option>
                      <option value="Christian">Christian</option>
                      <option value="Islamic">Islamic</option>
                      <option value="Traditional">Traditional</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editAddress">Residential Address / Digital Address *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editAddress" 
                      placeholder="Enter address" 
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => {
                        setEditFormData({...editFormData, address: e.target.value})
                        if (validationErrors.address && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, address: false})
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editPrevSchool">Previous School Attended</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editPrevSchool" 
                      placeholder="Enter school name" 
                      type="text"
                      value={editFormData.prevSchool}
                      onChange={(e) => setEditFormData({...editFormData, prevSchool: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editLastClass">Last Class Completed</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editLastClass" 
                      placeholder="e.g., Grade 8" 
                      type="text"
                      value={editFormData.lastClass}
                      onChange={(e) => setEditFormData({...editFormData, lastClass: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editSpecialNeeds">Special Educational Needs / Learning Challenges</label>
                    <textarea 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editSpecialNeeds" 
                      placeholder="Describe any needs or challenges" 
                      rows={3}
                      value={editFormData.specialNeeds}
                      onChange={(e) => setEditFormData({...editFormData, specialNeeds: e.target.value})}
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Parent / Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editGuardianName">Full Name(s) *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.guardianName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editGuardianName" 
                      placeholder="Enter guardian's full name" 
                      type="text"
                      value={editFormData.guardianName}
                      onChange={(e) => {
                        setEditFormData({...editFormData, guardianName: e.target.value})
                        if (validationErrors.guardianName && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, guardianName: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editRelationship">Relationship to Student *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.relationship ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editRelationship"
                      value={editFormData.relationship}
                      onChange={(e) => {
                        setEditFormData({...editFormData, relationship: e.target.value})
                        if (validationErrors.relationship && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, relationship: false})
                        }
                      }}
                    >
                      <option value="">Select relationship</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editOccupation">Occupation *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.occupation ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editOccupation" 
                      placeholder="Enter occupation" 
                      type="text"
                      value={editFormData.occupation}
                      onChange={(e) => {
                        setEditFormData({...editFormData, occupation: e.target.value})
                        if (validationErrors.occupation && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, occupation: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editGuardianContact">Contact Number(s) *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.guardianContact ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editGuardianContact" 
                      placeholder="Enter contact number" 
                      type="tel"
                      value={editFormData.guardianContact}
                      onChange={(e) => {
                        setEditFormData({...editFormData, guardianContact: e.target.value})
                        if (validationErrors.guardianContact && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, guardianContact: false})
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editGuardianAddress">Residential Address</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.guardianAddress ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="editGuardianAddress" 
                      placeholder="Enter residential address" 
                      type="text"
                      value={editFormData.guardianAddress}
                      onChange={(e) => {
                        setEditFormData({...editFormData, guardianAddress: e.target.value})
                        if (validationErrors.guardianAddress && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, guardianAddress: false})
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Documentation */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Documentation</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Passport-sized Photographs</label>
                  <p className="text-sm text-gray-600 mb-2">Required dimensions: 35mm (width) × 45mm (height)</p>
                  
                  {/* Image Preview */}
                  {editImagePreview && (
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <img 
                          src={editImagePreview} 
                          alt="Preview" 
                          className="h-32 w-32 rounded-lg object-cover border-4 border-blue-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditImagePreview(null)
                            setEditSelectedImage(null)
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10">
                    <div className="text-center">
                      <svg aria-hidden="true" className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                      <div className="mt-4 flex text-sm leading-6 text-gray-500">
                        <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500" htmlFor="edit-file-upload">
                          <span>Upload files</span>
                          <input 
                            className="sr-only" 
                            id="edit-file-upload" 
                            name="edit-file-upload" 
                            type="file" 
                            accept="image/*"
                            onChange={handleEditImageUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-500">PNG, JPG, GIF up to 1MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* For School Use Only */}
              <div className="space-y-6 bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-blue-200 pb-2">For School Use Only</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editAdmissionNumber">Admission/Registration No.</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editAdmissionNumber" 
                      placeholder="Auto-generated or manual" 
                      type="text"
                      value={editFormData.admissionNumber}
                      onChange={(e) => setEditFormData({...editFormData, admissionNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editAssignedClass">Assigned Class</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editAssignedClass"
                      value={editFormData.assignedClass}
                      onChange={(e) => setEditFormData({...editFormData, assignedClass: e.target.value})}
                    >
                      <option value="">Select class</option>
                      {classes.length > 0 ? (
                        sortClassesAscending(classes).map((cls) => (
                          <option key={cls.id} value={cls.name}>
                            {cls.name} ({cls.level})
                          </option>
                        ))
                      ) : (
                        CLASS_OPTIONS_WITH_LABELS.map((cls) => (
                          <option key={cls.value} value={cls.value}>
                            {cls.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="editHouse">House</label>
                    <select 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="editHouse"
                      value={editFormData.house}
                      onChange={(e) => setEditFormData({...editFormData, house: e.target.value})}
                    >
                      <option value="">Select house</option>
                      <option value="Phoenix">Phoenix</option>
                      <option value="Griffin">Griffin</option>
                      <option value="Dragon">Dragon</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-4 p-6 border-t border-gray-200">
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-blue-50"
                onClick={() => {
                  setShowEditModal(false)
                  setShowDetailModal(true)
                }}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={handleUpdateStudentFromEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
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

export default Students
