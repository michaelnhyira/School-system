export interface Student {
  id: string;
  name: string;
  className: string;
  academicYear: string;
  term: string;
  photoUrl?: string;
  fullName?: string;
  class?: string;
  assignedClass?: string;
}

export interface Grade {
  subject: string;
  sbaScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  position: number;
  remarks: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  assignedClass?: string;
  photoUrl?: string;
}

export interface Class {
  id: string;
  name: string;
  level: string;
  capacity: number;
  classTeacherId?: string;
  subjects: string[];
  students: string[];
}

export interface Subject {
  id: string;
  name: string;
  level: string;
  credits: number;
  duration: string;
  description?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  className: string;
}

export interface Fee {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  paymentMethod?: string;
  paidDate?: string;
  className: string;
  academicYear: string;
  term: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher' | 'accountant';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface AcademicPeriod {
  id: string;
  academicYear: string;
  term: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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