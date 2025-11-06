# Firebase Main Structure - Complete Database Schema

## Overview
This document contains the complete Firebase Firestore structure for the school management system. Use this to replicate the exact database structure in any Firebase project.

## Collections Structure

### 1. academicPeriods
**Description**: Academic periods and terms management
**Path**: `/academicPeriods/{periodId}`

```javascript
{
  academicYear: string,        // "2024-2025"
  term: string,               // "1st Term", "2nd Term", "3rd Term"
  isActive: boolean,          // true/false
  description: string,         // Optional description
  startDate: timestamp,       // Period start date
  endDate: timestamp,         // Period end date
  createdAt: timestamp,       // Document creation time
  updatedAt: timestamp        // Last update time
}
```

### 2. attendance
**Description**: Student attendance records
**Path**: `/attendance/{attendanceId}`

```javascript
{
  studentId: string,          // Reference to student
  studentName: string,        // Student name for easy querying
  classId: string,           // Reference to class
  className: string,         // Class name for easy querying
  date: timestamp,           // Attendance date
  status: string,            // "present", "absent", "late", "excused"
  remarks: string,          // Optional remarks
  recordedBy: string,        // Teacher who recorded attendance
  createdAt: timestamp,      // Record creation time
  updatedAt: timestamp       // Last update time
}
```

### 3. classes
**Description**: Class and grade level management
**Path**: `/classes/{classId}`

```javascript
{
  name: string,              // "Grade 7A", "Kindergarten 1"
  value: string,            // Same as name for consistency
  level: string,            // "Early Childhood", "Primary", "Junior High"
  ageRange: string,         // "6-7 years"
  grade: string,            // "Grade 7", "Kindergarten"
  subdivision: string,      // "A", "B", "C" (optional)
  classTeacherId: string,   // Reference to teacher
  room: string,             // Classroom number/name
  studentCount: number,     // Current number of students
  capacity: number,         // Maximum capacity
  maxStudents: number,      // Same as capacity
  academicYear: string,     // "2024-2025"
  subjects: string[],       // Array of subject names
  description: string,       // Optional class description
  isActive: boolean,        // true/false
  createdAt: timestamp,     // Class creation time
  updatedAt: timestamp      // Last update time
}
```

### 4. fees
**Description**: Fee structure and payment management
**Path**: `/fees/{feeId}`

```javascript
{
  name: string,             // "Tuition Fee", "Library Fee"
  amount: number,           // Fee amount
  currency: string,         // "GHS", "USD"
  category: string,         // "Tuition", "Library", "Sports"
  dueDate: timestamp,      // Payment due date
  isActive: boolean,        // true/false
  description: string,      // Optional description
  academicYear: string,     // "2024-2025"
  term: string,            // "1st Term", "2nd Term"
  createdAt: timestamp,    // Fee creation time
  updatedAt: timestamp     // Last update time
}
```

### 5. gradesAcademicPeriod
**Description**: Student grades and academic performance
**Path**: `/gradesAcademicPeriod/{gradeId}`

```javascript
{
  studentId: string,        // Reference to student
  studentName: string,      // Student name for easy querying
  classId: string,          // Reference to class
  className: string,        // Class name for easy querying
  subjectId: string,        // Reference to subject
  subjectName: string,      // Subject name for easy querying
  academicYear: string,     // "2024-2025"
  term: string,            // "1st Term", "2nd Term"
  classScore: number,      // Class work score
  examScore: number,       // Exam score
  totalScore: number,      // Total score
  percentage: number,      // Percentage score
  grade: string,           // "A", "B", "C", "D", "F"
  remarks: string,         // Teacher remarks
  recordedBy: string,      // Teacher who recorded grade
  createdAt: timestamp,    // Grade creation time
  updatedAt: timestamp     // Last update time
}
```

### 6. students
**Description**: Student information and records
**Path**: `/students/{studentId}`

