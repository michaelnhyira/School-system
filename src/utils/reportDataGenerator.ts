import type { Student, Grade } from '../types/index';

export interface ReportCardData {
  student: Student;
  grades: Grade[];
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
  nextTermBegins: string;
  reportDate: string;
  teacherComments: string;
  headTeacherComments: string;
}

// Ghanaian Primary School Subjects
export const ghanaianSubjects = [
  'ENGLISH',
  'GHANAIAN LANGUAGE & CULTURE',
  'MATHEMATICS',
  'INTEGRATED / NATURAL SCIENCE',
  'INFORMATION AND COMMUNICATION TECHNOLOGY (I.C.T)',
  'CREATIVE ARTS',
  'RELIGIOUS AND MORAL EDUCATION',
  'PHYSICAL EDUCATION',
  'CITIZENSHIP / ENVIRONMENT',
  'PROJECT'
];

// Grade calculation based on Ghanaian system
export const calculateGrade = (totalScore: number): string => {
  if (totalScore >= 90) return 'A+';
  if (totalScore >= 80) return 'A';
  if (totalScore >= 70) return 'B+';
  if (totalScore >= 60) return 'B';
  if (totalScore >= 50) return 'C+';
  if (totalScore >= 40) return 'C';
  if (totalScore >= 30) return 'D+';
  if (totalScore >= 20) return 'D';
  return 'E';
};

// Generate sample report data
export const generateSampleReportData = (student: Student): ReportCardData => {
  const grades: Grade[] = ghanaianSubjects.map((subject) => {
    // Generate realistic scores
    const sbaScore = Math.floor(Math.random() * 20) + 30; // 30-50
    const examScore = Math.floor(Math.random() * 20) + 30; // 30-50
    const totalScore = sbaScore + examScore;
    const grade = calculateGrade(totalScore);
    const position = Math.floor(Math.random() * 25) + 1; // 1-25

    // Generate contextual remarks
    const remarks = generateRemarks(subject, grade, totalScore);

    return {
      subject,
      sbaScore,
      examScore,
      totalScore,
      grade,
      position,
      remarks
    };
  });

  // Sort by total score to get proper positions
  grades.sort((a, b) => b.totalScore - a.totalScore);
  grades.forEach((grade, index) => {
    grade.position = index + 1;
  });

  // Generate attendance data
  const totalDays = 90; // Typical term length
  const present = Math.floor(Math.random() * 10) + 80; // 80-90 days
  const absent = totalDays - present;

  // Generate comments
  const teacherComments = generateTeacherComments(student, grades);
  const headTeacherComments = generateHeadTeacherComments(student, grades);

  return {
    student,
    grades,
    attendance: {
      present,
      absent,
      total: totalDays
    },
    nextTermBegins: 'January 15, 2025',
    reportDate: new Date().toLocaleDateString('en-GB'),
    teacherComments,
    headTeacherComments
  };
};

// Generate contextual remarks based on subject and performance
const generateRemarks = (subject: string, grade: string, totalScore: number): string => {
  const excellentRemarks = [
    'Outstanding performance! Shows excellent understanding and application.',
    'Exceptional work! Demonstrates mastery of concepts.',
    'Excellent progress! Keep up the great work.',
    'Outstanding achievement! Shows great potential.'
  ];

  const goodRemarks = [
    'Good performance! Shows solid understanding.',
    'Well done! Demonstrates good grasp of concepts.',
    'Good progress! Continue working hard.',
    'Satisfactory work! Shows improvement.'
  ];

  const averageRemarks = [
    'Satisfactory performance. Room for improvement.',
    'Adequate work. Focus on weak areas.',
    'Fair performance. Needs more practice.',
    'Satisfactory progress. Keep trying.'
  ];

  const poorRemarks = [
    'Needs improvement. Focus on basic concepts.',
    'Below expectations. Requires extra support.',
    'Needs more effort. Seek help when needed.',
    'Requires attention. Practice regularly.'
  ];

  let remarks: string[] = [];

  if (totalScore >= 80) {
    remarks = excellentRemarks;
  } else if (totalScore >= 60) {
    remarks = goodRemarks;
  } else if (totalScore >= 40) {
    remarks = averageRemarks;
  } else {
    remarks = poorRemarks;
  }

  // Add subject-specific comments
  const subjectSpecific = getSubjectSpecificRemarks(subject, grade);
  const randomRemark = remarks[Math.floor(Math.random() * remarks.length)];
  
  return `${randomRemark} ${subjectSpecific}`;
};

