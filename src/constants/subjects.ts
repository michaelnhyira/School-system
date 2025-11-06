// Ghana Education System Subjects by Level
export interface Subject {
  name: string
  code: string
  level: 'Early Childhood' | 'Primary' | 'Junior High'
  gradeLevel: string
  description: string
  isCore: boolean
  isElective?: boolean
  prerequisites?: string[]
}

// Early Childhood Education Subjects (Creche, Nursery 1&2, Kindergarten 1&2)
export const EARLY_CHILDHOOD_SUBJECTS: Subject[] = [
  {
    name: 'Language Development',
    code: 'ECD001',
    level: 'Early Childhood',
    gradeLevel: 'Creche-Kindergarten 2',
    description: 'Basic language skills, vocabulary building, and communication',
    isCore: true
  },
  {
    name: 'Numeracy',
    code: 'ECD002',
    level: 'Early Childhood',
    gradeLevel: 'Creche-Kindergarten 2',
    description: 'Basic counting, number recognition, and simple math concepts',
    isCore: true
  },
  {
    name: 'Creative Arts',
    code: 'ECD003',
    level: 'Early Childhood',
    gradeLevel: 'Creche-Kindergarten 2',
    description: 'Drawing, painting, music, and creative expression',
    isCore: true
  },
  {
    name: 'Physical Development',
    code: 'ECD004',
    level: 'Early Childhood',
    gradeLevel: 'Creche-Kindergarten 2',
    description: 'Gross and fine motor skills, coordination, and physical activities',
    isCore: true
  },
  {
    name: 'Social Development',
    code: 'ECD005',
    level: 'Early Childhood',
    gradeLevel: 'Creche-Kindergarten 2',
    description: 'Social skills, sharing, cooperation, and emotional development',
    isCore: true
  },
  {
    name: 'Environmental Studies',
    code: 'ECD006',
    level: 'Early Childhood',
    gradeLevel: 'Kindergarten 1-2',
    description: 'Basic understanding of environment, nature, and surroundings',
    isCore: true
  }
]

// Primary Education Subjects (Primary 1-6)
export const PRIMARY_SUBJECTS: Subject[] = [
  // Core Subjects
  {
    name: 'English Language',
    code: 'PR001',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Reading, writing, speaking, and listening skills',
    isCore: true
  },
  {
    name: 'Mathematics',
    code: 'PR002',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Numbers, operations, geometry, and problem-solving',
    isCore: true
  },
  {
    name: 'Science',
    code: 'PR003',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Basic scientific concepts, nature study, and experiments',
    isCore: true
  },
  {
    name: 'Social Studies',
    code: 'PR004',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'History, geography, citizenship, and cultural studies',
    isCore: true
  },
  {
    name: 'Religious and Moral Education (RME)',
    code: 'PR005',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Religious studies, moral values, and character development',
    isCore: true
  },
  {
    name: 'Creative Arts',
    code: 'PR006',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Visual arts, music, drama, and creative expression',
    isCore: true
  },
  {
    name: 'Physical Education',
    code: 'PR007',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Physical activities, sports, and health education',
    isCore: true
  },
  {
    name: 'Ghanaian Language',
    code: 'PR008',
    level: 'Primary',
    gradeLevel: 'Primary 1-6',
    description: 'Local language studies (Twi, Ga, Ewe, etc.)',
    isCore: true
  },
  // Additional Subjects (Primary 4-6)
  {
    name: 'French',
    code: 'PR009',
    level: 'Primary',
    gradeLevel: 'Primary 4-6',
    description: 'Basic French language skills',
    isCore: true
  },
  {
    name: 'Information and Communication Technology (ICT)',
    code: 'PR010',
    level: 'Primary',
    gradeLevel: 'Primary 4-6',
    description: 'Computer basics, digital literacy, and technology skills',
    isCore: true
  },
  {
    name: 'Agriculture',
    code: 'PR011',
    level: 'Primary',
    gradeLevel: 'Primary 4-6',
    description: 'Basic agricultural concepts and practices',
    isCore: false,
    isElective: true
  }
]

