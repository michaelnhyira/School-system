import { useState, useEffect } from 'react'
import { Plus, Search, Mail, Phone, Database, Loader, Trash2, AlertTriangle } from 'lucide-react'
import { teacherUtils, classUtils, storageUtils, subjectUtils } from '../utils/firebaseUtils'
import { CLASS_LEVELS } from '../constants/classes'
import { formatDate } from '../utils/dateUtils'
import { createTeachersInFirestore } from '../utils/generateTeacherData'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { roleUtils } from '../utils/roleUtils'
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

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  subjects: string[] // Changed from subject to subjects array
  assignedClass?: string // Optional assigned class
  experience?: string
  hireDate: string
  status: 'active' | 'inactive'
  // Additional fields for detailed view
  fullName?: string
  dob?: string
  gender?: string
  maritalStatus?: string
  nationality?: string
  religion?: string
  address?: string
  contactNumber?: string
  qualification?: string
  licenseNumber?: string
  specialization?: string
  previousExperience?: string
  staffId?: string
  appointmentDate?: string
  guardianName?: string
  relationship?: string
  occupation?: string
  guardianContact?: string
  guardianAddress?: string
  photoUrl?: string | null
}

const Teachers = () => {
  const { currentUser, isTeacher } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [editSelectedSubjects, setEditSelectedSubjects] = useState<string[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form state for teacher creation
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    nationality: 'Ghanaian',
    religion: '',
    address: '',
    contactNumber: '',
    email: '',
    qualification: '',
    experience: '',
    appointmentDate: '',
    specialization: '',
    subjects: [] as string[],
    assignedClass: '', // Added assigned class field
    guardianName: '',
    relationship: '',
    occupation: '',
    guardianContact: '',
    guardianAddress: ''
  })

  // Form state for teacher editing
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    nationality: 'Ghanaian',
    religion: '',
    address: '',
    contactNumber: '',
    qualification: '',
    experience: '',
    appointmentDate: '',
    specialization: '',
    subjects: [] as string[],
    assignedClass: '',
    guardianName: '',
    relationship: '',
    occupation: '',
    guardianContact: '',
    guardianAddress: ''
  })

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({})

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<any[]>([])

  const mapFirestoreTeacher = (teacher: any): Teacher => ({
    id: teacher.id,
    name: teacher.fullName || teacher.name || '',
    email: teacher.email || '',
    phone: teacher.contactNumber || teacher.phone || '',
    subjects: teacher.subjects || (teacher.subject ? [teacher.subject] : []),
    experience: teacher.experience !== undefined && teacher.experience !== null
      ? String(teacher.experience)
      : teacher.previousExperience !== undefined && teacher.previousExperience !== null
        ? String(teacher.previousExperience)
        : '0',
    hireDate: teacher.appointmentDate || teacher.hireDate || new Date().toISOString().split('T')[0],
    status: teacher.status || 'active',
    fullName: teacher.fullName || teacher.name || '',
    dob: teacher.dob || '',
    gender: teacher.gender || '',
    maritalStatus: teacher.maritalStatus || '',
    nationality: teacher.nationality || 'Ghanaian',
    religion: teacher.religion || '',
    address: teacher.address || '',
    contactNumber: teacher.contactNumber || teacher.phone || '',
    qualification: teacher.qualification || '',
    licenseNumber: teacher.licenseNumber || '',
    specialization: teacher.specialization || '',
    previousExperience: teacher.previousExperience !== undefined && teacher.previousExperience !== null
      ? String(teacher.previousExperience)
      : teacher.experience !== undefined && teacher.experience !== null
        ? String(teacher.experience)
        : '',
    staffId: teacher.staffId || '',
    appointmentDate: teacher.appointmentDate || teacher.hireDate || '',
    assignedClass: teacher.assignedClass || '',
    guardianName: teacher.guardianName || teacher.kinName || '',
    relationship: teacher.relationship || '',
    occupation: teacher.occupation || '',
    guardianContact: teacher.guardianContact || teacher.kinContact || '',
    guardianAddress: teacher.guardianAddress || teacher.kinAddress || '',
    photoUrl: teacher.photoUrl || null
  })

  // Load classes when component mounts
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

  // Load subjects from database
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const subjectsData = await subjectUtils.getSubjects()
        // Extract just the subject names
        const subjectNames = subjectsData.map((subject: any) => subject.name || subject).filter(Boolean)
        setSubjects(subjectNames.sort()) // Sort alphabetically
      } catch (error) {
        console.error('Error loading subjects:', error)
        setSubjects([])
      }
    }
    loadSubjects()
  }, [])

  // Fetch teachers from Firestore
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true)
        const firestoreTeachers = await teacherUtils.getTeachers()
        
        // Transform Firestore data to match our Teacher interface
        const transformedTeachers = firestoreTeachers.map(mapFirestoreTeacher)
        
        setTeachers(transformedTeachers)
        console.log('Teachers loaded from Firestore:', transformedTeachers.length)
      } catch (error) {
        console.error('Error fetching teachers:', error)
        setTeachers([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [])


  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subjects.some((subject: string) => subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (teacher.assignedClass && teacher.assignedClass.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Generate teachers function
  const handleGenerateTeachers = async () => {
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      console.log('🚀 Generating 20 teachers...');
      
      const createdTeachers = await createTeachersInFirestore(20);
      
      // Refresh the teachers list
      const firestoreTeachers = await teacherUtils.getTeachers();
      const transformedTeachers = firestoreTeachers.map(mapFirestoreTeacher);
      
      setTeachers(transformedTeachers);
      
      alert(`✅ Successfully generated ${createdTeachers.length} teachers!`);
    } catch (error) {
      console.error('❌ Error generating teachers:', error);
      alert('❌ Error generating teachers. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Validation function
  // Keep this list aligned with fields visibly marked with an asterisk (*) in the Add Teacher modal.
  // Do not include fields that are not present in the Add form UI to avoid false validation failures.
  const validateForm = () => {
    const requiredFields = ['fullName', 'dob', 'gender', 'maritalStatus', 'nationality', 'religion', 'address', 'contactNumber', 'email', 'qualification']
    const errors: {[key: string]: boolean} = {}
    let isValid = true

    requiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData]
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors[field] = true
        isValid = false
      }
    })

    // Check if at least one subject is selected
    if (selectedSubjects.length === 0) {
      errors.subjects = true
      isValid = false
    }

    setValidationErrors(errors)
    return isValid
  }

  // Backend-ready functions
  const handleEditTeacher = (teacher: Teacher) => {
    setEditFormData({
      fullName: teacher.fullName || '',
      dob: teacher.dob || '',
      gender: teacher.gender || '',
      maritalStatus: teacher.maritalStatus || '',
      nationality: teacher.nationality || 'Ghanaian',
      religion: teacher.religion || '',
      address: teacher.address || '',
      contactNumber: teacher.contactNumber || '',
      qualification: teacher.qualification || '',
      experience: teacher.experience || '',
      appointmentDate: teacher.appointmentDate || '',
      specialization: teacher.specialization || '',
      subjects: teacher.subjects || [],
      assignedClass: teacher.assignedClass || '',
      guardianName: teacher.guardianName || '',
      relationship: teacher.relationship || '',
      occupation: teacher.occupation || '',
      guardianContact: teacher.guardianContact || '',
      guardianAddress: teacher.guardianAddress || ''
    })
    setEditSelectedSubjects(teacher.subjects || [])
    setEditImagePreview(teacher.photoUrl || null)
    setShowEditModal(true)
    setShowDetailModal(false)
  }

  const handleCreateTeacher = async () => {
    // Validate required fields
    if (!validateForm()) {
      alert('Please fill in all required fields (marked with *) and select at least one subject')
      return
    }

    setIsCreating(true)
    try {
      // Upload photo if selected
      let photoUrl = '';
      if (selectedFile) {
        setUploading(true);
        try {
          // Generate a unique file path for the teacher
          const timestamp = Date.now()
          const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `profile-photos/teachers/${timestamp}_${sanitizedFileName}`
          photoUrl = await storageUtils.uploadFile(selectedFile, filePath);
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          alert('Failed to upload photo. Please try again.');
          setUploading(false);
          setIsCreating(false);
          return;
        }
        setUploading(false);
      }

      // Create teacher in Firestore
      const teacherData = {
        ...formData,
        subjects: selectedSubjects,
        photoUrl: photoUrl,
        assignedClass: formData.assignedClass,
        experience: '0',
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active'
      }

      const teacherId = await teacherUtils.createTeacher(teacherData)

      // Assign teacher role to the email
      if (formData.email && currentUser?.email) {
        try {
          await roleUtils.assignUserRole(
            formData.email, 
            'teacher', 
            formData.fullName, 
            currentUser.email
          )
          console.log(`Teacher role assigned to ${formData.email}`)
        } catch (roleError) {
          console.error('Error assigning teacher role:', roleError)
          // Don't fail the entire operation if role assignment fails
        }
      }

      const newTeacher: Teacher = {
        ...formData,
        id: teacherId,
        name: formData.fullName,
        email: formData.email,
        phone: formData.contactNumber,
        subjects: selectedSubjects, // Changed to subjects array
        assignedClass: formData.assignedClass, // Added assigned class
        experience: '0',
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
        photoUrl: photoUrl
      }

      setTeachers(prev => [...prev, newTeacher])
      setShowAddModal(false)
      setSelectedFile(null)
      setSelectedSubjects([])
      
      // Reset form
      setFormData({
        fullName: '',
        dob: '',
        gender: '',
        maritalStatus: '',
        nationality: 'Ghanaian',
        religion: '',
        address: '',
        contactNumber: '',
        email: '',
        qualification: '',
        experience: '',
        appointmentDate: '',
        specialization: '',
        subjects: [],
        assignedClass: '',
        guardianName: '',
        relationship: '',
        occupation: '',
        guardianContact: '',
        guardianAddress: ''
      })
      setValidationErrors({})
      
      alert('Teacher created successfully!')
    } catch (error) {
      console.error('Error creating teacher:', error)
      alert('Failed to create teacher. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTeacher = async () => {
    if (!selectedTeacher) return

    try {
      setIsCreating(true)
      
      let photoUrl = selectedTeacher.photoUrl

      // Upload new image if one is selected
      if (editSelectedFile) {
        // Delete old image if it exists
        if (selectedTeacher.photoUrl) {
          await storageUtils.deleteOldImage(selectedTeacher.photoUrl)
        }

        // Upload new image
        const sanitizedFileName = editSelectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `profile-photos/teachers/${selectedTeacher.id}/profile_${Date.now()}_${sanitizedFileName}`
        photoUrl = await storageUtils.uploadFile(editSelectedFile, filePath)
      }

      // Update teacher in Firestore
      const teacherRef = doc(db, 'teachers', selectedTeacher.id)
      await updateDoc(teacherRef, {
        fullName: editFormData.fullName,
        dob: editFormData.dob,
        gender: editFormData.gender,
        maritalStatus: editFormData.maritalStatus,
        nationality: editFormData.nationality,
        religion: editFormData.religion,
        address: editFormData.address,
        contactNumber: editFormData.contactNumber,
        qualification: editFormData.qualification,
        experience: editFormData.experience,
        appointmentDate: editFormData.appointmentDate,
        specialization: editFormData.specialization,
        subjects: editSelectedSubjects,
        assignedClass: editFormData.assignedClass,
        guardianName: editFormData.guardianName,
        relationship: editFormData.relationship,
        occupation: editFormData.occupation,
        guardianContact: editFormData.guardianContact,
        guardianAddress: editFormData.guardianAddress,
        photoUrl: photoUrl
      })

      // Update local state
      const updatedTeacher: Teacher = {
        ...selectedTeacher,
        fullName: editFormData.fullName,
        dob: editFormData.dob,
        gender: editFormData.gender,
        maritalStatus: editFormData.maritalStatus,
        nationality: editFormData.nationality,
        religion: editFormData.religion,
        address: editFormData.address,
        contactNumber: editFormData.contactNumber,
        qualification: editFormData.qualification,
        experience: editFormData.experience,
        appointmentDate: editFormData.appointmentDate,
        specialization: editFormData.specialization,
        subjects: editSelectedSubjects,
        assignedClass: editFormData.assignedClass,
        guardianName: editFormData.guardianName,
        relationship: editFormData.relationship,
        occupation: editFormData.occupation,
        guardianContact: editFormData.guardianContact,
        guardianAddress: editFormData.guardianAddress,
        photoUrl: photoUrl
      }

      setTeachers(teachers.map(t => t.id === selectedTeacher.id ? updatedTeacher : t))
      setSelectedTeacher(updatedTeacher)
      setShowEditModal(false)
      
      // Reset form
      setEditFormData({
        fullName: '',
        dob: '',
        gender: '',
        maritalStatus: '',
        nationality: 'Ghanaian',
        religion: '',
        address: '',
        contactNumber: '',
        qualification: '',
        experience: '',
        appointmentDate: '',
        specialization: '',
        subjects: [],
        assignedClass: '',
        guardianName: '',
        relationship: '',
        occupation: '',
        guardianContact: '',
        guardianAddress: ''
      })
      setEditSelectedSubjects([])
      setEditSelectedFile(null)
      setEditImagePreview(null)

      alert('Teacher updated successfully!')
    } catch (error) {
      console.error('Error updating teacher:', error)
      alert('Failed to update teacher. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClick = (teacher: Teacher, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click event
    setTeacherToDelete(teacher)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return

    try {
      setIsDeleting(true)

      // Delete photo from storage if it exists
      if (teacherToDelete.photoUrl) {
        try {
          await storageUtils.deleteOldImage(teacherToDelete.photoUrl)
        } catch (error) {
          console.error('Error deleting photo:', error)
          // Continue with deletion even if photo deletion fails
        }
      }

      // Delete teacher from Firestore
      await teacherUtils.deleteTeacher(teacherToDelete.id)

      // Update local state
      setTeachers(teachers.filter(teacher => teacher.id !== teacherToDelete.id))
      setShowDeleteModal(false)
      setTeacherToDelete(null)
      
      alert('Teacher deleted successfully!')
    } catch (error) {
      console.error('Error deleting teacher:', error)
      alert('Failed to delete teacher. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setShowDetailModal(true)
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

  // Redirect teachers away from the Teachers management page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage teacher information and assignments
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateTeachers}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate 20 Teachers'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading teachers...</span>
        </div>
      )}

      {/* Teachers Grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No teachers found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new teacher.</p>
            </div>
          ) : (
            filteredTeachers.map((teacher) => (
          <div 
            key={teacher.id} 
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow relative"
            onClick={() => handleTeacherClick(teacher)}
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12">
                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                    {teacher.photoUrl ? (
                      <img 
                        src={teacher.photoUrl} 
                        alt={teacher.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                    <span className="text-lg font-medium text-gray-700">
                      {teacher.name.split(' ').map(n => n[0]).join('')}
                    </span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      {teacher.name}
                    </h3>
                    <button
                      onClick={(e) => handleDeleteClick(teacher, e)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete teacher"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">{teacher.subjects.join(', ')}</p>
                  {teacher.assignedClass && (
                    <p className="text-sm text-blue-600 font-medium">Class: {teacher.assignedClass}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-4 w-4 mr-2" />
                  {teacher.email}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Phone className="h-4 w-4 mr-2" />
                  {teacher.phone}
                </div>
                <div className="text-sm text-gray-500">
                  Hired: {formatDate(teacher.hireDate)}
                </div>
              </div>
            </div>
          </div>
            ))
          )}
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Add New Teacher</h2>
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
                      placeholder="e.g., 1985-03-15" 
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
                    <label className="block text-sm font-medium text-gray-500" htmlFor="maritalStatus">Marital Status *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.maritalStatus ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={(e) => {
                        setFormData({...formData, maritalStatus: e.target.value})
                        if (validationErrors.maritalStatus && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, maritalStatus: false})
                        }
                      }}
                    >
                      <option value="">Select status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="nationality">Nationality *</label>
                    <select 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.nationality ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => {
                        setFormData({...formData, nationality: e.target.value})
                        if (validationErrors.nationality && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, nationality: false})
                        }
                      }}
                    >
                      <option value="Ghanaian">Ghanaian</option>
                      <option value="Nigerian">Nigerian</option>
                      <option value="South African">South African</option>
                      <option value="Kenyan">Kenyan</option>
                      <option value="Egyptian">Egyptian</option>
                      <option value="Moroccan">Moroccan</option>
                      <option value="Ethiopian">Ethiopian</option>
                      <option value="Tanzanian">Tanzanian</option>
                      <option value="Ugandan">Ugandan</option>
                      <option value="Algerian">Algerian</option>
                      <option value="Sudanese">Sudanese</option>
                      <option value="Angolan">Angolan</option>
                      <option value="Mozambican">Mozambican</option>
                      <option value="Madagascan">Madagascan</option>
                      <option value="Cameroonian">Cameroonian</option>
                      <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                      <option value="Niger">Niger</option>
                      <option value="Burkina Faso">Burkina Faso</option>
                      <option value="Mali">Mali</option>
                      <option value="Malawian">Malawian</option>
                      <option value="Zambian">Zambian</option>
                      <option value="Somalian">Somalian</option>
                      <option value="Senegalese">Senegalese</option>
                      <option value="Chadian">Chadian</option>
                      <option value="Sierra Leonean">Sierra Leonean</option>
                      <option value="Libyan">Libyan</option>
                      <option value="Liberian">Liberian</option>
                      <option value="Central African">Central African</option>
                      <option value="Mauritanian">Mauritanian</option>
                      <option value="Eritrean">Eritrean</option>
                      <option value="Gambian">Gambian</option>
                      <option value="Botswanan">Botswanan</option>
                      <option value="Gabonese">Gabonese</option>
                      <option value="Lesotho">Lesotho</option>
                      <option value="Guinea-Bissau">Guinea-Bissau</option>
                      <option value="Equatorial Guinean">Equatorial Guinean</option>
                      <option value="Mauritian">Mauritian</option>
                      <option value="Eswatini">Eswatini</option>
                      <option value="Djiboutian">Djiboutian</option>
                      <option value="Comorian">Comorian</option>
                      <option value="Cape Verdean">Cape Verdean</option>
                      <option value="São Tomé and Príncipe">São Tomé and Príncipe</option>
                      <option value="Seychellois">Seychellois</option>
                      <option value="Other">Other</option>
                    </select>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="contactNumber">Contact Number(s) *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.contactNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="contactNumber" 
                      placeholder="Enter contact number(s)" 
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => {
                        setFormData({...formData, contactNumber: e.target.value})
                        if (validationErrors.contactNumber && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, contactNumber: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="email">Email *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`} 
                      id="email" 
                      placeholder="Enter email address" 
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({...formData, email: e.target.value})
                        if (validationErrors.email && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, email: false})
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Professional / Academic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Professional / Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="qualification">Highest Academic Qualification *</label>
                    <input 
                      className={`mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 ${
                        validationErrors.qualification ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-600'
                      }`}
                      id="qualification" 
                      placeholder="Enter qualification" 
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => {
                        setFormData({...formData, qualification: e.target.value})
                        if (validationErrors.qualification && e.target.value.trim()) {
                          setValidationErrors({...validationErrors, qualification: false})
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="experience">Previous Teaching Experience <span className="text-gray-400">(Optional)</span></label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="experience" 
                      placeholder="Enter experience" 
                      type="text"
                      value={formData.experience || ''}
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="appointmentDate">Date of Appointment/Employment</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="appointmentDate" 
                      type="date"
                      value={formData.appointmentDate || ''}
                      onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-3">Assigned Subject(s) * <span className="text-gray-400">(Multiple Selection)</span></label>
                    <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-md border-2 ${
                      validationErrors.subjects ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      {subjects.length > 0 ? (
                        subjects.map((subject) => (
                        <label key={subject} className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={selectedSubjects.includes(subject)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubjects([...selectedSubjects, subject])
                              } else {
                                setSelectedSubjects(selectedSubjects.filter(s => s !== subject))
                              }
                              // Clear validation error when user selects a subject
                              if (validationErrors.subjects && selectedSubjects.length >= 0) {
                                setValidationErrors({...validationErrors, subjects: false})
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700">{subject}</span>
                        </label>
                      ))
                      ) : (
                        <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                          No subjects found. Please create subjects in the Subjects page first.
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="assignedClass">Assigned Class <span className="text-gray-400">(Optional)</span></label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600"
                      id="assignedClass"
                      value={formData.assignedClass}
                      onChange={(e) => setFormData({...formData, assignedClass: e.target.value})}
                    >
                      <option value="">Select a class (optional)</option>
                      {sortClassesAscending(classes).map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name} ({cls.level})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Teachers can be assigned to multiple classes as class teachers
                    </p>
                  </div>
                </div>
              </div>

              {/* Parent/Next of Kin Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Parent/Next of Kin Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="guardianName">Full Name</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="guardianName" 
                      placeholder="Enter full name" 
                      type="text"
                      value={formData.guardianName || ''}
                      onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="relationship">Relationship to Teacher</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="relationship" 
                      placeholder="Enter relationship" 
                      type="text"
                      value={formData.relationship || ''}
                      onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="guardianContact">Contact Number</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="guardianContact" 
                      placeholder="Enter number" 
                      type="tel"
                      value={formData.guardianContact || ''}
                      onChange={(e) => setFormData({...formData, guardianContact: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="guardianAddress">Address</label>
                    <input 
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600" 
                      id="guardianAddress" 
                      placeholder="Enter address" 
                      type="text"
                      value={formData.guardianAddress || ''}
                      onChange={(e) => setFormData({...formData, guardianAddress: e.target.value})}
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
                  <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10">
                    <div className="text-center">
                      {selectedFile ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            <svg className="h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          {uploading && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null)
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <>
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
                                accept="image/jpeg,image/jpg,image/png,image/gif"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Validate file size (1MB)
                                    if (file.size > 1024 * 1024) {
                                      alert('File size must be less than 1MB');
                                      return;
                                    }
                                    setSelectedFile(file);
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      console.log('Preview generated for upload', e.target?.result ? 'success' : 'failed');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs leading-5 text-gray-500">Certificates, CV, National ID, Passport-sized Photographs up to 1MB</p>
                        </>
                      )}
                    </div>
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
                onClick={handleCreateTeacher}
                disabled={isCreating || uploading}
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploading ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  'Save Teacher'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Edit Teacher - {selectedTeacher.name}</h2>
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
            <div className="flex-1 overflow-y-auto p-6">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-fullName">Full Name *</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-fullName"
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-dob">Date of Birth *</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-dob"
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => setEditFormData({...editFormData, dob: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-gender">Gender *</label>
                    <select 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-gender"
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData({...editFormData, gender: e.target.value})}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-maritalStatus">Marital Status</label>
                    <select 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-maritalStatus"
                      value={editFormData.maritalStatus}
                      onChange={(e) => setEditFormData({...editFormData, maritalStatus: e.target.value})}
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-nationality">Nationality</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-nationality"
                      type="text"
                      value={editFormData.nationality}
                      onChange={(e) => setEditFormData({...editFormData, nationality: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-religion">Religion</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-religion"
                      type="text"
                      value={editFormData.religion}
                      onChange={(e) => setEditFormData({...editFormData, religion: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-address">Address *</label>
                    <textarea 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-address"
                      rows={3}
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-contactNumber">Contact Number *</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-contactNumber"
                      type="tel"
                      value={editFormData.contactNumber}
                      onChange={(e) => setEditFormData({...editFormData, contactNumber: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-qualification">Qualification *</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-qualification"
                      type="text"
                      value={editFormData.qualification}
                      onChange={(e) => setEditFormData({...editFormData, qualification: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-experience">Years of Experience</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-experience"
                      type="number"
                      value={editFormData.experience}
                      onChange={(e) => setEditFormData({...editFormData, experience: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-appointmentDate">Appointment Date *</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-appointmentDate"
                      type="date"
                      value={editFormData.appointmentDate}
                      onChange={(e) => setEditFormData({...editFormData, appointmentDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-specialization">Specialization</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-specialization"
                      type="text"
                      value={editFormData.specialization}
                      onChange={(e) => setEditFormData({...editFormData, specialization: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-assignedClass">Assigned Class</label>
                    <select 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-assignedClass"
                      value={editFormData.assignedClass}
                      onChange={(e) => setEditFormData({...editFormData, assignedClass: e.target.value})}
                    >
                      <option value="">Select Class</option>
                      {sortClassesAscending(classes).map((cls) => (
                        <option key={cls.id} value={cls.name}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Subjects *</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {subjects.length > 0 ? (
                    subjects.map((subject) => (
                    <label key={subject} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={editSelectedSubjects.includes(subject)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditSelectedSubjects([...editSelectedSubjects, subject])
                          } else {
                            setEditSelectedSubjects(editSelectedSubjects.filter(s => s !== subject))
                          }
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">{subject}</span>
                    </label>
                  ))
                  ) : (
                    <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                      No subjects found. Please create subjects in the Subjects page first.
                    </div>
                  )}
                </div>
              </div>

              {/* Guardian Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2">Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-guardianName">Guardian Name</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-guardianName"
                      type="text"
                      value={editFormData.guardianName}
                      onChange={(e) => setEditFormData({...editFormData, guardianName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-relationship">Relationship</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-relationship"
                      type="text"
                      value={editFormData.relationship}
                      onChange={(e) => setEditFormData({...editFormData, relationship: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-occupation">Occupation</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-occupation"
                      type="text"
                      value={editFormData.occupation}
                      onChange={(e) => setEditFormData({...editFormData, occupation: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-guardianContact">Guardian Contact</label>
                    <input 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-guardianContact"
                      type="tel"
                      value={editFormData.guardianContact}
                      onChange={(e) => setEditFormData({...editFormData, guardianContact: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500" htmlFor="edit-guardianAddress">Guardian Address</label>
                    <textarea 
                      className="mt-1 block w-full rounded-md bg-gray-50 text-gray-900 focus:ring-blue-600 focus:border-blue-600 border-gray-300"
                      id="edit-guardianAddress"
                      rows={3}
                      value={editFormData.guardianAddress}
                      onChange={(e) => setEditFormData({...editFormData, guardianAddress: e.target.value})}
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
                  <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10">
                    <div className="text-center">
                      {editImagePreview ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            <img 
                              src={editImagePreview} 
                              alt="Preview" 
                              className="h-20 w-20 object-cover rounded-lg"
                            />
                          </div>
                          <div className="text-sm text-gray-600">
                            <p className="font-medium">{editSelectedFile?.name}</p>
                            <p className="text-xs text-gray-500">{editSelectedFile ? (editSelectedFile.size / 1024).toFixed(1) : 0} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditSelectedFile(null)
                              setEditImagePreview(null)
                            }}
                            className="text-sm text-red-600 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500" htmlFor="edit-file-upload">
                              <span>Upload files</span>
                              <input 
                                className="sr-only" 
                                id="edit-file-upload" 
                                name="edit-file-upload" 
                                type="file" 
                                accept="image/jpeg,image/jpg,image/png,image/gif"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Validate file size (1MB)
                                    if (file.size > 1024 * 1024) {
                                      alert('File size must be less than 1MB');
                                      return;
                                    }
                                    setEditSelectedFile(file);
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      setEditImagePreview(e.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs leading-5 text-gray-500">PNG, JPG, GIF up to 1MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-4 p-6 border-t border-gray-200">
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-blue-50"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={handleUpdateTeacher}
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
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Detail Modal */}
      {showDetailModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Teacher Details</h2>
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
                    {selectedTeacher.photoUrl ? (
                      <img 
                        src={selectedTeacher.photoUrl} 
                        alt={selectedTeacher.name}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    ) : (
                    <span className="text-2xl font-medium text-gray-700">
                      {selectedTeacher.name.split(' ').map(n => n[0]).join('')}
                    </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedTeacher.name}</h2>
                  <p className="text-sm text-gray-500">Staff ID: {selectedTeacher.staffId || `#${selectedTeacher.id}`}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => handleEditTeacher(selectedTeacher)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Details
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
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
                      onClick={() => scrollToSection('professional-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">🎓</span>
                      Professional
                    </button>
                    <button 
                      className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg w-full text-left"
                      onClick={() => scrollToSection('kin-section')}
                    >
                      <span className="mr-3 text-gray-400 group-hover:text-blue-600">👥</span>
                      Next of Kin
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
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTeacher.subjects.join(', ')}</h2>
                  <p className="mt-1 text-sm text-gray-500">Subject information for {selectedTeacher.name}.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  {/* Personal Information Section Header */}
                  <div className="md:col-span-2" id="personal-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mb-4">Personal Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff ID</label>
                    <div className="mt-1 text-gray-900 font-semibold">{selectedTeacher.staffId || `STF${selectedTeacher.id}`}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.fullName || selectedTeacher.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.dob ? formatDate(selectedTeacher.dob) : 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.gender || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.maritalStatus || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nationality</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.nationality || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Religion</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.religion || 'Not provided'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.address || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.contactNumber || selectedTeacher.phone}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.email}</div>
                  </div>

                  {/* Professional Information */}
                  <div className="md:col-span-2" id="professional-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">Professional Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Qualification</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.qualification || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teaching License</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.licenseNumber || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Specialization</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.specialization || selectedTeacher.subjects.join(', ')}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Experience</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.previousExperience || `${selectedTeacher.experience} years`}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff ID</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.staffId || `STF${selectedTeacher.id}`}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Appointment Date</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.appointmentDate ? formatDate(selectedTeacher.appointmentDate) : formatDate(selectedTeacher.hireDate)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Subjects</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.subjects.join(', ')}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Class</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.assignedClass || 'Not assigned'}</div>
                  </div>

                  {/* Next of Kin Information */}
                  <div className="md:col-span-2" id="kin-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">Next of Kin Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.guardianName || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Relationship</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.relationship || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.guardianContact || 'Not provided'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.guardianAddress || 'Not provided'}</div>
                  </div>

                  {/* School Use Information */}
                  <div className="md:col-span-2" id="school-section">
                    <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mt-8 mb-4">School Use Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Staff ID</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.staffId || `STF${selectedTeacher.id}`}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTeacher.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedTeacher.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                    <div className="mt-1 text-gray-900">{formatDate(selectedTeacher.hireDate)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Experience</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.experience} years</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subjects</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.subjects.join(', ')}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 text-gray-900">{selectedTeacher.email}</div>
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
                        <p className="text-xs text-gray-400">Certificates, Teacher License, CV, National ID, Passport-sized Photographs</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Delete Teacher</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">{teacherToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  This will permanently delete the teacher's information from the system.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setTeacherToDelete(null)
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Teachers