// Generate subject-specific remarks
const getSubjectSpecificRemarks = (subject: string, grade: string): string => {
  const subjectRemarks: Record<string, Record<string, string>> = {
    'ENGLISH': {
      'A+': 'Excellent reading and writing skills.',
      'A': 'Strong language skills.',
      'B+': 'Good communication abilities.',
      'B': 'Satisfactory language development.',
      'C+': 'Basic language skills developing.',
      'C': 'Needs more practice in reading and writing.',
      'D+': 'Requires support in language skills.',
      'D': 'Needs intensive language support.',
      'E': 'Significant support needed in English.'
    },
    'MATHEMATICS': {
      'A+': 'Excellent problem-solving skills.',
      'A': 'Strong mathematical thinking.',
      'B+': 'Good numerical skills.',
      'B': 'Satisfactory math development.',
      'C+': 'Basic math skills developing.',
      'C': 'Needs more practice in calculations.',
      'D+': 'Requires support in math concepts.',
      'D': 'Needs intensive math support.',
      'E': 'Significant support needed in mathematics.'
    },
    'INTEGRATED / NATURAL SCIENCE': {
      'A+': 'Excellent scientific thinking.',
      'A': 'Strong understanding of science concepts.',
      'B+': 'Good scientific inquiry skills.',
      'B': 'Satisfactory science development.',
      'C+': 'Basic science skills developing.',
      'C': 'Needs more practice in science.',
      'D+': 'Requires support in science concepts.',
      'D': 'Needs intensive science support.',
      'E': 'Significant support needed in science.'
    }
  };

  return subjectRemarks[subject]?.[grade] || 'Continue working hard in this subject.';
};

// Generate teacher comments
const generateTeacherComments = (student: Student, grades: Grade[]): string => {
  const averageScore = grades.reduce((sum, grade) => sum + grade.totalScore, 0) / grades.length;
  const excellentSubjects = grades.filter(g => g.grade === 'A+' || g.grade === 'A').length;
  const needsImprovement = grades.filter(g => g.grade === 'D' || g.grade === 'E').length;

  if (averageScore >= 80) {
    return `${student.name} is an excellent student who consistently performs well across all subjects. ${excellentSubjects} subjects show outstanding performance. Keep up the excellent work!`;
  } else if (averageScore >= 60) {
    return `${student.name} is a good student with solid academic performance. Shows particular strength in ${excellentSubjects} subjects. Continue working hard!`;
  } else if (averageScore >= 40) {
    return `${student.name} shows satisfactory progress this term. Focus on improving in weaker subjects. ${needsImprovement > 0 ? `${needsImprovement} subjects need more attention.` : ''}`;
  } else {
    return `${student.name} needs more support and encouragement. ${needsImprovement} subjects require immediate attention. Please work closely with teachers to improve performance.`;
  }
};

// Generate head teacher comments
const generateHeadTeacherComments = (student: Student, grades: Grade[]): string => {
  const averageScore = grades.reduce((sum, grade) => sum + grade.totalScore, 0) / grades.length;
  const attendance = 85; // Sample attendance percentage

  if (averageScore >= 80 && attendance >= 90) {
    return `${student.name} demonstrates exemplary academic performance and excellent attendance. This student is a model for others to follow. Well done!`;
  } else if (averageScore >= 60 && attendance >= 80) {
    return `${student.name} shows good academic progress and regular attendance. Continue this positive trend.`;
  } else if (averageScore >= 40) {
    return `${student.name} has made satisfactory progress this term. Focus on consistent attendance and regular study habits.`;
  } else {
    return `${student.name} requires additional support and attention. We encourage regular communication between home and school to ensure the best outcomes for this student.`;
  }
};

// Generate multiple report cards for a class
export const generateClassReports = (students: Student[]): ReportCardData[] => {
  return students.map(student => generateSampleReportData(student));
};

// Export utility functions
export const reportUtils = {
  generateSampleReportData,
  generateClassReports,
  calculateGrade,
  ghanaianSubjects
};
