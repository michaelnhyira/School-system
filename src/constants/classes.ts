// Educational progression from Creche through JHS 3
export const CLASS_LEVELS = [
  // Early Childhood Education
  { value: 'Creche', label: 'Creche', level: 'Early Childhood', ageRange: '6 months - 2 years' },
  { value: 'Nursery 1', label: 'Nursery 1', level: 'Early Childhood', ageRange: '2-3 years' },
  { value: 'Nursery 2', label: 'Nursery 2', level: 'Early Childhood', ageRange: '3-4 years' },
  { value: 'Kindergarten 1', label: 'Kindergarten 1', level: 'Early Childhood', ageRange: '4-5 years' },
  { value: 'Kindergarten 2', label: 'Kindergarten 2', level: 'Early Childhood', ageRange: '5-6 years' },
  
  // Primary Education
  { value: 'Primary 1', label: 'Primary 1', level: 'Primary', ageRange: '6-7 years' },
  { value: 'Primary 2', label: 'Primary 2', level: 'Primary', ageRange: '7-8 years' },
  { value: 'Primary 3', label: 'Primary 3', level: 'Primary', ageRange: '8-9 years' },
  { value: 'Primary 4', label: 'Primary 4', level: 'Primary', ageRange: '9-10 years' },
  { value: 'Primary 5', label: 'Primary 5', level: 'Primary', ageRange: '10-11 years' },
  { value: 'Primary 6', label: 'Primary 6', level: 'Primary', ageRange: '11-12 years' },
  
  // Junior High School
  { value: 'JHS 1', label: 'JHS 1', level: 'Junior High', ageRange: '12-13 years' },
  { value: 'JHS 2', label: 'JHS 2', level: 'Junior High', ageRange: '13-14 years' },
  { value: 'JHS 3', label: 'JHS 3', level: 'Junior High', ageRange: '14-15 years' },
]

// Class options for dropdowns (just the values)
export const CLASS_OPTIONS = CLASS_LEVELS.map(cls => cls.value)

// Class options with labels for dropdowns
export const CLASS_OPTIONS_WITH_LABELS = CLASS_LEVELS.map(cls => ({
  value: cls.value,
  label: cls.label
}))

// Grouped class options by level
export const CLASSES_BY_LEVEL = {
  'Early Childhood': CLASS_LEVELS.filter(cls => cls.level === 'Early Childhood'),
  'Primary': CLASS_LEVELS.filter(cls => cls.level === 'Primary'),
  'Junior High': CLASS_LEVELS.filter(cls => cls.level === 'Junior High')
}

// Helper functions
export const getClassLevel = (className: string) => {
  const classInfo = CLASS_LEVELS.find(cls => cls.value === className)
  return classInfo?.level || 'Unknown'
}

export const getAgeRange = (className: string) => {
  const classInfo = CLASS_LEVELS.find(cls => cls.value === className)
  return classInfo?.ageRange || 'Unknown'
}

export const isEarlyChildhood = (className: string) => {
  return getClassLevel(className) === 'Early Childhood'
}

export const isPrimary = (className: string) => {
  return getClassLevel(className) === 'Primary'
}

export const isJuniorHigh = (className: string) => {
  return getClassLevel(className) === 'Junior High'
}