```javascript
{
  // Personal Information
  fullName: string,         // Student's full name
  firstName: string,        // First name
  lastName: string,         // Last name
  middleName: string,       // Middle name (optional)
  dob: string,             // Date of birth (YYYY-MM-DD)
  gender: string,          // "Male" or "Female"
  birthPlace: string,      // Place of birth
  nationality: string,     // Default: "Ghanaian"
  religion: string,        // Religion
  address: string,        // Student's address
  contactNumber: string,  // Student's phone number (optional)
  
  // Academic Information
  prevSchool: string,      // Previous school attended
  lastClass: string,      // Last class attended
  specialNeeds: string,   // Default: "None"
  admissionNumber: string, // Auto-generated admission number
  assignedClass: string,   // Current class assignment
  grade: string,          // Derived from assignedClass
  class: string,         // Same as assignedClass
  enrollmentDate: string, // Date of enrollment (YYYY-MM-DD)
  
  // Parent/Guardian Information
  parentName: string,      // Guardian's full name
  parentPhone: string,    // Guardian's contact number
  guardianName: string,   // Same as parentName
  relationship: string,   // Relationship to student
  occupation: string,     // Guardian's occupation
  guardianContact: string, // Same as parentPhone
  guardianAddress: string, // Guardian's address
  
  // School Information
  house: string,          // House assignment
  status: string,         // Default: "active"
  balance: number,        // Default: 0 (for fees)
  
  // Photo
  photoUrl: string,       // Firebase Storage URL (optional)
  
  // System Timestamps
  createdAt: timestamp,   // Document creation time
  updatedAt: timestamp    // Last update time
}
```

### 7. subjects
**Description**: Subject and curriculum management
**Path**: `/subjects/{subjectId}`

```javascript
{
  name: string,           // Subject name
  code: string,          // Subject code (e.g., "MATH101")
  description: string,    // Subject description
  teacher: string,        // Assigned teacher name
  teacherId: string,      // Reference to teacher
  credits: number,        // Credit hours
  level: string,         // "Early Childhood", "Primary", "Junior High"
  gradeLevel: string,    // Specific grade level
  duration: string,      // Class duration
  status: string,        // "active" or "inactive"
  isCore: boolean,       // Core subject or not
  isElective: boolean,   // Elective subject or not
  prerequisites: string[], // Array of prerequisite subjects
  createdAt: timestamp,  // Subject creation time
  updatedAt: timestamp   // Last update time
}
```

### 8. system
**Description**: System settings and configuration
**Path**: `/system/{systemId}`

```javascript
{
  schoolName: string,     // School name
  schoolAddress: string,  // School address
  schoolPhone: string,    // School phone number
  schoolEmail: string,    // School email
  academicYear: string,   // Current academic year
  currentTerm: string,   // Current term
  currency: string,      // Default currency
  timezone: string,      // School timezone
  language: string,      // Default language
  theme: string,         // UI theme
  settings: object,      // Additional settings
  createdAt: timestamp, // Settings creation time
  updatedAt: timestamp  // Last update time
}
```

### 9. teachers
**Description**: Teacher information and assignments
**Path**: `/teachers/{teacherId}`

```javascript
{
  // Personal Information
  fullName: string,      // Teacher's full name
  firstName: string,     // First name
  lastName: string,      // Last name
  middleName: string,    // Middle name (optional)
  dob: string,          // Date of birth (YYYY-MM-DD)
  gender: string,        // "Male" or "Female"
  maritalStatus: string, // Marital status
  nationality: string,   // Default: "Ghanaian"
  religion: string,      // Religion
  address: string,       // Teacher's address
  contactNumber: string, // Teacher's phone number
  email: string,         // Teacher's email
  
  // Professional Information
  employeeId: string,    // Employee ID
  qualification: string, // Educational qualification
  experience: string,    // Years of experience
  specialization: string, // Teaching specialization
  licenseNumber: string, // Teaching license number
  previousExperience: string, // Previous work experience
  appointmentDate: string, // Date of appointment
  department: string,    // Department
  
  // Assignment Information
  assignedClass: string, // Assigned class
  subjects: string[],    // Array of subjects taught
  staffId: string,      // Staff ID
  
  // Guardian Information (for emergency contact)
  guardianName: string,  // Emergency contact name
  relationship: string,  // Relationship
  occupation: string,   // Guardian's occupation
  guardianContact: string, // Guardian's contact
  guardianAddress: string, // Guardian's address
  
  // Status and Photo
  status: string,        // "active" or "inactive"
  photoUrl: string,      // Firebase Storage URL (optional)
  
  // System Timestamps
  createdAt: timestamp,  // Teacher creation time
  updatedAt: timestamp   // Last update time
}
```

### 10. userRoles
**Description**: User roles and permissions management
**Path**: `/userRoles/{roleId}`

```javascript
{
  roleName: string,      // "admin", "teacher", "accountant"
  description: string,   // Role description
  permissions: string[], // Array of permissions
  isActive: boolean,    // true/false
  createdAt: timestamp, // Role creation time
  updatedAt: timestamp   // Last update time
}
```