// Junior High School Subjects (JHS 1-3)
export const JUNIOR_HIGH_SUBJECTS: Subject[] = [
  // Core Subjects
  {
    name: 'English Language',
    code: 'JHS001',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Advanced English skills, literature, and communication',
    isCore: true
  },
  {
    name: 'Mathematics',
    code: 'JHS002',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Algebra, geometry, statistics, and advanced problem-solving',
    isCore: true
  },
  {
    name: 'Integrated Science',
    code: 'JHS003',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Physics, chemistry, biology, and earth science',
    isCore: true
  },
  {
    name: 'Social Studies',
    code: 'JHS004',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'History, geography, economics, and government',
    isCore: true
  },
  {
    name: 'Religious and Moral Education (RME)',
    code: 'JHS005',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Comparative religion, ethics, and moral reasoning',
    isCore: true
  },
  {
    name: 'Ghanaian Language',
    code: 'JHS006',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Advanced local language studies',
    isCore: true
  },
  {
    name: 'French',
    code: 'JHS007',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Intermediate French language skills',
    isCore: true
  },
  {
    name: 'Information and Communication Technology (ICT)',
    code: 'JHS008',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Computer applications, programming basics, and digital skills',
    isCore: true
  },
  // Pre-Technical Skills
  {
    name: 'Pre-Technical Skills',
    code: 'JHS009',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Basic technical skills, tools, and practical applications',
    isCore: true
  },
  // Elective Subjects
  {
    name: 'Home Economics',
    code: 'JHS010',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Food and nutrition, clothing, and home management',
    isCore: false,
    isElective: true
  },
  {
    name: 'Agricultural Science',
    code: 'JHS011',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Crop production, animal husbandry, and agricultural practices',
    isCore: false,
    isElective: true
  },
  {
    name: 'Visual Arts',
    code: 'JHS012',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Drawing, painting, sculpture, and design',
    isCore: false,
    isElective: true
  },
  {
    name: 'Music',
    code: 'JHS013',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Vocal and instrumental music, music theory',
    isCore: false,
    isElective: true
  },
  {
    name: 'Physical Education',
    code: 'JHS014',
    level: 'Junior High',
    gradeLevel: 'JHS 1-3',
    description: 'Sports, fitness, and health education',
    isCore: false,
    isElective: true
  }
]

// Combined subjects for all levels
export const ALL_SUBJECTS = [
  ...EARLY_CHILDHOOD_SUBJECTS,
  ...PRIMARY_SUBJECTS,
  ...JUNIOR_HIGH_SUBJECTS
]

// Helper functions
export const getSubjectsByLevel = (level: 'Early Childhood' | 'Primary' | 'Junior High'): Subject[] => {
  switch (level) {
    case 'Early Childhood':
      return EARLY_CHILDHOOD_SUBJECTS
    case 'Primary':
      return PRIMARY_SUBJECTS
    case 'Junior High':
      return JUNIOR_HIGH_SUBJECTS
    default:
      return []
  }
}

export const getCoreSubjects = (level: 'Early Childhood' | 'Primary' | 'Junior High'): Subject[] => {
  return getSubjectsByLevel(level).filter(subject => subject.isCore)
}

export const getElectiveSubjects = (level: 'Early Childhood' | 'Primary' | 'Junior High'): Subject[] => {
  return getSubjectsByLevel(level).filter(subject => subject.isElective)
}

export const getSubjectsByGrade = (grade: string): Subject[] => {
  return ALL_SUBJECTS.filter(subject => {
    const gradeLevels = subject.gradeLevel.split('-')
    return gradeLevels.some(level => level.includes(grade.split(' ')[0]))
  })
}

// Subject codes for easy reference
export const SUBJECT_CODES = {
  EARLY_CHILDHOOD: EARLY_CHILDHOOD_SUBJECTS.map(s => s.code),
  PRIMARY: PRIMARY_SUBJECTS.map(s => s.code),
  JUNIOR_HIGH: JUNIOR_HIGH_SUBJECTS.map(s => s.code)
}
