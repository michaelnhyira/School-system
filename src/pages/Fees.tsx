import { useState, useEffect } from 'react'
import { Plus, Search, Download, Users, AlertCircle, X, Loader2 } from 'lucide-react'
import { studentUtils, classUtils, feesUtils } from '../utils/firebaseUtils'
import { useAcademicPeriod } from '../contexts/AcademicPeriodContext'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'



interface Class {
  id: string
  name: string
  level: string
  capacity: number
  currentEnrollment: number
}

interface Student {
  id: string
  name: string
  grade: string
  class: string
  parentName: string
  phone: string
  photoUrl?: string
  amountPaid?: number
  balance?: number
  status?: 'No Payment' | 'Partial Payment' | 'Full Payment'
  classFee?: number
}

const Fees = () => {
  const { isTeacher } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [classFilter, setClassFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'bank_transfer'>('cash')
  const [studentPaymentHistory, setStudentPaymentHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPeriodFees, setCurrentPeriodFees] = useState<any>(null)
  
  const { currentPeriod } = useAcademicPeriod()
  
  // Payment period will be locked to current period
  const paymentPeriod = currentPeriod ? {
    academicYear: currentPeriod.academicYear,
    term: currentPeriod.term
  } : {
    academicYear: new Date().getFullYear().toString(),
    term: '1st Term'
  }
  
  // Set Fees modal state
  const [setFeesFormData, setSetFeesFormData] = useState({
    selectedClasses: [] as string[],
    feeAmount: '',
    academicYear: new Date().getFullYear().toString(),
    term: '1st Term'
  })

  // State for managing fee groups (incremental fee setting)
  const [feeGroups, setFeeGroups] = useState<Array<{
    id: string
    classes: string[]
    classNames: string[]
    feeAmount: number
  }>>([])

  // Loading state for saving fees
  const [savingFees, setSavingFees] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)

  // Load fees for current academic period
  useEffect(() => {
    const loadCurrentPeriodFees = async () => {
      if (currentPeriod) {
        try {
          const periodFees = await feesUtils.getFeesForPeriod(
            currentPeriod.academicYear, 
            currentPeriod.term
          )
          setCurrentPeriodFees(periodFees)
        } catch (error) {
          console.error('Error loading current period fees:', error)
          setCurrentPeriodFees(null)
        }
      }
    }
    loadCurrentPeriodFees()
  }, [currentPeriod])

  // Function to refresh student payment data
  const refreshStudentPaymentData = async () => {
    try {
      const studentsWithPayments = await Promise.all(
        students.map(async (student) => {
          try {
            const paymentSummary = await feesUtils.getStudentPaymentSummary(
              student.id, 
              student.class,
              currentPeriod?.academicYear,
              currentPeriod?.term
            )
            return {
              ...student,
              amountPaid: paymentSummary.totalPaid,
              balance: paymentSummary.balance,
              status: paymentSummary.status as 'No Payment' | 'Partial Payment' | 'Full Payment',
              classFee: paymentSummary.classFee
            }
          } catch (error) {
            console.error(`Error refreshing payment data for student ${student.id}:`, error)
            return student
          }
        })
      )
      
      setStudents(studentsWithPayments)
    } catch (error) {
      console.error('Error refreshing student payment data:', error)
    }
  }

  // Refresh all data when academic period changes
  useEffect(() => {
    if (currentPeriod) {
      console.log(`Academic period changed to: ${currentPeriod.academicYear} - ${currentPeriod.term}`)
      
      // Close any open modals to prevent showing data from wrong period
      setShowPaymentModal(false)
      setShowHistoryModal(false)
      setShowAddModal(false)
      setSelectedStudent(null)
      setStudentPaymentHistory([])
      
      // Clear fee groups and reset form when period changes
      setFeeGroups([])
      setSetFeesFormData(prev => ({
        ...prev,
        selectedClasses: [],
        feeAmount: ''
      }))
      
      // Refresh student payment data for the new period
      refreshStudentPaymentData()
    }
  }, [currentPeriod])

  // Fetch students and classes on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Fetching students and classes...')
        
        // Fetch students
        const firestoreStudents = await studentUtils.getStudents()
        console.log('Raw students data:', firestoreStudents)
        
        // Debug: Log the first student's field names to see what's available
        if (firestoreStudents.length > 0) {
          console.log('First student fields:', Object.keys(firestoreStudents[0]))
          console.log('First student data:', firestoreStudents[0])
        }
        
        // Transform students without payment data (payment data will be calculated dynamically)
        const transformedStudents = firestoreStudents.map((student: any) => ({
          id: student.id,
          name: student.fullName || student.name || 'Unknown',
          grade: student.grade || student.assignedClass || 'N/A',
          class: student.class || student.assignedClass || 'N/A',
          parentName: student.guardianName || student.parentName || 'N/A',
          phone: student.contactNumber || student.phone || 'N/A',
          photoUrl: student.photoUrl || '',
          // Payment data will be calculated dynamically from feePayments collection
          amountPaid: 0,
          status: 'No Payment' as 'No Payment' | 'Partial Payment' | 'Full Payment'
        }))
        
        // Fetch classes
        const firestoreClasses = await classUtils.getClasses()
        console.log('Raw classes data:', firestoreClasses)
        
        const transformedClasses = firestoreClasses.map((cls: any) => ({
          id: cls.id,
          name: cls.name || 'Unknown Class',
          level: cls.level || 'Unknown Level',
          capacity: cls.capacity || 0,
          currentEnrollment: cls.currentEnrollment || 0
        })).sort((a, b) => {
          // First sort by education level
          const levelOrder = { 'Early Childhood': 1, 'Primary': 2, 'Junior High': 3 }
          const aLevel = levelOrder[a.level as keyof typeof levelOrder] || 99
          const bLevel = levelOrder[b.level as keyof typeof levelOrder] || 99
          
          if (aLevel !== bLevel) {
            return aLevel - bLevel
          }
          
          // Then sort by class name within the same level
          return a.name.localeCompare(b.name)
        })
        
        console.log('Transformed students:', transformedStudents)
        console.log('Transformed classes:', transformedClasses)
        setStudents(transformedStudents)
        setClasses(transformedClasses)
        
        // Load payment data for all students
        const studentsWithPayments = await Promise.all(
          transformedStudents.map(async (student) => {
            try {
              const paymentSummary = await feesUtils.getStudentPaymentSummary(
                student.id, 
                student.class,
                currentPeriod?.academicYear,
                currentPeriod?.term
              )
              return {
                ...student,
                amountPaid: paymentSummary.totalPaid,
                balance: paymentSummary.balance,
                status: paymentSummary.status as 'No Payment' | 'Partial Payment' | 'Full Payment',
                classFee: paymentSummary.classFee
              }
            } catch (error) {
              console.error(`Error loading payment data for student ${student.id}:`, error)
              // Ensure student has a status even if payment data fails to load
              return {
                ...student,
                amountPaid: 0,
                balance: 0,
                status: 'No Payment' as const,
                classFee: 0
              }
            }
          })
        )
        
        setStudents(studentsWithPayments)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load data. Please try again.')
        // Set some dummy data for testing
        setStudents([
          {
            id: '1',
            name: 'Test Student',
            grade: 'Grade 1',
            class: 'Class A',
            parentName: 'Test Parent',
            phone: '123-456-7890',
            balance: 0,
            photoUrl: ''
          }
        ])
        setClasses([
          {
            id: '1',
            name: 'Class A',
            level: 'Primary',
            capacity: 25,
            currentEnrollment: 20
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.phone.toLowerCase().includes(searchTerm.toLowerCase())
    
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
          return (student.balance || 0) > 0
        case 'paid':
          return (student.balance || 0) === 0
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
    // Sort by name alphabetically
    return a.name.localeCompare(b.name)
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
      
      // For other filters, just toggle them
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter)
      } else {
        return [...prev, filter]
      }
    })
  }

  const clearClassFilter = () => {
    setClassFilter('all')
  }


  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student)
    // You can add more logic here later for what displays after the click
    console.log('Student clicked:', student)
  }

  const handlePayFees = (student: Student) => {
    setSelectedStudent(student)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setShowPaymentModal(true)
  }

  const handleViewHistory = async (student: Student) => {
    setSelectedStudent(student)
    setShowHistoryModal(true)
    setLoadingHistory(true)
    
    try {
      // Always use current period for payment history
      const academicYear = currentPeriod?.academicYear || paymentPeriod.academicYear
      const term = currentPeriod?.term || paymentPeriod.term
      
      console.log(`Fetching payment history for ${student.name} in ${academicYear} - ${term}`)
      
      const payments = await feesUtils.getStudentPaymentsForPeriod(
        student.id,
        academicYear,
        term
      )
      setStudentPaymentHistory(payments)
      console.log(`Found ${payments.length} payments for ${student.name} in ${academicYear} - ${term}`)
    } catch (error) {
      console.error('Error fetching payment history:', error)
      setStudentPaymentHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!selectedStudent || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    setSavingPayment(true)
    try {
      const paymentValue = parseFloat(paymentAmount)
      
      // Record payment
      await feesUtils.recordPayment(
        selectedStudent.id,
        selectedStudent.name,
        paymentValue,
        paymentMethod,
        selectedStudent.class,
        paymentPeriod.academicYear,
        paymentPeriod.term
      )

      // Close modal
      setShowPaymentModal(false)
      setSelectedStudent(null)
      setPaymentAmount('')
      setPaymentMethod('cash')
      
      // Refresh all student data to get accurate payment status
      await refreshStudentPaymentData()
      
      alert(`Payment of ₵${paymentValue.toLocaleString()} recorded successfully!`)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment. Please try again.')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleSetFeesFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setSetFeesFormData(prev => ({
        ...prev,
        selectedClasses: checked 
          ? [...prev.selectedClasses, value]
          : prev.selectedClasses.filter(id => id !== value)
      }))
    } else {
      setSetFeesFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }


  // Smart Set Fee - adds selected classes to fee groups
  const handleSetFee = () => {
    if (setFeesFormData.selectedClasses.length === 0 || !setFeesFormData.feeAmount) {
      alert('Please select at least one class and enter a fee amount')
      return
    }

    const feeAmount = parseFloat(setFeesFormData.feeAmount)
    const selectedClassNames = setFeesFormData.selectedClasses.map(classId => 
      classes.find(c => c.id === classId)?.name
    ).filter(Boolean) as string[]

    // Check for duplicate classes in existing fee groups
    const duplicateClasses = setFeesFormData.selectedClasses.filter(classId => 
      feeGroups.some(group => group.classes.includes(classId))
    )

    if (duplicateClasses.length > 0) {
      const duplicateNames = duplicateClasses.map(classId => 
        classes.find(c => c.id === classId)?.name
      ).filter(Boolean)
      alert(`The following classes already have fees set: ${duplicateNames.join(', ')}. Please remove them from your selection or remove them from existing fee groups.`)
      return
    }

    // Add new fee group
    const newFeeGroup = {
      id: Date.now().toString(),
      classes: [...setFeesFormData.selectedClasses],
      classNames: selectedClassNames,
      feeAmount: feeAmount
    }

    setFeeGroups(prev => [...prev, newFeeGroup])

    // Reset form for next selection
    setSetFeesFormData(prev => ({
      ...prev,
      selectedClasses: [],
      feeAmount: ''
    }))

    alert(`Added fee group: ${selectedClassNames.join(', ')} - ₵${feeAmount.toLocaleString()}`)
  }

  // Remove fee group
  const handleRemoveFeeGroup = (groupId: string) => {
    setFeeGroups(prev => prev.filter(group => group.id !== groupId))
  }

  // Check if all classes have fees set
  const allClassesHaveFees = () => {
    if (classes.length === 0) return false
    const classesWithFees = new Set()
    feeGroups.forEach(group => {
      group.classes.forEach(classId => {
        classesWithFees.add(classId)
      })
    })
    return classesWithFees.size === classes.length
  }

  // Get classes without fees
  const getClassesWithoutFees = () => {
    const classesWithFees = new Set()
    feeGroups.forEach(group => {
      group.classes.forEach(classId => {
        classesWithFees.add(classId)
      })
    })
    return classes.filter(cls => !classesWithFees.has(cls.id))
  }

  // Final save - saves all fee groups to database
  const handleSetFees = async () => {
    if (!currentPeriod) {
      alert('Please select an academic period before setting fees')
      return
    }

    if (feeGroups.length === 0) {
      alert('Please add at least one fee group before saving')
      return
    }

    // Check if all classes have fees
    if (!allClassesHaveFees()) {
      const missingClasses = getClassesWithoutFees()
      const missingClassNames = missingClasses.map(cls => cls.name).join(', ')
      alert(`Please set fees for all classes before saving. Missing fees for: ${missingClassNames}`)
      return
    }

    // Check if fees already exist for this period
    const feesExist = await feesUtils.checkFeesExistForPeriod(
      currentPeriod.academicYear, 
      currentPeriod.term
    )
    
    if (feesExist) {
      const confirmOverwrite = window.confirm(
        `Fees already exist for ${currentPeriod.academicYear} - ${currentPeriod.term}. This will overwrite the existing fees. Are you sure you want to continue?`
      )
      if (!confirmOverwrite) {
        return
      }
    }

    setSavingFees(true)
    try {
      // Combine all fee groups into classFees array
      const allClassFees = feeGroups.flatMap(group => 
        group.classes.map(classId => {
          const classData = classes.find(c => c.id === classId)
          return {
            classId: classId,
            className: classData?.name || 'Unknown Class',
            feeAmount: group.feeAmount
          }
        })
      )

      console.log('Saving all fee groups:', feeGroups, 'Combined classFees:', allClassFees)

      // Store fees in the fees collection with year_term as document ID
      await feesUtils.createFeesForYearTerm(
        currentPeriod.academicYear,
        currentPeriod.term,
        allClassFees
      )
      
      // Show success message
      const totalClasses = allClassFees.length
      const uniqueFees = [...new Set(feeGroups.map(g => g.feeAmount))].sort((a, b) => a - b)
      const action = feesExist ? 'updated' : 'saved'
      alert(`Fees ${action} successfully for ${totalClasses} classes with ${uniqueFees.length} different fee amounts for ${currentPeriod.academicYear} ${currentPeriod.term}`)
      
      // Reset form and close modal
      setSetFeesFormData({
        selectedClasses: [],
        feeAmount: '',
        academicYear: new Date().getFullYear().toString(),
        term: '1st Term'
      })
      setFeeGroups([])
      setShowAddModal(false)

      // Refresh current period fees
      try {
        const periodFees = await feesUtils.getFeesForPeriod(
          currentPeriod.academicYear, 
          currentPeriod.term
        )
        setCurrentPeriodFees(periodFees)
      } catch (error) {
        console.error('Error refreshing current period fees:', error)
      }
      
    } catch (error) {
      console.error('Error setting fees:', error)
      alert('Failed to set fees. Please try again.')
    } finally {
      setSavingFees(false)
    }
  }



  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Loading students data...
            </p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              There was an error loading the data
            </p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Data</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Redirect teachers away from the Fees management page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      {/* No fees set notification */}
      {currentPeriod && !currentPeriodFees && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No fees set for current period
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  No fees have been set for {currentPeriod.academicYear} - {currentPeriod.term}. 
                  Click "Set Fees" to configure fees for this academic period.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
          {currentPeriod && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                📅 {currentPeriod.academicYear} - {currentPeriod.term}
              </div>
              <p className="text-sm text-gray-500">
                Showing data for this period only
              </p>
            </div>
          )}
        </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button 
              onClick={refreshStudentPaymentData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Search className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!currentPeriod}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPeriod 
                  ? 'text-white bg-blue-600 hover:bg-blue-700' 
                  : 'text-gray-400 bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Set Fees
            </button>
          </div>
      </div>


      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search students by name, grade, parent, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Chips */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Filters:</p>
            <div className="flex flex-wrap gap-2">
              {/* Payment Filters */}
              {[
                { key: 'owing', label: 'Owing (₵)', color: 'bg-red-100 text-red-800' },
                { key: 'paid', label: 'Fully Paid', color: 'bg-green-100 text-green-800' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => toggleFilter(filter.key)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
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
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    classFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(classFilter)
                      ? 'bg-pink-100 text-pink-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {classFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(classFilter) 
                    ? classFilter 
                    : 'Early Childhood'
                  }
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              
              {/* Primary Filter with Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => toggleFilter('primary')}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    classFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(classFilter)
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {classFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(classFilter) 
                    ? classFilter 
                    : 'Primary Level'
                  }
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              
              {/* JHS Filter with Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => toggleFilter('jhs')}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    classFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(classFilter)
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {classFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(classFilter) 
                    ? classFilter 
                    : 'JHS Level'
                  }
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              
              {/* Clear All Filters */}
              {selectedFilters.length > 0 && (
                <button
                  onClick={() => setSelectedFilters([])}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Students
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Click on a student to view their fee information
          </p>
        </div>
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding students to the system.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <li key={student.id}>
                  <div 
                    className="px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleStudentClick(student)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt={student.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1 flex justify-between items-center">
                        <div>
                          <p className="text-base font-semibold text-gray-900">
                            {student.name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Class: {student.class}
                          </p>
                        </div>
                        <div className="text-right">
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                              student.status === 'Full Payment' ? 'bg-green-100 text-green-800' :
                              student.status === 'Partial Payment' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.status || 'No Payment'}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handlePayFees(student)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Pay Fees
                              </button>
                              <button
                                onClick={() => handleViewHistory(student)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                History
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>


      {/* Set Fees Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Set Fees - Incremental Mode</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                disabled={savingFees}
                className={`${
                  savingFees 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!currentPeriod ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Period Selected</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Please select an academic period from the header before setting fees.
                  </p>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form className="space-y-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Classes <span className="text-red-500">*</span> (Multiple Selection)
                  </label>
                  <div className="bg-white border border-gray-300 rounded-md p-4">
                    {classes.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No classes available</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Early Childhood Classes */}
                        {classes.filter(cls => cls.level === 'Early Childhood').length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-1">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Early Childhood
                              </h4>
                              <input
                                type="checkbox"
                                checked={classes.filter(cls => cls.level === 'Early Childhood').every(cls => 
                                  setFeesFormData.selectedClasses.includes(cls.id)
                                )}
                                onChange={() => {
                                  const earlyChildhoodClasses = classes.filter(cls => cls.level === 'Early Childhood')
                                  const allSelected = earlyChildhoodClasses.every(cls => 
                                    setFeesFormData.selectedClasses.includes(cls.id)
                                  )
                                  
                                  if (allSelected) {
                                    // Deselect all Early Childhood classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: prev.selectedClasses.filter(id => 
                                        !earlyChildhoodClasses.some(cls => cls.id === id)
                                      )
                                    }))
                                  } else {
                                    // Select all Early Childhood classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: [
                                        ...prev.selectedClasses.filter(id => 
                                          !earlyChildhoodClasses.some(cls => cls.id === id)
                                        ),
                                        ...earlyChildhoodClasses.map(cls => cls.id)
                                      ]
                                    }))
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {classes
                                .filter(cls => cls.level === 'Early Childhood')
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((cls) => {
                                  const isAlreadyInFeeGroup = feeGroups.some(group => group.classes.includes(cls.id))
                                  return (
                                    <label key={cls.id} className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${isAlreadyInFeeGroup ? 'opacity-50' : ''}`}>
                                      <input
                                        type="checkbox"
                                        value={cls.id}
                                        checked={setFeesFormData.selectedClasses.includes(cls.id)}
                                        disabled={isAlreadyInFeeGroup}
                                        onChange={handleSetFeesFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1">
                                        <span className={`text-sm font-medium ${isAlreadyInFeeGroup ? 'text-gray-400' : 'text-gray-900'}`}>
                                          {cls.name}
                                          {isAlreadyInFeeGroup && ' (Already set)'}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                          {cls.currentEnrollment}/{cls.capacity} students
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                            </div>
                          </div>
                        )}

                        {/* Primary Classes */}
                        {classes.filter(cls => cls.level === 'Primary').length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-1">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Primary
                              </h4>
                              <input
                                type="checkbox"
                                checked={classes.filter(cls => cls.level === 'Primary').every(cls => 
                                  setFeesFormData.selectedClasses.includes(cls.id)
                                )}
                                onChange={() => {
                                  const primaryClasses = classes.filter(cls => cls.level === 'Primary')
                                  const allSelected = primaryClasses.every(cls => 
                                    setFeesFormData.selectedClasses.includes(cls.id)
                                  )
                                  
                                  if (allSelected) {
                                    // Deselect all Primary classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: prev.selectedClasses.filter(id => 
                                        !primaryClasses.some(cls => cls.id === id)
                                      )
                                    }))
                                  } else {
                                    // Select all Primary classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: [
                                        ...prev.selectedClasses.filter(id => 
                                          !primaryClasses.some(cls => cls.id === id)
                                        ),
                                        ...primaryClasses.map(cls => cls.id)
                                      ]
                                    }))
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {classes
                                .filter(cls => cls.level === 'Primary')
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((cls) => {
                                  const isAlreadyInFeeGroup = feeGroups.some(group => group.classes.includes(cls.id))
                                  return (
                                    <label key={cls.id} className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${isAlreadyInFeeGroup ? 'opacity-50' : ''}`}>
                                      <input
                                        type="checkbox"
                                        value={cls.id}
                                        checked={setFeesFormData.selectedClasses.includes(cls.id)}
                                        disabled={isAlreadyInFeeGroup}
                                        onChange={handleSetFeesFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1">
                                        <span className={`text-sm font-medium ${isAlreadyInFeeGroup ? 'text-gray-400' : 'text-gray-900'}`}>
                                          {cls.name}
                                          {isAlreadyInFeeGroup && ' (Already set)'}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                          {cls.currentEnrollment}/{cls.capacity} students
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                            </div>
                          </div>
                        )}

                        {/* Junior High Classes */}
                        {classes.filter(cls => cls.level === 'Junior High').length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-1">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Junior High
                              </h4>
                              <input
                                type="checkbox"
                                checked={classes.filter(cls => cls.level === 'Junior High').every(cls => 
                                  setFeesFormData.selectedClasses.includes(cls.id)
                                )}
                                onChange={() => {
                                  const juniorHighClasses = classes.filter(cls => cls.level === 'Junior High')
                                  const allSelected = juniorHighClasses.every(cls => 
                                    setFeesFormData.selectedClasses.includes(cls.id)
                                  )
                                  
                                  if (allSelected) {
                                    // Deselect all Junior High classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: prev.selectedClasses.filter(id => 
                                        !juniorHighClasses.some(cls => cls.id === id)
                                      )
                                    }))
                                  } else {
                                    // Select all Junior High classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: [
                                        ...prev.selectedClasses.filter(id => 
                                          !juniorHighClasses.some(cls => cls.id === id)
                                        ),
                                        ...juniorHighClasses.map(cls => cls.id)
                                      ]
                                    }))
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {classes
                                .filter(cls => cls.level === 'Junior High')
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((cls) => {
                                  const isAlreadyInFeeGroup = feeGroups.some(group => group.classes.includes(cls.id))
                                  return (
                                    <label key={cls.id} className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${isAlreadyInFeeGroup ? 'opacity-50' : ''}`}>
                                      <input
                                        type="checkbox"
                                        value={cls.id}
                                        checked={setFeesFormData.selectedClasses.includes(cls.id)}
                                        disabled={isAlreadyInFeeGroup}
                                        onChange={handleSetFeesFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1">
                                        <span className={`text-sm font-medium ${isAlreadyInFeeGroup ? 'text-gray-400' : 'text-gray-900'}`}>
                                          {cls.name}
                                          {isAlreadyInFeeGroup && ' (Already set)'}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                          {cls.currentEnrollment}/{cls.capacity} students
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                            </div>
                          </div>
                        )}

                        {/* Other Classes */}
                        {classes.filter(cls => !['Early Childhood', 'Primary', 'Junior High'].includes(cls.level)).length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-1">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Other Classes
                              </h4>
                              <input
                                type="checkbox"
                                checked={classes.filter(cls => !['Early Childhood', 'Primary', 'Junior High'].includes(cls.level)).every(cls => 
                                  setFeesFormData.selectedClasses.includes(cls.id)
                                )}
                                onChange={() => {
                                  const otherClasses = classes.filter(cls => !['Early Childhood', 'Primary', 'Junior High'].includes(cls.level))
                                  const allSelected = otherClasses.every(cls => 
                                    setFeesFormData.selectedClasses.includes(cls.id)
                                  )
                                  
                                  if (allSelected) {
                                    // Deselect all Other classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: prev.selectedClasses.filter(id => 
                                        !otherClasses.some(cls => cls.id === id)
                                      )
                                    }))
                                  } else {
                                    // Select all Other classes
                                    setSetFeesFormData(prev => ({
                                      ...prev,
                                      selectedClasses: [
                                        ...prev.selectedClasses.filter(id => 
                                          !otherClasses.some(cls => cls.id === id)
                                        ),
                                        ...otherClasses.map(cls => cls.id)
                                      ]
                                    }))
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {classes
                                .filter(cls => !['Early Childhood', 'Primary', 'Junior High'].includes(cls.level))
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((cls) => {
                                  const isAlreadyInFeeGroup = feeGroups.some(group => group.classes.includes(cls.id))
                                  return (
                                    <label key={cls.id} className={`flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${isAlreadyInFeeGroup ? 'opacity-50' : ''}`}>
                                      <input
                                        type="checkbox"
                                        value={cls.id}
                                        checked={setFeesFormData.selectedClasses.includes(cls.id)}
                                        disabled={isAlreadyInFeeGroup}
                                        onChange={handleSetFeesFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1">
                                        <span className={`text-sm font-medium ${isAlreadyInFeeGroup ? 'text-gray-400' : 'text-gray-900'}`}>
                                          {cls.name}
                                          {isAlreadyInFeeGroup && ' (Already set)'}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                          {cls.level} • {cls.currentEnrollment}/{cls.capacity} students
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {setFeesFormData.selectedClasses.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                      {setFeesFormData.selectedClasses.length} class(es) selected
                    </p>
                  )}
                </div>
                
                {/* Academic Year and Term */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <div className="w-full px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-blue-900 font-medium text-center">
                      {currentPeriod ? currentPeriod.academicYear : setFeesFormData.academicYear}
                    </div>
                    {currentPeriod && (
                      <p className="text-xs text-blue-600 mt-1">
                        Current active period
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term <span className="text-red-500">*</span>
                    </label>
                    <div className="w-full px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-blue-900 font-medium text-center">
                      {currentPeriod ? currentPeriod.term : setFeesFormData.term}
                    </div>
                    {currentPeriod && (
                      <p className="text-xs text-blue-600 mt-1">
                        Current active period
                      </p>
                    )}
                  </div>
                </div>


                {/* Fee Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fee Amount for Selected Classes (₵) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="feeAmount"
                    value={setFeesFormData.feeAmount}
                    onChange={handleSetFeesFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter fee amount"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Progress Indicator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-blue-900">Fee Setup Progress</h3>
                    <span className="text-sm text-blue-700">
                      {(() => {
                        const classesWithFees = new Set()
                        feeGroups.forEach(group => {
                          group.classes.forEach(classId => {
                            classesWithFees.add(classId)
                          })
                        })
                        return `${classesWithFees.size} / ${classes.length} classes`
                      })()}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const classesWithFees = new Set()
                          feeGroups.forEach(group => {
                            group.classes.forEach(classId => {
                              classesWithFees.add(classId)
                            })
                          })
                          return classes.length > 0 ? (classesWithFees.size / classes.length) * 100 : 0
                        })()}%`
                      }}
                    ></div>
                  </div>
                  {!allClassesHaveFees() && (
                    <p className="text-xs text-blue-700 mt-2">
                      {(() => {
                        const missingClasses = getClassesWithoutFees()
                        return missingClasses.length > 0 
                          ? `Still need fees for: ${missingClasses.map(cls => cls.name).join(', ')}`
                          : 'All classes have fees set!'
                      })()}
                    </p>
                  )}
                </div>

                {/* Current Fee Groups Display */}
                {feeGroups.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Fee Groups
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                      {feeGroups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              {group.classNames.join(', ')}
                            </span>
                            <span className="ml-2 text-sm text-blue-600 font-semibold">
                              ₵{group.feeAmount.toLocaleString()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeeGroup(group.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove this fee group"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                </form>
              )}
            </div>
            
            {/* Footer - only show if currentPeriod exists */}
            {currentPeriod && (
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={handleSetFee}
                  disabled={savingFees}
                  className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    savingFees 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {savingFees ? 'Saving...' : 'Set Fee'}
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={savingFees}
                    className={`px-4 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      savingFees
                        ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSetFees}
                    disabled={!allClassesHaveFees() || savingFees}
                    className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      allClassesHaveFees() && !savingFees
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {savingFees ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : allClassesHaveFees() ? (
                      'Save'
                    ) : (
                      'Save (All Classes Required)'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Payment
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedStudent(null)
                  setPaymentAmount('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Student Information</h4>
                <p className="text-sm text-gray-600">Name: {selectedStudent.name}</p>
                <p className="text-sm text-gray-600">Class: {selectedStudent.class}</p>
                <p className="text-sm text-gray-600">Parent: {selectedStudent.parentName}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Payment Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Fee:</span>
                    <span className="ml-2 font-medium">₵{(() => {
                      // Get fee from current period
                      if (currentPeriodFees?.classFees) {
                        const classFeeData = currentPeriodFees.classFees.find((cf: any) => cf.className === selectedStudent.class);
                        if (classFeeData) {
                          return classFeeData.feeAmount.toLocaleString();
                        }
                      }
                      return '0';
                    })()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="ml-2 font-medium text-green-600">₵{(selectedStudent.amountPaid || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Balance:</span>
                    <span className={`ml-2 font-medium ${(selectedStudent.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₵{(selectedStudent.balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedStudent.status === 'Full Payment' ? 'bg-green-100 text-green-800' :
                      selectedStudent.status === 'Partial Payment' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedStudent.status || 'No Payment'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (₵)
                </label>
                <input
                  type="number"
                  min="0"
                  max={(() => {
                    // Get fee from current period
                    if (currentPeriodFees?.classFees) {
                      const classFeeData = currentPeriodFees.classFees.find((cf: any) => cf.className === selectedStudent.class);
                      if (classFeeData) {
                        return selectedStudent.balance || classFeeData.feeAmount;
                      }
                    }
                    return selectedStudent.balance || 0;
                  })()}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: ₵{(() => {
                    // Get fee from current period
                    if (currentPeriodFees?.classFees) {
                      const classFeeData = currentPeriodFees.classFees.find((cf: any) => cf.className === selectedStudent.class);
                      if (classFeeData) {
                        return (selectedStudent.balance || classFeeData.feeAmount).toLocaleString();
                      }
                    }
                    return (selectedStudent.balance || 0).toLocaleString();
                  })()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="cash">Cash</option>
                  <option value="momo">MoMo</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Period
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={paymentPeriod.academicYear}
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={paymentPeriod.term}
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Payment period is locked to the current selected period for fees
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedStudent(null)
                  setPaymentAmount('')
                  setPaymentMethod('cash')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || savingPayment}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPayment ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Recording...</span>
                  </div>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payment History
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedStudent.name} - {selectedStudent.class}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedStudent(null)
                  setStudentPaymentHistory([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading payment history...</span>
                </div>
              ) : studentPaymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                  <p className="text-gray-500">
                    {selectedStudent.name} has not made any payments for {currentPeriod?.academicYear || paymentPeriod.academicYear} - {currentPeriod?.term || paymentPeriod.term}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Period Summary</h4>
                        <p className="text-sm text-blue-700">
                          {currentPeriod?.academicYear || paymentPeriod.academicYear} - {currentPeriod?.term || paymentPeriod.term}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-900">
                          ₵{studentPaymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-blue-700">
                          {studentPaymentHistory.length} payment{studentPaymentHistory.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {studentPaymentHistory.map((payment, index) => (
                      <div key={payment.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-green-600">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                ₵{payment.amount?.toLocaleString() || '0'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payment.paymentMethod?.replace('_', ' ').toUpperCase() || 'Unknown Method'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Unknown Date'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {payment.createdAt ? new Date(payment.createdAt).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedStudent(null)
                  setStudentPaymentHistory([])
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Fees

