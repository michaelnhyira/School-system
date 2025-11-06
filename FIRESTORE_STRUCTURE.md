# Firestore Collections Structure

## Students Collection

### Document Structure
Each student document will have the following fields:

```javascript
{
  // Personal Information
  fullName: string,           // Required
  dob: string,               // Date of birth (YYYY-MM-DD)
  gender: string,            // "Male" or "Female"
  birthPlace: string,        // Place of birth
  nationality: string,       // Default: "Ghanaian"
  religion: string,          // Religion
  address: string,           // Student's address
  contactNumber: string,     // Optional - Student's phone number
  
  // Academic Information
  prevSchool: string,        // Previous school attended
  lastClass: string,         // Last class attended
  specialNeeds: string,      // Default: "None"
  
  // Parent/Guardian Information
  parentName: string,        // Guardian's full name (Required)
  parentPhone: string,       // Guardian's contact number (Required)
  guardianName: string,      // Same as parentName
  relationship: string,      // Relationship to student
  occupation: string,        // Guardian's occupation
  guardianContact: string,   // Same as parentPhone
  guardianAddress: string,   // Guardian's address
  
  // School Information
  admissionNumber: string,   // Auto-generated if not provided
  assignedClass: string,     // Class assignment
  house: string,            // House assignment
  
  // Additional System Fields
  grade: string,            // Derived from assignedClass
  class: string,            // Same as assignedClass
  enrollmentDate: string,   // Date of enrollment (YYYY-MM-DD)
  status: string,           // Default: "active"
  balance: number,          // Default: 0 (for fees)
  
  // Photo
  photoUrl: string,         // Firebase Storage URL (optional)
  
  // System Timestamps
  createdAt: timestamp,     // Document creation time
  updatedAt: timestamp      // Last update time
}
```

### Collection Path
```
/students/{studentId}
```

### Example Document
```javascript
{
  fullName: "John Doe",
  dob: "2008-05-15",
  gender: "Male",
  birthPlace: "Accra",
  nationality: "Ghanaian",
  religion: "Christian",
  address: "123 Main Street, Accra",
  contactNumber: "+233241234567",
  prevSchool: "ABC Primary School",
  lastClass: "Grade 6",
  specialNeeds: "None",
  parentName: "Jane Doe",
  parentPhone: "+233241234568",
  guardianName: "Jane Doe",
  relationship: "Mother",
  occupation: "Teacher",
  guardianContact: "+233241234568",
  guardianAddress: "123 Main Street, Accra",
  admissionNumber: "ST1703123456789",
  assignedClass: "Grade 7A",
  house: "Blue House",
  grade: "Grade 7",
  class: "Grade 7A",
  enrollmentDate: "2024-01-15",
  status: "active",
  balance: 0,
  photoUrl: "https://firebasestorage.googleapis.com/...",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

### Required Fields for Creation
- `fullName` (string)
- `guardianName` (string) 
- `guardianContact` (string)

### Optional Fields
- All other fields are optional and will have default values or remain empty
- `photoUrl` - Students can be created without a passport photo initially
