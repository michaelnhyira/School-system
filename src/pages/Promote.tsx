import { useState, useEffect } from 'react'
import { Users, ArrowRight, AlertTriangle, CheckCircle, RotateCcw, UserPlus, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { studentUtils, teacherUtils } from '../utils/firebaseUtils'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { getNextClass, isLastClass } from '../utils/promotionUtils'
import type { Student } from '../types/student'

interface Teacher {
  id: string
  fullName: string
  email: string
  assignedClass: string
  subjects: string[]
}

const Promote = () => {
  const { currentUser } = useAuth()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedToPromote, setSelectedToPromote] = useState<Set<string>>(new Set())
  const [selectedToRepeat, setSelectedToRepeat] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [completionYear, setCompletionYear] = useState<string>(new Date().getFullYear().toString())
  const [processing, setProcessing] = useState(false)
  const [allPendingPromotions, setAllPendingPromotions] = useState<any[]>([])
  const [completedBatches, setCompletedBatches] = useState<any[]>([])

  // Fetch teacher and students
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.email) return

      try {
        setLoading(true)
        
        const teachers = await teacherUtils.getTeachers()
        const currentTeacher = teachers.find((t: any) => t.email === currentUser.email)
        
        if (currentTeacher) {
          const teacherData = {
            id: currentTeacher.id || '',
            fullName: (currentTeacher as any).fullName || '',
            email: (currentTeacher as any).email || '',
            assignedClass: (currentTeacher as any).assignedClass || '',
            subjects: (currentTeacher as any).subjects || []
          }
          setTeacher(teacherData)
          
          const classStudents = await studentUtils.getStudentsByClass(teacherData.assignedClass)
          setStudents(classStudents.map((s: any) => ({
            ...s,
            promotionStatus: s.promotionStatus ?? null,
            isRepeating: s.isRepeating ?? false,
            promotedFromClass: s.promotedFromClass ?? null
          })))
          
          // Also fetch all students with pending promotions from this class (they may have moved to next class)
          const allStudents = await studentUtils.getStudents()
          const pendingFromThisClass = allStudents.filter((s: any) => 
            s.promotionStatus === 'pending' && 
            s.promotedFromClass === teacherData.assignedClass
          )
          setAllPendingPromotions(pendingFromThisClass)
          
          // Also check for students in current class who are marked to repeat (these also need confirmation)
          const repeatingInClass = classStudents.filter((s: any) => s.isRepeating === true)
          // Combine pending promotions and repeating students - both need to be finalized
          const allPendingActions = [...pendingFromThisClass, ...repeatingInClass]
          setAllPendingPromotions(allPendingActions)
          
          // Fetch completed batches to check which years are already taken
          const batches = await studentUtils.getCompletedBatches()
          setCompletedBatches(batches)
        }
      } catch (error) {
        console.error('Error fetching promotion data:', error)
        alert('Failed to load promotion data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser])

  // Separate students into categories
  // Confirmed students are those without promotion status or with confirmed/reversed status, not repeating, and not newly promoted (no promotedFromClass)
  const confirmedStudents = students.filter(s => 
    (!s.promotionStatus || s.promotionStatus === 'confirmed' || s.promotionStatus === null || s.promotionStatus === 'reversed')
  ).filter(s => !s.isRepeating && !s.promotedFromClass)

  // Newly promoted students: those promoted from another class (regardless of confirmation status)
  // They remain visible until accepted by the receiving teacher
  const newlyPromotedStudents = students.filter(s => 
    s.promotedFromClass && s.promotedFromClass !== teacher?.assignedClass && 
    (s.promotionStatus === 'pending' || s.promotionStatus === 'confirmed')
  )

  const pendingPromotedStudents = students.filter(s => 
    s.promotionStatus === 'pending' && s.promotedFromClass === teacher?.assignedClass
  )

  const repeatingStudents = students.filter(s => s.isRepeating)

  const nextClass = teacher ? getNextClass(teacher.assignedClass) : null
  const isJHS3 = teacher ? isLastClass(teacher.assignedClass) : false

  const handleSelectToPromote = (studentId: string) => {
    const newSet = new Set(selectedToPromote)
    if (newSet.has(studentId)) {
      newSet.delete(studentId)
    } else {
      newSet.add(studentId)
      // Auto-remove from repeat selection
      const repeatSet = new Set(selectedToRepeat)
      repeatSet.delete(studentId)
      setSelectedToRepeat(repeatSet)
    }
    setSelectedToPromote(newSet)
  }

  const handleSelectToRepeat = (studentId: string) => {
    const newSet = new Set(selectedToRepeat)
    if (newSet.has(studentId)) {
      newSet.delete(studentId)
    } else {
      newSet.add(studentId)
      // Auto-remove from promote selection
      const promoteSet = new Set(selectedToPromote)
      promoteSet.delete(studentId)
      setSelectedToPromote(promoteSet)
    }
    setSelectedToRepeat(newSet)
  }

  const handleSelectAllToPromote = () => {
    // Select all confirmed students (not pending, not repeating, not newly promoted)
    const allConfirmableIds = confirmedStudents.map(s => s.id)
    setSelectedToPromote(new Set(allConfirmableIds))
    // Clear repeat selection
    setSelectedToRepeat(new Set())
  }

  const handlePreparePromotion = async () => {
    if (!teacher || !currentUser?.email) return
    
    if (selectedToPromote.size === 0 && selectedToRepeat.size === 0) {
      alert('Please select at least one student to promote or repeat')
      return
    }

    try {
      setProcessing(true)

      // Mark students as repeating
      if (selectedToRepeat.size > 0) {
        await studentUtils.markStudentsAsRepeating(Array.from(selectedToRepeat))
      }

      // Promote students
      if (selectedToPromote.size > 0) {
        const targetClass = nextClass || 'completion'
        if (isJHS3 && targetClass === null) {
          // This shouldn't happen, but handle it
          setShowCompletionModal(true)
          return
        }
        
        await studentUtils.promoteStudents(
          Array.from(selectedToPromote),
          targetClass!,
          currentUser.email,
          teacher.assignedClass
        )
      }

      alert('Promotion prepared successfully! Review and confirm to finalize.')
      
      // Refresh data
      const classStudents = await studentUtils.getStudentsByClass(teacher.assignedClass)
      setStudents(classStudents.map((s: any) => ({
        ...s,
        promotionStatus: s.promotionStatus || null,
        isRepeating: s.isRepeating || false,
        promotedFromClass: s.promotedFromClass || null
      })))
      
      // Update pending promotions list - include both pending promotions and repeating students
      const allStudents = await studentUtils.getStudents()
      const pendingFromThisClass = allStudents.filter((s: any) => 
        s.promotionStatus === 'pending' && 
        s.promotedFromClass === teacher.assignedClass
      )
      // Also include repeating students in current class who need confirmation
      const repeatingInClass = classStudents.filter((s: any) => s.isRepeating === true)
      const allPendingActions = [...pendingFromThisClass, ...repeatingInClass]
      setAllPendingPromotions(allPendingActions)

      // Clear selections
      setSelectedToPromote(new Set())
      setSelectedToRepeat(new Set())
    } catch (error) {
      console.error('Error preparing promotion:', error)
      alert('Failed to prepare promotion')
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmPromotions = async () => {
    if (!teacher || !currentUser?.email) return

    try {
      setProcessing(true)

      // Separate promoted students and repeating students
      const promotedStudentIds = allPendingPromotions
        .filter((s: any) => s.promotionStatus === 'pending' && s.promotedFromClass === teacher.assignedClass)
        .map((s: any) => s.id)
      
      const repeatingStudentIds = allPendingPromotions
        .filter((s: any) => s.isRepeating === true)
        .map((s: any) => s.id)

      const allPending = [...promotedStudentIds, ...repeatingStudentIds]

      if (allPending.length === 0) {
        alert('No pending promotions or repetitions to confirm')
        return
      }

      // Confirm both promoted and repeating students
      if (promotedStudentIds.length > 0) {
        if (isJHS3) {
          // Check if batch already exists for this year
          const existingBatch = completedBatches.find(b => b.batchYear === completionYear)
          if (existingBatch) {
            alert(`A batch already exists for year ${completionYear}. Please select a different year.`)
            return
          }
          
          // For JHS 3, complete as batch
          await studentUtils.completeJHS3Batch(completionYear, promotedStudentIds)
          
          // Refresh completed batches list
          const batches = await studentUtils.getCompletedBatches()
          setCompletedBatches(batches)
          
          alert(`Graduation batch ${completionYear} completed successfully!`)
        } else {
          await studentUtils.confirmPromotions(promotedStudentIds)
        }
      }

      // Confirm repeating students (set their status to confirmed but keep isRepeating: true)
      if (repeatingStudentIds.length > 0) {
        await studentUtils.confirmPromotions(repeatingStudentIds)
      }

      if (allPending.length > 0) {
        const promotedCount = promotedStudentIds.length
        const repeatingCount = repeatingStudentIds.length
        let message = 'Confirmations completed successfully!'
        if (promotedCount > 0 && repeatingCount > 0) {
          message = `${promotedCount} promotion(s) and ${repeatingCount} repetition(s) confirmed successfully!`
        } else if (promotedCount > 0) {
          message = `${promotedCount} promotion(s) confirmed successfully!`
        } else if (repeatingCount > 0) {
          message = `${repeatingCount} repetition(s) confirmed successfully!`
        }
        alert(message)
      }

      // Refresh data
      const classStudents = await studentUtils.getStudentsByClass(teacher.assignedClass)
      setStudents(classStudents.map((s: any) => ({
        ...s,
        promotionStatus: s.promotionStatus || null,
        isRepeating: s.isRepeating || false,
        promotedFromClass: s.promotedFromClass || null
      })))
      
      // Update pending promotions list - include both pending promotions and repeating students
      const allStudents = await studentUtils.getStudents()
      const pendingFromThisClass = allStudents.filter((s: any) => 
        s.promotionStatus === 'pending' && 
        s.promotedFromClass === teacher.assignedClass
      )
      // Also include repeating students in current class who need confirmation
      const repeatingInClass = classStudents.filter((s: any) => s.isRepeating === true)
      const allPendingActions = [...pendingFromThisClass, ...repeatingInClass]
      setAllPendingPromotions(allPendingActions)
      
      // Refresh completed batches list
      const batches = await studentUtils.getCompletedBatches()
      setCompletedBatches(batches)

      setShowConfirmModal(false)
      setShowCompletionModal(false)
    } catch (error) {
      console.error('Error confirming promotions:', error)
      alert('Failed to confirm promotions')
    } finally {
      setProcessing(false)
    }
  }

  const handleReversePromotions = async () => {
    if (!teacher || !currentUser?.email) return

    try {
      setProcessing(true)

      // Only reverse promotions made by this teacher
      const reversible = allPendingPromotions.map(s => s.id)

      if (reversible.length === 0) {
        alert('No reversible promotions found')
        return
      }

      await studentUtils.reversePromotions(reversible)
      alert('Promotions reversed successfully!')

      // Refresh data
      const classStudents = await studentUtils.getStudentsByClass(teacher.assignedClass)
      setStudents(classStudents.map((s: any) => ({
        ...s,
        promotionStatus: s.promotionStatus || null,
        isRepeating: s.isRepeating || false,
        promotedFromClass: s.promotedFromClass || null
      })))
      
      // Update pending promotions list - include both pending promotions and repeating students
      const allStudents = await studentUtils.getStudents()
      const pendingFromThisClass = allStudents.filter((s: any) => 
        s.promotionStatus === 'pending' && 
        s.promotedFromClass === teacher.assignedClass
      )
      // Also include repeating students in current class who need confirmation
      const repeatingInClass = classStudents.filter((s: any) => s.isRepeating === true)
      const allPendingActions = [...pendingFromThisClass, ...repeatingInClass]
      setAllPendingPromotions(allPendingActions)

      setShowReverseModal(false)
    } catch (error) {
      console.error('Error reversing promotions:', error)
      alert('Failed to reverse promotions')
    } finally {
      setProcessing(false)
    }
  }

  const handleAcceptNewStudents = async () => {
    if (!teacher || !currentUser?.email) return

    try {
      setProcessing(true)

      // Accept all newly promoted students by clearing their promotedFromClass, isRepeating, and setting promotionStatus to confirmed
      // This allows them to be promoted again in the future
      const acceptPromises = newlyPromotedStudents.map(async (student) => {
        const studentRef = doc(db, 'students', student.id)
        await updateDoc(studentRef, {
          promotedFromClass: null,
          promotionStatus: 'confirmed',
          isRepeating: false, // Clear repeating flag so they can be promoted again
          updatedAt: new Date().toISOString()
        })
      })

      await Promise.all(acceptPromises)
      alert('New students accepted successfully! They can now be promoted together with your other students.')

      // Refresh data
      const classStudents = await studentUtils.getStudentsByClass(teacher.assignedClass)
      setStudents(classStudents.map((s: any) => ({
        ...s,
        promotionStatus: s.promotionStatus || null,
        isRepeating: s.isRepeating || false,
        promotedFromClass: s.promotedFromClass || null
      })))
      
      // Update pending promotions list - include both pending promotions and repeating students
      const allStudents = await studentUtils.getStudents()
      const pendingFromThisClass = allStudents.filter((s: any) => 
        s.promotionStatus === 'pending' && 
        s.promotedFromClass === teacher.assignedClass
      )
      // Also include repeating students in current class who need confirmation
      const repeatingInClass = classStudents.filter((s: any) => s.isRepeating === true)
      const allPendingActions = [...pendingFromThisClass, ...repeatingInClass]
      setAllPendingPromotions(allPendingActions)

      setShowAcceptModal(false)
    } catch (error) {
      console.error('Error accepting new students:', error)
      alert('Failed to accept new students')
    } finally {
      setProcessing(false)
    }
  }

  // Check if teacher can accept new students (must have no pending promotions from their own class)
  const canAcceptNewStudents = newlyPromotedStudents.length > 0 && allPendingPromotions.length === 0

  const getStatusColor = (student: Student) => {
    if (student.isRepeating) return 'border-yellow-400 bg-yellow-50'
    // Newly promoted students (from another class) - regardless of confirmed status
    if (student.promotedFromClass && student.promotedFromClass !== teacher?.assignedClass) {
      return 'border-blue-400 bg-blue-50'
    }
    if (student.promotionStatus === 'pending') return 'border-orange-400 bg-orange-50'
    if (student.promotionStatus === 'reversed') return 'border-red-400 bg-red-50'
    return 'border-green-400 bg-green-50'
  }

  const getStatusText = (student: Student) => {
    if (student.isRepeating) return 'Repeating'
    // Newly promoted students (from another class)
    if (student.promotedFromClass && student.promotedFromClass !== teacher?.assignedClass) {
      return `Promoted from ${student.promotedFromClass}`
    }
    if (student.promotionStatus === 'pending') return 'Pending promotion'
    if (student.promotionStatus === 'reversed') return 'Reversed'
    return 'Normal'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!teacher || !teacher.assignedClass) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">No assigned class found</div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Promotion</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage promotions for {teacher.assignedClass}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {confirmedStudents.length > 0 && (
            <button
              onClick={handleSelectAllToPromote}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Select All to Promote</span>
              <span className="sm:hidden">Select All</span>
            </button>
          )}
          {allPendingPromotions.length > 0 && (
            <button
              onClick={() => setShowReverseModal(true)}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reverse Promotions</span>
              <span className="sm:hidden">Reverse</span>
            </button>
          )}
          {allPendingPromotions.length > 0 && (
            <button
              onClick={() => isJHS3 ? setShowCompletionModal(true) : setShowConfirmModal(true)}
              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Confirm Promotions ({allPendingPromotions.length})</span>
              <span className="sm:hidden">Confirm ({allPendingPromotions.length})</span>
            </button>
          )}
          {(selectedToPromote.size > 0 || selectedToRepeat.size > 0) && (
            <button
              onClick={handlePreparePromotion}
              disabled={processing}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">Prepare Promotion</span>
              <span className="sm:hidden">Prepare</span>
            </button>
          )}
          {newlyPromotedStudents.length > 0 && (
            <button
              onClick={() => setShowAcceptModal(true)}
              disabled={!canAcceptNewStudents || processing}
              className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              title={allPendingPromotions.length > 0 ? 'Complete all your own promotions and repetitions first before accepting new students' : ''}
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Accept New Students ({newlyPromotedStudents.length})</span>
              <span className="sm:hidden">Accept ({newlyPromotedStudents.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Promotion Preview */}
      {(selectedToPromote.size > 0 || selectedToRepeat.size > 0 || pendingPromotedStudents.length > 0 || newlyPromotedStudents.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Promotion Preview</h3>
          <div className="space-y-1 text-xs sm:text-sm text-blue-800">
            {selectedToPromote.size > 0 && (
              <p>
                {selectedToPromote.size} student(s) selected to promote to {nextClass || 'completion'}
              </p>
            )}
            {selectedToRepeat.size > 0 && (
              <p>{selectedToRepeat.size} student(s) selected to repeat in {teacher.assignedClass}</p>
            )}
            {allPendingPromotions.length > 0 && (
              <p>{allPendingPromotions.length} student(s) pending promotion/repetition confirmation</p>
            )}
            {newlyPromotedStudents.length > 0 && (
              <p>{newlyPromotedStudents.length} newly promoted student(s) awaiting confirmation</p>
            )}
          </div>
        </div>
      )}

      {/* Newly Promoted Students Section */}
      {newlyPromotedStudents.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-700 flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              Newly Promoted Students
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Students promoted from other classes. Accept them after completing your own promotions.
            </p>
            {allPendingPromotions.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs sm:text-sm text-yellow-800">
                ⚠️ You must confirm all your own promotions and repetitions ({allPendingPromotions.length} pending) before accepting new students.
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {newlyPromotedStudents.map((student) => (
                <div
                  key={student.id}
                  className={`border-2 rounded-lg p-3 sm:p-4 ${getStatusColor(student)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm sm:text-base">{student.fullName || student.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {getStatusText(student)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Your Current Students Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Your Current Students</span>
            <span className="text-xs sm:text-sm font-normal text-gray-600">
              ({confirmedStudents.length + repeatingStudents.length + pendingPromotedStudents.length})
            </span>
          </h2>
        </div>
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...confirmedStudents, ...repeatingStudents, ...pendingPromotedStudents].map((student) => (
              <div
                key={student.id}
                className={`border-2 rounded-lg p-3 sm:p-4 ${getStatusColor(student)}`}
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base">{student.fullName || student.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {getStatusText(student)}
                    </p>
                  </div>
                </div>
                {student.promotionStatus !== 'pending' && !student.promotedFromClass && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedToPromote.has(student.id)}
                        onChange={() => handleSelectToPromote(student.id)}
                        disabled={student.isRepeating}
                        className="w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">Promote</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedToRepeat.has(student.id)}
                        onChange={() => handleSelectToRepeat(student.id)}
                        disabled={selectedToPromote.has(student.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs sm:text-sm">Repeat</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold">Confirm Promotions</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              This action is irreversible. Are you sure you want to confirm promotions/repetitions for {allPendingPromotions.length} student(s)?
            </p>
            {allPendingPromotions.filter((s: any) => s.promotionStatus === 'pending' && s.promotedFromClass === teacher?.assignedClass).length > 0 && (
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                • {allPendingPromotions.filter((s: any) => s.promotionStatus === 'pending' && s.promotedFromClass === teacher?.assignedClass).length} student(s) to be promoted
              </p>
            )}
            {allPendingPromotions.filter((s: any) => s.isRepeating === true).length > 0 && (
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                • {allPendingPromotions.filter((s: any) => s.isRepeating === true).length} student(s) to remain repeating
              </p>
            )}
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-xs sm:text-sm text-red-800 font-semibold">Warning: This cannot be undone!</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base order-2 sm:order-1"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPromotions}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
              >
                {processing ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal for JHS 3 */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold">Complete Graduation Batch</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              Graduating {allPendingPromotions.length} student(s) from JHS 3.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Graduation Year
              </label>
              <input
                type="number"
                value={completionYear}
                onChange={(e) => setCompletionYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                min="2020"
                max="2100"
              />
              {completedBatches.some(b => b.batchYear === completionYear) && (
                <p className="mt-2 text-xs text-red-600">
                  ⚠️ A batch already exists for year {completionYear}. Please select a different year.
                </p>
              )}
            </div>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-xs sm:text-sm text-red-800 font-semibold">Warning: This cannot be undone!</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  setShowConfirmModal(false)
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base order-2 sm:order-1"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPromotions}
                disabled={processing || completedBatches.some(b => b.batchYear === completionYear)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
              >
                {processing ? 'Completing...' : 'Complete Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold">Reverse Promotions</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              This will reverse {allPendingPromotions.length} pending promotion(s). Students will be returned to {teacher.assignedClass}.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => setShowReverseModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base order-2 sm:order-1"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleReversePromotions}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
              >
                {processing ? 'Reversing...' : 'Reverse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept New Students Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold">Accept New Students</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              You are about to accept {newlyPromotedStudents.length} newly promoted student(s) as normal students in your class.
            </p>
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-xs sm:text-sm text-orange-800 font-semibold mb-2">Important Reminder:</p>
              <p className="text-xs sm:text-sm text-orange-800">
                Make sure you have completed your own promotions first. Once accepted, these students will be treated as normal students and can be promoted together with your other students in future promotions.
              </p>
            </div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs sm:text-sm text-blue-800">
                After acceptance, you can promote these students along with your other students in the next promotion cycle.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm sm:text-base order-2 sm:order-1"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptNewStudents}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Accept Students
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

export default Promote

