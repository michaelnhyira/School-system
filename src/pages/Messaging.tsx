import { MessageSquare, CheckCircle, XCircle, Users, BarChart3, Bold, Italic, Underline, List, ListOrdered, ArrowRight, ArrowLeft, X as Close, Search, Filter, Send, AlertCircle, CreditCard, Plus } from 'lucide-react'
import PaystackPayment from '../components/PaystackPayment'
import PaymentCallback from '../components/PaymentCallback'

import { useState, useEffect } from 'react'
import { CLASS_OPTIONS_WITH_LABELS, CLASS_LEVELS } from '../constants/classes'
import { studentUtils, classUtils } from '../utils/firebaseUtils'
import { arkaselUtils } from '../utils/arkaselUtils'
import { useSMSPoints } from '../contexts/SMSPointsContext'
import { useSMSPricing } from '../contexts/SMSPricingContext'
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

const Messaging = () => {
  const { isTeacher } = useAuth()
  const { smsPoints, loading: smsPointsLoading, deductPoints } = useSMSPoints()
  const { pricing, calculateCost } = useSMSPricing()
  
  const [showParentsModal, setShowParentsModal] = useState(false)
  const [subject, setSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [bodyError, setBodyError] = useState(false)
  const [greeting, setGreeting] = useState('Dear Parent/Guardian of {studentName},')
  const [regards, setRegards] = useState('Best regards,\nSchool Management')
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1)
  const [messageType, setMessageType] = useState<'individual' | 'class' | null>(null)
  
  // SMS Top-up modal state
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [showPaystackModal, setShowPaystackModal] = useState(false)
  const [selectedPoints, setSelectedPoints] = useState(0)
  const [selectedAmount, setSelectedAmount] = useState(0)
  
  // Payment callback state
  const [showPaymentCallback, setShowPaymentCallback] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')

  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [modalSelectedFilters, setModalSelectedFilters] = useState<string[]>([])
  const [modalClassFilter, setModalClassFilter] = useState('all')
  const [students, setStudents] = useState<any[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  const [selectedMessageClasses, setSelectedMessageClasses] = useState<string[]>([])
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


  // Message sending state
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messageStatus, setMessageStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [sendResults, setSendResults] = useState<any[]>([])

  // SMS Points management functions

  const canSendSMS = (recipientCount: number): boolean => {
    if (!smsPoints) return false
    return smsPoints.remainingPoints >= recipientCount
  }

  const getSMSStatusColor = () => {
    if (!smsPoints) return 'text-gray-500'
    if (smsPoints.remainingPoints === 0) return 'text-red-500'
    if (smsPoints.remainingPoints < 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  const handlePurchasePoints = (points: number) => {
    if (!pricing) return
    
    const amount = calculateCost(points)
    setSelectedPoints(points)
    setSelectedAmount(amount)
    setShowPaystackModal(true)
  }

  const handlePaystackSuccess = async (reference: string) => {
    // This will be called when payment is successful
    console.log('Payment successful with reference:', reference);
    setShowPaystackModal(false);
    setShowPaymentCallback(true);
    setPaymentReference(reference);
  }

  const handlePaymentCallbackComplete = (success: boolean) => {
    setShowPaymentCallback(false);
    if (success) {
      alert('Payment completed successfully! SMS points have been added to your account.');
    } else {
      alert('Payment verification failed. Please contact support if you were charged.');
    }
  }

  // Check for payment callback in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const status = urlParams.get('status');
    
    if (reference && status === 'success') {
      setShowPaymentCallback(true);
      setPaymentReference(reference);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);


  useEffect(() => {
    if (!showParentsModal) return
    let cancelled = false
    const load = async () => {
      if (students.length > 0) return
      try {
        setStudentsLoading(true)
        const firestoreStudents = await studentUtils.getStudents()
        if (cancelled) return
        const mapped = firestoreStudents.map((s: any) => ({
          id: s.id,
          name: s.fullName || s.name || '',
          guardianContact: s.guardianContact || '',
          grade: s.grade || s.assignedClass || '',
          parentName: s.guardianName || s.parentName || ''
        }))
        setStudents(mapped)
      } catch (e) {
        console.error('Error loading students for messaging modal:', e)
      } finally {
        if (!cancelled) setStudentsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [showParentsModal])

  const filteredModalStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                          student.grade.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                          student.parentName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                          student.guardianContact?.toLowerCase().includes(modalSearchTerm.toLowerCase())

    const matchesClass = modalClassFilter === 'all' || student.grade === modalClassFilter

    if (modalSelectedFilters.length === 0) {
      return matchesSearch && matchesClass
    }

    const paymentFilters = modalSelectedFilters.filter(f => f === 'owing' || f === 'paid')
    const levelFilters = modalSelectedFilters.filter(f => f === 'early-childhood' || f === 'primary' || f === 'jhs')

    const matchesPayment = paymentFilters.length === 0 || paymentFilters.some(filter => {
      switch (filter) {
        case 'owing':
          return false
        case 'paid':
          return true
        default:
          return false
      }
    })

    const matchesLevel = levelFilters.length === 0 || levelFilters.some(filter => {
      switch (filter) {
        case 'early-childhood':
          return student.grade.startsWith('Creche') || student.grade.startsWith('Nursery') || student.grade.startsWith('Kindergarten')
        case 'primary':
          return student.grade.startsWith('Primary')
        case 'jhs':
          return student.grade.startsWith('JHS')
        default:
          return false
      }
    })

    return matchesSearch && matchesClass && matchesPayment && matchesLevel
  }).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))


  const toggleModalFilter = (filter: string) => {
    setModalSelectedFilters(prev => {
      if (filter === 'owing' || filter === 'paid') {
        if (prev.includes(filter)) return prev.filter(f => f !== filter)
        const other = filter === 'owing' ? 'paid' : 'owing'
        return prev.filter(f => f !== other).concat(filter)
      }
      return prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    })
  }

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleMessageClassSelection = (className: string) => {
    setSelectedMessageClasses(prev => prev.includes(className) ? prev.filter(x => x !== className) : [...prev, className])
  }


  const handleSelectMessageType = (type: 'individual' | 'class') => {
    setMessageType(type)
    setModalStep(2)
  }

  const handleNextFromCompose = () => {
    if (!messageBody.trim()) {
      setBodyError(true)
      return
    }
    setBodyError(false)
    setModalStep(3)
  }

  const handleNextFromRecipients = () => {
    setModalStep(4)
  }


  // Handle sending messages via Arkasel
  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      alert('Please fill in the message content')
      return
    }

    if (selectedRecipientIds.length === 0) {
      alert('Please select at least one recipient')
      return
    }

    // Check SMS points before sending
    if (!canSendSMS(selectedRecipientIds.length)) {
      alert(`Insufficient SMS points. You need ${selectedRecipientIds.length} points but only have ${smsPoints?.remainingPoints || 0} remaining. Please top up your SMS points.`)
      return
    }

    setIsSendingMessage(true)
    setMessageStatus('sending')
    setSendResults([])

    try {
      const results = []
      const fullMessage = subject ? `${subject}\n\n${messageBody}` : messageBody
      let successfulSends = 0

      for (const studentId of selectedRecipientIds) {
        const student = students.find(s => s.id === studentId)
        if (student && student.guardianContact) {
          // Validate and format phone number
          const { isValid, formatted } = arkaselUtils.validateAndFormatPhone(student.guardianContact)
          
          if (isValid) {
            // Create custom message with editable greeting and regards
            const processedGreeting = greeting.replace('{studentName}', student.name)
            const customMessage = `${processedGreeting}\n\n${fullMessage}\n\n${regards}`
            
            const result = await arkaselUtils.sendSMS(
              formatted,
              customMessage
            )
            console.log('SMS Result for', student.name, ':', result)
            
            const isSuccess = result.code === '200' || result.message?.includes('Successfully Sent')
            if (isSuccess) {
              successfulSends++
            }
            
            results.push({
              studentName: student.name,
              phone: formatted,
              success: isSuccess,
              message: result.message,
              response: result
            })
          } else {
            results.push({
              studentName: student.name,
              phone: student.guardianContact,
              success: false,
              message: 'Invalid phone number format',
              response: null
            })
          }
        } else {
          results.push({
            studentName: student?.name || 'Unknown',
            phone: student?.guardianContact || 'No contact',
            success: false,
            message: 'No guardian contact found',
            response: null
          })
        }
      }

      // Deduct SMS points only for successful sends
      if (successfulSends > 0) {
        const pointsDeducted = await deductPoints(successfulSends)
        if (!pointsDeducted) {
          console.warn('Failed to deduct SMS points, but messages were sent')
        }
      }

      setSendResults(results)
      setMessageStatus('success')
      
      // Show success message
      const successCount = results.filter(r => r.success).length
      alert(`Message sent successfully to ${successCount} out of ${results.length} recipients. ${successCount} SMS points deducted.`)
      
    } catch (error) {
      console.error('Error sending messages:', error)
      setMessageStatus('error')
      alert('Failed to send messages. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }


  // Redirect teachers away from the Messaging page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messaging</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send SMS and email messages to parents, students, and teachers
          </p>
        </div>
        
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sent</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Delivered</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">SMS Points</dt>
                  <dd className={`text-lg font-medium ${getSMSStatusColor()}`}>
                    {smsPointsLoading ? '...' : smsPoints?.remainingPoints || 0}
                  </dd>
                </dl>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="ml-2 p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Purchase SMS points with Paystack"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging Center Interface */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Messaging Center</h2>
            <p className="mt-2 text-base text-gray-500">Manage and send communications to parents and students.</p>
          </div>
          <div className="flex justify-center">
            <div className="bg-gray-50 p-8 rounded-xl flex flex-col items-center text-center max-w-lg">
              <div className="bg-blue-100 p-6 rounded-full mb-6">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">General Message to Parents</h3>
              <p className="text-gray-500 mb-6">Broadcast announcements or general information to all parents.</p>
              <button 
                onClick={() => {
                  if (!smsPoints || smsPoints.remainingPoints === 0) {
                    alert('No SMS points available. Please top up your SMS points first.')
                    return
                  }
                setShowParentsModal(true)
                setModalStep(1)
                setMessageType(null)
                setSubject('')
                setMessageBody('')
                setGreeting('Dear Parent/Guardian of {studentName},')
                setRegards('Best regards,\nSchool Management')
                setSelectedRecipientIds([])
                setSelectedMessageClasses([])
                setBodyError(false)
                }} 
                disabled={!smsPoints || smsPoints.remainingPoints === 0}
                className={`w-full font-bold py-3 px-6 rounded-lg transition-colors text-lg ${
                  !smsPoints || smsPoints.remainingPoints === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                {!smsPoints || smsPoints.remainingPoints === 0 ? 'No SMS Points Available' : 'Compose & Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* General Message to Parents Modal */}
      {showParentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-4xl h-[95vh] sm:h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
              <div className="px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">General Message to Parents</h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500 hidden sm:block">Follow the steps to compose and send your message.</p>
                </div>
                <button
                  className="p-2 rounded hover:bg-gray-100"
                  onClick={() => {
                    setShowParentsModal(false)
                    setModalStep(1)
                    setMessageType(null)
                    setSubject('')
                    setMessageBody('')
                    setGreeting('Dear Parent/Guardian of {studentName},')
                    setRegards('Best regards,\nSchool Management')
                    setSelectedRecipientIds([])
                    setSelectedMessageClasses([])
                    setBodyError(false)
                    setMessageStatus('idle')
                    setSendResults([])
                    setIsSendingMessage(false)
                  }}
                  aria-label="Close"
                >
                  <Close className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Steps */}
              <div className="px-3 sm:px-6 py-2 sm:py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className={`flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full text-xs sm:text-sm font-bold ${modalStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>1</div>
                    <span className={`text-xs sm:text-sm hidden sm:inline ${modalStep === 1 ? 'font-bold text-blue-600' : 'text-gray-500'}`}>Select Type</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2 sm:mx-4"></div>
                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className={`flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full text-xs sm:text-sm font-bold ${modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>2</div>
                    <span className={`text-xs sm:text-sm hidden sm:inline ${modalStep === 2 ? 'font-bold text-blue-600' : 'text-gray-500'}`}>Compose</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2 sm:mx-4"></div>
                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className={`flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full text-xs sm:text-sm font-bold ${modalStep === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>3</div>
                    <span className={`text-xs sm:text-sm hidden sm:inline ${modalStep === 3 ? 'font-bold text-blue-600' : 'text-gray-500'}`}>Recipients</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2 sm:mx-4"></div>
                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className={`flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full text-xs sm:text-sm font-bold ${modalStep === 4 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>4</div>
                    <span className={`text-xs sm:text-sm hidden sm:inline ${modalStep === 4 ? 'font-bold text-blue-600' : 'text-gray-500'}`}>Preview</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-3 sm:px-6 flex-1 overflow-y-auto">
                {modalStep === 1 && (
                  <div>
                    <div className="text-center mb-6 sm:mb-8">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Select Message Type</h3>
                      <p className="text-xs sm:text-sm text-gray-500">Choose how you want to send the message</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
                      <button
                        onClick={() => handleSelectMessageType('individual')}
                        className="p-4 sm:p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <div className="text-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-blue-200 transition-colors">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                          </div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Individual Messages</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Select specific students to send individual messages to their parents</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSelectMessageType('class')}
                        className="p-4 sm:p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <div className="text-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-blue-200 transition-colors">
                            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                          </div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Class Messages</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Send messages to all parents in selected classes</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {modalStep === 2 && (
                  <div>
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-medium mb-1" htmlFor="parents-subject">Subject (Optional)</label>
                      <input
                        id="parents-subject"
                        name="subject"
                        type="text"
                        placeholder="e.g., Important School Announcement"
                        className="w-full bg-gray-100 border-gray-200 rounded-lg focus:ring-blue-600 focus:border-blue-600 text-sm"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-medium mb-1" htmlFor="greeting">Greeting</label>
                      <input
                        id="greeting"
                        name="greeting"
                        type="text"
                        placeholder="e.g., Dear Parent/Guardian of {studentName},"
                        className="w-full bg-gray-100 border-gray-200 rounded-lg focus:ring-blue-600 focus:border-blue-600 text-sm"
                        value={greeting}
                        onChange={(e) => setGreeting(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-gray-500">Use {`{studentName}`} as a placeholder for the student's name</p>
                    </div>
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-medium mb-1">Message</label>
                      <div className={`rounded-lg border ${bodyError ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-100'}`}>
                        <div className="flex items-center p-1 sm:p-2 border-b border-gray-200">
                          <button type="button" className="p-1 sm:p-2 rounded hover:bg-white" aria-label="Bold"><Bold className="h-3 w-3 sm:h-4 sm:w-4" /></button>
                          <button type="button" className="p-1 sm:p-2 rounded hover:bg-white" aria-label="Italic"><Italic className="h-3 w-3 sm:h-4 sm:w-4" /></button>
                          <button type="button" className="p-1 sm:p-2 rounded hover:bg-white" aria-label="Underline"><Underline className="h-3 w-3 sm:h-4 sm:w-4" /></button>
                          <button type="button" className="p-1 sm:p-2 rounded hover:bg-white" aria-label="Bulleted List"><List className="h-3 w-3 sm:h-4 sm:w-4" /></button>
                          <button type="button" className="p-1 sm:p-2 rounded hover:bg-white" aria-label="Numbered List"><ListOrdered className="h-3 w-3 sm:h-4 sm:w-4" /></button>
                        </div>
                        <textarea
                          className="w-full h-32 sm:h-48 p-3 sm:p-4 bg-transparent focus:outline-none resize-none text-sm"
                          placeholder="Type your message here..."
                          value={messageBody}
                          onChange={(e) => {
                            setMessageBody(e.target.value)
                            if (bodyError && e.target.value.trim()) setBodyError(false)
                          }}
                        />
                      </div>
                      {bodyError && <p className="mt-1 text-xs text-red-600">Please type a message before continuing.</p>}
                    </div>
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-medium mb-1" htmlFor="regards">Closing</label>
                      <textarea
                        id="regards"
                        name="regards"
                        rows={2}
                        placeholder="e.g., Best regards,&#10;School Management"
                        className="w-full bg-gray-100 border-gray-200 rounded-lg focus:ring-blue-600 focus:border-blue-600 text-sm"
                        value={regards}
                        onChange={(e) => setRegards(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {modalStep === 3 && messageType === 'individual' && (
                  <div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Search students..."
                          value={modalSearchTerm}
                          onChange={(e) => setModalSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Filter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={modalClassFilter}
                          onChange={(e) => setModalClassFilter(e.target.value)}
                        >
                          <option value="all">All Classes</option>
                          {CLASS_OPTIONS_WITH_LABELS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Payment</p>
                        <div className="flex flex-wrap gap-2">
                          {['owing','paid'].map((status) => (
                            <button
                              key={status}
                              onClick={() => toggleModalFilter(status)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                modalSelectedFilters.includes(status)
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-gray-50 text-gray-700 border-gray-300'
                              }`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Level</p>
                        <div className="flex flex-wrap gap-2">
                          {/* Early Childhood Filter with Dropdown */}
                          <div className="relative inline-block">
                            <button
                              onClick={() => toggleModalFilter('early-childhood')}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                modalClassFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(modalClassFilter)
                                  ? 'bg-pink-100 text-pink-800 border-pink-300'
                                  : modalSelectedFilters.includes('early-childhood')
                                  ? 'bg-pink-100 text-pink-800 border-pink-300'
                                  : 'bg-gray-50 text-gray-700 border-gray-300'
                              }`}
                            >
                              {modalClassFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(modalClassFilter) 
                                ? modalClassFilter 
                                : 'Early Childhood'
                              }
                              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {modalClassFilter !== 'all' && ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].includes(modalClassFilter) && (
                                <span 
                                  className="ml-1 text-xs cursor-pointer hover:bg-pink-200 rounded-full px-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModalClassFilter('all')
                                  }}
                                >
                                  ×
                                </span>
                              )}
                            </button>
                            {modalSelectedFilters.includes('early-childhood') && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  {['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'].map((className) => (
                                    <button
                                      key={className}
                                      onClick={() => {
                                        setModalClassFilter(className)
                                        setModalSelectedFilters(prev => prev.filter(f => f !== 'early-childhood'))
                                      }}
                                      className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${
                                        modalClassFilter === className ? 'bg-gray-100' : ''
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
                              onClick={() => toggleModalFilter('primary')}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                modalClassFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(modalClassFilter)
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : modalSelectedFilters.includes('primary')
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : 'bg-gray-50 text-gray-700 border-gray-300'
                              }`}
                            >
                              {modalClassFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(modalClassFilter) 
                                ? modalClassFilter 
                                : 'Primary Level'
                              }
                              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {modalClassFilter !== 'all' && ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].includes(modalClassFilter) && (
                                <span 
                                  className="ml-1 text-xs cursor-pointer hover:bg-purple-200 rounded-full px-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModalClassFilter('all')
                                  }}
                                >
                                  ×
                                </span>
                              )}
                            </button>
                            {modalSelectedFilters.includes('primary') && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  {['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].map((className) => (
                                    <button
                                      key={className}
                                      onClick={() => {
                                        setModalClassFilter(className)
                                        setModalSelectedFilters(prev => prev.filter(f => f !== 'primary'))
                                      }}
                                      className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${
                                        modalClassFilter === className ? 'bg-gray-100' : ''
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
                              onClick={() => toggleModalFilter('jhs')}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                modalClassFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(modalClassFilter)
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : modalSelectedFilters.includes('jhs')
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : 'bg-gray-50 text-gray-700 border-gray-300'
                              }`}
                            >
                              {modalClassFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(modalClassFilter) 
                                ? modalClassFilter 
                                : 'JHS Level'
                              }
                              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {modalClassFilter !== 'all' && ['JHS 1', 'JHS 2', 'JHS 3'].includes(modalClassFilter) && (
                                <span 
                                  className="ml-1 text-xs cursor-pointer hover:bg-orange-200 rounded-full px-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModalClassFilter('all')
                                  }}
                                >
                                  ×
                                </span>
                              )}
                            </button>
                            {modalSelectedFilters.includes('jhs') && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  {['JHS 1', 'JHS 2', 'JHS 3'].map((className) => (
                                    <button
                                      key={className}
                                      onClick={() => {
                                        setModalClassFilter(className)
                                        setModalSelectedFilters(prev => prev.filter(f => f !== 'jhs'))
                                      }}
                                      className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${
                                        modalClassFilter === className ? 'bg-gray-100' : ''
                                      }`}
                                    >
                                      {className}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                      {studentsLoading ? (
                        <div className="p-4 text-sm text-gray-500">Loading students...</div>
                      ) : filteredModalStudents.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No students found.</div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {filteredModalStudents.map((stu) => (
                            <li key={stu.id} className="p-3 flex items-center">
                              <input
                                type="checkbox"
                                className="mr-3"
                                checked={selectedRecipientIds.includes(stu.id)}
                                onChange={() => toggleRecipient(stu.id)}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{stu.name}</div>
                                <div className="text-xs text-gray-500">{stu.grade} • {stu.parentName} • {stu.guardianContact}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                  </div>
                )}

                {modalStep === 3 && messageType === 'class' && (
                  <div>
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Classes</h3>
                      <p className="text-sm text-gray-500">Choose which classes to send messages to</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {classes.length > 0 ? (
                        sortClassesAscending(classes).map((classOption) => (
                          <button
                            key={classOption.id}
                            onClick={() => toggleMessageClassSelection(classOption.name)}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                              selectedMessageClasses.includes(classOption.name)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-medium text-sm">{classOption.name}</div>
                          </button>
                        ))
                      ) : (
                        CLASS_OPTIONS_WITH_LABELS.map((classOption) => (
                          <button
                            key={classOption.value}
                            onClick={() => toggleMessageClassSelection(classOption.value)}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                              selectedMessageClasses.includes(classOption.value)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-medium text-sm">{classOption.label}</div>
                          </button>
                        ))
                      )}
                    </div>

                  </div>
                )}

                {modalStep === 4 && (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">Message Preview</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-800 mb-1">Subject</label>
                          <div className="bg-white border border-blue-200 rounded-md p-3 text-gray-900">
                            {subject || 'No subject'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-800 mb-1">Complete Message (as it will be sent)</label>
                          <div className="bg-white border border-blue-200 rounded-md p-3 text-gray-900 whitespace-pre-wrap min-h-[200px]">
                            {(() => {
                              const sampleStudentName = selectedRecipientIds.length > 0 
                                ? students.find(s => s.id === selectedRecipientIds[0])?.name || 'Student Name'
                                : 'Student Name'
                              
                              const processedGreeting = greeting.replace('{studentName}', sampleStudentName)
                              const fullMessage = subject ? `${subject}\n\n${messageBody}` : messageBody
                              
                              return `${processedGreeting}\n\n${fullMessage}\n\n${regards}`
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipients Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {messageType === 'individual' ? 'Total Recipients' : 'Selected Classes'}
                          </label>
                          <div className="text-2xl font-bold text-blue-600">
                            {messageType === 'individual' ? selectedRecipientIds.length : selectedMessageClasses.length}
                          </div>
                          <div className="text-sm text-gray-500">
                            {messageType === 'individual' 
                              ? (selectedRecipientIds.length === 1 ? 'parent' : 'parents')
                              : (selectedMessageClasses.length === 1 ? 'class' : 'classes')
                            }
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {messageType === 'individual' ? 'Selected Students' : 'Class Details'}
                          </label>
                          <div className="max-h-32 overflow-y-auto">
                            {messageType === 'individual' ? (
                              selectedRecipientIds.length === 0 ? (
                                <p className="text-sm text-gray-500">No recipients selected</p>
                              ) : (
                                <ul className="space-y-1">
                                  {students
                                    .filter(student => selectedRecipientIds.includes(student.id))
                                    .map(student => (
                                      <li key={student.id} className="text-sm text-gray-700">
                                        {student.name} ({student.grade}) - {student.parentName}
                                      </li>
                                    ))
                                  }
                                </ul>
                              )
                            ) : (
                              selectedMessageClasses.length === 0 ? (
                                <p className="text-sm text-gray-500">No classes selected</p>
                              ) : (
                                <ul className="space-y-1">
                                  {selectedMessageClasses.map(className => (
                                    <li key={className} className="text-sm text-gray-700">
                                      {CLASS_OPTIONS_WITH_LABELS.find(opt => opt.value === className)?.label || className}
                                    </li>
                                  ))}
                                </ul>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>This message will be sent to {selectedRecipientIds.length} parent{selectedRecipientIds.length !== 1 ? 's' : ''}. Please review the content carefully before sending.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white">
                <div className="flex justify-between">
                  {modalStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setModalStep((modalStep - 1) as 1 | 2 | 3 | 4)}
                      className="bg-gray-100 text-gray-700 font-bold py-2 px-3 sm:px-6 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-1 sm:gap-2 text-sm"
                    >
                      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Back</span>
                    </button>
                  )}
                  <div className="flex-1"></div>
                  {modalStep === 1 && (
                    <div className="text-sm text-gray-500">Select a message type to continue</div>
                  )}
                  {modalStep === 2 && (
                    <button
                      type="button"
                      onClick={handleNextFromCompose}
                      className="bg-blue-600 text-white font-bold py-2 px-3 sm:px-6 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1 sm:gap-2 text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                  {modalStep === 3 && (
                    <button
                      type="button"
                      onClick={handleNextFromRecipients}
                      disabled={
                        (messageType === 'individual' && selectedRecipientIds.length === 0) ||
                        (messageType === 'class' && selectedMessageClasses.length === 0)
                      }
                      className="bg-blue-600 text-white font-bold py-2 px-3 sm:px-6 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1 sm:gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                  {modalStep === 4 && (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!smsPoints || smsPoints.remainingPoints === 0) {
                            alert('No SMS points available. Please top up your SMS points first.')
                            return
                          }
                          handleSendMessage()
                        }}
                        disabled={isSendingMessage || !smsPoints || smsPoints.remainingPoints === 0}
                        className="bg-green-600 text-white font-bold py-2 px-3 sm:px-6 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isSendingMessage ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                            <span className="hidden sm:inline">Sending...</span>
                            <span className="sm:hidden">Sending</span>
                          </>
                        ) : (!smsPoints || smsPoints.remainingPoints === 0) ? (
                          <>
                            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Top Up Required</span>
                            <span className="sm:hidden">No Points</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Send Message</span>
                            <span className="sm:hidden">Send</span>
                          </>
                        )}
                      </button>
                      
                      {/* Message Status Display */}
                      {messageStatus === 'success' && sendResults.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">Message Delivery Status</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {sendResults.map((result, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{result.studentName}</span>
                                <div className="flex items-center gap-2">
                                  {result.success ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="h-4 w-4" />
                                      Sent
                                    </span>
                                  ) : (
                                    <span className="text-red-600 flex items-center gap-1">
                                      <XCircle className="h-4 w-4" />
                                      Failed
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {messageStatus === 'error' && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-semibold">Failed to send messages</span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">Please check your internet connection and try again.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* SMS Top-up Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Purchase SMS Points</h2>
              <button
                onClick={() => setShowTopupModal(false)}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <Close className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <CreditCard className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-purple-900">Current SMS Points</h3>
                      <p className={`text-2xl font-bold ${getSMSStatusColor()}`}>
                        {smsPointsLoading ? '...' : smsPoints?.remainingPoints || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                  <p>Purchase SMS points to send messages. Each SMS sent will deduct 1 point.</p>
                  <p className="font-medium text-purple-600">Payment required - All purchases are processed securely through Paystack.</p>
                  {pricing && (
                    <p className="font-medium">Rate: ₵{pricing.pricePerPoint} per SMS point</p>
                  )}
                </div>
              </div>

              {/* Quick Purchase Options */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Purchase with Paystack</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[50, 100, 200, 500].map((points) => (
                    <button
                      key={points}
                      onClick={() => handlePurchasePoints(points)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
                    >
                      <div className="font-semibold text-gray-900">{points} Points</div>
                      <div className="text-sm text-gray-600">
                        ₵{pricing ? calculateCost(points).toFixed(2) : '0.00'}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">Pay with Paystack</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Amount</h3>
                <div className="flex space-x-3">
                  <input
                    type="number"
                    min="1"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Enter number of points"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      const points = parseInt(topupAmount)
                      if (!isNaN(points) && points > 0) {
                        handlePurchasePoints(points)
                      }
                    }}
                    disabled={!topupAmount || isNaN(parseInt(topupAmount)) || parseInt(topupAmount) <= 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Buy with Paystack
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum: 1 point | Recommended: 100+ points
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paystack Payment Modal */}
      <PaystackPayment
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        amount={selectedAmount}
        points={selectedPoints}
        onSuccess={handlePaystackSuccess}
      />

      {/* Payment Callback Modal */}
      {showPaymentCallback && (
        <PaymentCallback
          reference={paymentReference}
          onComplete={handlePaymentCallbackComplete}
        />
      )}

    </div>
  )
}

export default Messaging

