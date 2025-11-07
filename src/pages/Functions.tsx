import { useState } from 'react'
import { 
  Database, 
  Users, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Settings,
  FileText,
  DollarSign,
  CreditCard,
  X
} from 'lucide-react'
import { studentUtils, classUtils, feesUtils, subjectUtils } from '../utils/firebaseUtils'
import { roleUtils } from '../utils/roleUtils'
import PaystackTest from '../components/PaystackTest'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

const Functions = () => {
  const { isTeacher } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [showPaystackTest, setShowPaystackTest] = useState(false)

  const showResult = (type: 'success' | 'error', message: string) => {
    setResult({ type, message })
    setTimeout(() => setResult(null), 5000)
  }

  // Add 50 test students
  const add50Students = async () => {
    if (!confirm('Are you sure you want to add 50 test students? This will create sample data using your actual classes.')) {
      return
    }

    setLoading(true)
    try {
      // Fetch actual classes from your database
      console.log('Fetching actual classes from database...')
      const actualClasses = await classUtils.getClasses()
      
      if (actualClasses.length === 0) {
        showResult('error', 'No classes found in your database. Please create some classes first before adding students.')
        return
      }

      console.log(`Found ${actualClasses.length} classes:`, actualClasses.map((cls: any) => cls.name))
      
      const sampleStudents: any[] = []
      const firstNames = ['Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Efua', 'Kwaku', 'Adwoa', 'Kojo', 'Abena', 'Fiifi', 'Akua', 'Kwabena', 'Ama', 'Kweku', 'Esi', 'Kwasi', 'Akosua', 'Kofi', 'Ama']
      const lastNames = ['Asante', 'Mensah', 'Osei', 'Boateng', 'Adjei', 'Owusu', 'Agyemang', 'Darko', 'Appiah', 'Tetteh', 'Sarpong', 'Amoah', 'Frimpong', 'Antwi', 'Bonsu', 'Gyasi', 'Acheampong', 'Ofori', 'Amoako', 'Sakyi']
      const genders = ['Male', 'Female']
      const houses = ['Red House', 'Blue House', 'Green House', 'Yellow House']
      
      console.log('Creating 50 sample students using actual class data...')
      
      for (let i = 1; i <= 50; i++) {
        // Select a random class from actual classes
        const randomClass = actualClasses[Math.floor(Math.random() * actualClasses.length)]
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
        const gender = genders[Math.floor(Math.random() * genders.length)]
        const house = houses[Math.floor(Math.random() * houses.length)]
        
        // Use the actual class name and level from your database
        const className = (randomClass as any).name || 'Unknown Class'
        
        // Generate admission number
        const admissionNumber = `ADM${new Date().getFullYear()}${String(i).padStart(3, '0')}`
        
        // Create student with complete data structure matching the database
        const studentData = {
          // Basic information
          fullName: `${firstName} ${lastName}`,
          name: `${firstName} ${lastName}`,
          dob: `${2000 + Math.floor(Math.random() * 15)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          gender: gender,
          birthPlace: 'Accra',
          nationality: 'Ghanaian',
          religion: 'Christian',
          
          // Contact information
          contactNumber: `+233${Math.floor(Math.random() * 900000000) + 100000000}`,
          phone: `+233${Math.floor(Math.random() * 900000000) + 100000000}`,
          address: `${Math.floor(Math.random() * 999) + 1} Street, Accra`,
          
          // Academic information
          prevSchool: 'Previous School',
          lastClass: className,
          subjects: 'All Subjects',
          specialNeeds: 'None',
          assignedClass: className,
          grade: className,
          class: className,
          
          // Guardian information
          guardianName: `Mr./Mrs. ${lastName}`,
          parentName: `Mr./Mrs. ${lastName}`,
          relationship: 'Parent',
          occupation: 'Business Owner',
          guardianContact: `+233${Math.floor(Math.random() * 900000000) + 100000000}`,
          parentPhone: `+233${Math.floor(Math.random() * 900000000) + 100000000}`,
          guardianAddress: `${Math.floor(Math.random() * 999) + 1} Street, Accra`,
          
          // School information
          admissionNumber: admissionNumber,
          house: house,
          enrollmentDate: new Date().toISOString().split('T')[0],
          status: 'active',
          balance: 0,
          lastPaymentDate: '',
          
          // System fields
          createdAt: new Date(),
          updatedAt: new Date(),
          photoUrl: null
        }
        
        sampleStudents.push(studentData)
      }

      console.log('Sample students created:', sampleStudents.length)
      console.log('Class distribution:', sampleStudents.reduce((acc, student) => {
        acc[student.assignedClass] = (acc[student.assignedClass] || 0) + 1
        return acc
      }, {} as Record<string, number>))

      // Add students to database
      await studentUtils.addMultipleStudents(sampleStudents.map((s: any) => ({
        ...s,
        photoUrl: s.photoUrl || undefined
      })))
      
      // Update class enrollment counts
      console.log('Updating class enrollment counts...')
      const classUpdates = actualClasses.map(async (cls: any) => {
        const studentsInClass = sampleStudents.filter((student: any) => student.assignedClass === cls.name).length
        if (studentsInClass > 0) {
          const newEnrollment = (cls.currentEnrollment || 0) + studentsInClass
          await classUtils.updateClass(cls.id, {
            currentEnrollment: newEnrollment,
            updatedAt: new Date()
          })
          console.log(`Updated ${cls.name}: +${studentsInClass} students (Total: ${newEnrollment})`)
        }
      })
      
      await Promise.all(classUpdates)
      
      const classDistribution = sampleStudents.reduce((acc, student) => {
        acc[student.assignedClass] = (acc[student.assignedClass] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const distributionText = Object.entries(classDistribution)
        .map(([className, count]) => `${className}: ${count}`)
        .join(', ')
      
      showResult('success', `Successfully added 50 test students to your actual classes! Distribution: ${distributionText}. Class enrollment counts have been updated.`)
    } catch (error) {
      console.error('Error adding students:', error)
      showResult('error', 'Failed to add students. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clear all students
  const clearAllStudents = async () => {
    if (!confirm('Are you sure you want to delete ALL students? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await studentUtils.deleteAllStudents()
      showResult('success', 'Successfully deleted all students!')
    } catch (error) {
      console.error('Error deleting students:', error)
      showResult('error', 'Failed to delete students. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clear all classes
  const clearAllClasses = async () => {
    if (!confirm('Are you sure you want to delete ALL classes? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await classUtils.deleteAllClasses()
      showResult('success', 'Successfully deleted all classes!')
    } catch (error) {
      console.error('Error deleting classes:', error)
      showResult('error', 'Failed to delete classes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clear all fees
  const clearAllFees = async () => {
    if (!confirm('Are you sure you want to delete ALL fees? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await feesUtils.deleteAllFees()
      showResult('success', 'Successfully deleted all fees!')
    } catch (error) {
      console.error('Error deleting fees:', error)
      showResult('error', 'Failed to delete fees. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clear all fee payments
  const clearAllFeePayments = async () => {
    if (!confirm('Are you sure you want to delete ALL fee payments? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await feesUtils.deleteAllFeePayments()
      showResult('success', 'Successfully deleted all fee payments!')
    } catch (error) {
      console.error('Error deleting fee payments:', error)
      showResult('error', 'Failed to delete fee payments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clear all subjects
  const clearAllSubjects = async () => {
    if (!confirm('Are you sure you want to delete ALL subjects? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await subjectUtils.deleteAllSubjects()
      showResult('success', 'Successfully deleted all subjects!')
    } catch (error) {
      console.error('Error deleting subjects:', error)
      showResult('error', 'Failed to delete subjects. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Reset entire database
  // Initialize admin user
  const initializeAdminUser = async () => {
    if (!confirm('Initialize admin user for michaelnhyira77@gmail.com? This will set up the initial admin account.')) {
      return
    }
    
    setLoading(true)
    try {
      const adminData = await roleUtils.initializeAdminUser('michaelnhyira77@gmail.com')
      showResult('success', `Admin user initialized successfully: ${adminData.email}`)
    } catch (error) {
      console.error('Error initializing admin user:', error)
      showResult('error', `Failed to initialize admin user: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const resetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the ENTIRE database? This will delete ALL data and cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await Promise.all([
        studentUtils.deleteAllStudents(),
        classUtils.deleteAllClasses(),
        feesUtils.deleteAllFees(),
        feesUtils.deleteAllFeePayments()
      ])
      showResult('success', 'Successfully reset entire database!')
    } catch (error) {
      console.error('Error resetting database:', error)
      showResult('error', 'Failed to reset database. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const functionGroups = [
    {
      title: 'System Setup',
      icon: Settings,
      color: 'indigo',
      functions: [
        {
          name: 'Initialize Admin User',
          description: 'Set up michaelnhyira77@gmail.com as the initial admin user with full system access',
          action: initializeAdminUser,
          icon: Users,
          variant: 'primary'
        }
      ]
    },
    {
      title: 'Payment Testing',
      icon: CreditCard,
      color: 'purple',
      functions: [
        {
          name: 'Test Paystack Integration',
          description: 'Test the Paystack payment system with a sample transaction',
          action: () => setShowPaystackTest(true),
          icon: CreditCard,
          variant: 'primary'
        }
      ]
    },
    {
      title: 'Student Management',
      icon: Users,
      color: 'blue',
      functions: [
        {
          name: 'Add 50 Test Students',
          description: 'Creates 50 sample students with realistic Ghanaian names using your actual classes from the database',
          action: add50Students,
          icon: Plus,
          variant: 'primary'
        },
        {
          name: 'Clear All Students',
          description: 'Deletes all students from the database',
          action: clearAllStudents,
          icon: Trash2,
          variant: 'danger'
        }
      ]
    },
    {
      title: 'Class Management',
      icon: FileText,
      color: 'green',
      functions: [
        {
          name: 'Clear All Classes',
          description: 'Deletes all classes from the database',
          action: clearAllClasses,
          icon: Trash2,
          variant: 'danger'
        }
      ]
    },
    {
      title: 'Subject Management',
      icon: FileText,
      color: 'purple',
      functions: [
        {
          name: 'Clear All Subjects',
          description: 'Deletes all subjects from the database',
          action: clearAllSubjects,
          icon: Trash2,
          variant: 'danger'
        }
      ]
    },
    {
      title: 'Fees Management',
      icon: DollarSign,
      color: 'yellow',
      functions: [
        {
          name: 'Clear All Fees',
          description: 'Deletes all fee configurations from the database',
          action: clearAllFees,
          icon: Trash2,
          variant: 'danger'
        },
        {
          name: 'Clear All Fee Payments',
          description: 'Deletes all fee payment records from the database',
          action: clearAllFeePayments,
          icon: Trash2,
          variant: 'danger'
        }
      ]
    },
    {
      title: 'Database Management',
      icon: Database,
      color: 'red',
      functions: [
        {
          name: 'Reset Entire Database',
          description: 'Deletes ALL data from the database (students, classes, fees, payments)',
          action: resetDatabase,
          icon: Trash2,
          variant: 'danger'
        }
      ]
    }
  ]

  // Redirect teachers away from the Functions page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Database Functions</h1>
        </div>
        <p className="text-gray-600">
          Manage your Firestore database with these utility functions. Use with caution as some operations cannot be undone.
        </p>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
          result.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {result.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="font-medium">{result.message}</span>
        </div>
      )}

      {/* Function Groups */}
      <div className="space-y-8">
        {functionGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <group.icon className={`h-6 w-6 text-${group.color}-600`} />
                <h2 className="text-xl font-semibold text-gray-900">{group.title}</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.functions.map((func, funcIndex) => (
                  <div key={funcIndex} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <func.icon className={`h-5 w-5 mt-1 ${
                        func.variant === 'danger' ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{func.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{func.description}</p>
                        <button
                          onClick={func.action}
                          disabled={loading}
                          className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            func.variant === 'danger'
                              ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
                          }`}
                        >
                          {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </div>
                          ) : (
                            func.name
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Information Banner */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Database className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">Add 50 Students Function Details</h3>
            <p className="text-sm text-blue-700 mb-2">
              The "Add 50 Test Students" function creates comprehensive sample data using your actual database:
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>Names:</strong> 20 Ghanaian first names × 20 Ghanaian last names = 400 possible combinations</li>
              <li><strong>Classes:</strong> Random assignment to your actual classes from the database</li>
              <li><strong>Complete Data:</strong> Full student profiles with DOB, gender, address, guardian info</li>
              <li><strong>Academic Info:</strong> Admission numbers, house assignments, enrollment dates</li>
              <li><strong>Class Integration:</strong> Updates class enrollment counts automatically</li>
              <li><strong>Data Consistency:</strong> All fields match your database structure exactly</li>
              <li><strong>Cross-Platform:</strong> Data reflects across Students, Classes, and Fees pages</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">Warning</h3>
            <p className="text-sm text-yellow-700">
              These functions directly modify your Firestore database. Always backup your data before running destructive operations. 
              Some operations cannot be undone and will permanently delete your data.
            </p>
          </div>
        </div>
      </div>

      {/* Paystack Test Modal */}
      {showPaystackTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Paystack Integration Test</h3>
              </div>
              <button
                onClick={() => setShowPaystackTest(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <PaystackTest />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Functions