### 11. users
**Description**: User accounts and authentication
**Path**: `/users/{userId}`

```javascript
{
  email: string,         // User email
  password: string,      // Hashed password
  firstName: string,     // First name
  lastName: string,      // Last name
  role: string,          // User role
  isActive: boolean,    // Account status
  lastLogin: timestamp, // Last login time
  createdAt: timestamp, // Account creation time
  updatedAt: timestamp   // Last update time
}
```

## Firebase Storage Structure

### Storage Folders
```
/storage/
├── students/
│   └── {studentId}/
│       ├── profile-photo.jpg
│       └── documents/
├── teachers/
│   └── {teacherId}/
│       ├── profile-photo.jpg
│       └── documents/
└── reports/
    ├── academic/
    ├── financial/
    └── attendance/
```

## Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Indexes

### Composite Indexes
```json
{
  "indexes": [
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "assignedClass", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "teachers",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "assignedClass", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "gradesAcademicPeriod",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "studentId", "order": "ASCENDING"},
        {"fieldPath": "academicYear", "order": "ASCENDING"},
        {"fieldPath": "term", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "classId", "order": "ASCENDING"},
        {"fieldPath": "date", "order": "ASCENDING"}
      ]
    }
  ]
}
```

## Usage Instructions

1. **Copy this structure** to your Firebase project
2. **Create all collections** with the specified field structures
3. **Set up security rules** as provided
4. **Create composite indexes** for better query performance

This structure provides a complete, scalable foundation for your school management system.

## Field Validation Rules

### Required Fields by Collection

#### Students
- `fullName` (string)
- `guardianName` (string)
- `guardianContact` (string)

#### Teachers
- `fullName` (string)
- `email` (string)
- `contactNumber` (string)

#### Classes
- `name` (string)
- `level` (string)
- `grade` (string)

#### Subjects
- `name` (string)
- `code` (string)
- `level` (string)

#### Fees
- `name` (string)
- `amount` (number)
- `category` (string)

#### Academic Periods
- `academicYear` (string)
- `term` (string)

#### Attendance
- `studentId` (string)
- `classId` (string)
- `date` (timestamp)
- `status` (string)

#### Grades
- `studentId` (string)
- `classId` (string)
- `subjectId` (string)
- `academicYear` (string)
- `term` (string)

## Data Relationships

### Primary Relationships
- **Students** → **Classes**: `students.assignedClass` → `classes.name`
- **Teachers** → **Classes**: `teachers.assignedClass` → `classes.name`
- **Teachers** → **Subjects**: `teachers.subjects[]` → `subjects.name`
- **Grades** → **Students**: `gradesAcademicPeriod.studentId` → `students.id`
- **Grades** → **Subjects**: `gradesAcademicPeriod.subjectId` → `subjects.id`
- **Attendance** → **Students**: `attendance.studentId` → `students.id`
- **Attendance** → **Classes**: `attendance.classId` → `classes.id`

### Secondary Relationships
- **Classes** → **Subjects**: `classes.subjects[]` → `subjects.name`
- **Fees** → **Academic Periods**: `fees.academicYear` + `fees.term` → `academicPeriods.academicYear` + `academicPeriods.term`
- **Grades** → **Academic Periods**: `gradesAcademicPeriod.academicYear` + `gradesAcademicPeriod.term` → `academicPeriods.academicYear` + `academicPeriods.term`

## Performance Optimization

### Query Optimization
1. **Use composite indexes** for multi-field queries
2. **Limit query results** using `limit()` and `startAfter()`
3. **Use specific field selection** instead of fetching entire documents
4. **Cache frequently accessed data** in client-side state

### Storage Optimization
1. **Compress images** before uploading to Storage
2. **Use appropriate image formats** (WebP for photos, PNG for graphics)
3. **Implement lazy loading** for large datasets
4. **Use pagination** for large collections

## Backup and Recovery

### Backup Strategy
1. **Regular exports** of critical collections
2. **Automated daily backups** of the entire database
3. **Version control** for system settings and configurations
4. **Documentation** of all custom functions and triggers

### Recovery Procedures
1. **Point-in-time recovery** using Firestore backup
2. **Selective restoration** of specific collections
3. **Data validation** after recovery
4. **User notification** of any data loss

This comprehensive structure ensures your school management system is robust, scalable, and maintainable.
