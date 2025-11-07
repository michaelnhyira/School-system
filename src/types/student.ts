export interface Student {
  id: string
  name: string
  grade: string
  class: string
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
  fullName?: string
  dob?: string
  gender?: string
  birthPlace?: string
  religion?: string
  prevSchool?: string
  lastClass?: string
  specialNeeds?: string
  nationality?: string
  guardianName?: string
  relationship?: string
  occupation?: string
  guardianContact?: string
  guardianAddress?: string
  admissionNumber?: string
  assignedClass?: string
  house?: string
  photoUrl?: string
  // Additional fields for MyStudents compatibility
  phone?: string
  contactNumber?: string
  // Promotion fields
  promotionStatus?: 'pending' | 'confirmed' | 'reversed' | null
  previousClass?: string // Original class before promotion
  promotedFromClass?: string // Which class promoted them
  promotedAt?: string // Timestamp when promotion was initiated
  promotedBy?: string // Teacher ID or email who initiated promotion
  isRepeating?: boolean // Whether student is repeating current class
  completedBatch?: string | null // Batch year for graduated students (e.g., "2025")
}
