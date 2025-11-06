import React, { useState, useEffect } from 'react'
import { Search, Users, Award, Eye, FileText, ClipboardList, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useGradesAcademicPeriod } from '../contexts/GradesAcademicPeriodContext'
import { studentUtils, teacherUtils, gradesUtils, reportUtils, classUtils } from '../utils/firebaseUtils'
import { PRIMARY_SUBJECTS, JUNIOR_HIGH_SUBJECTS, EARLY_CHILDHOOD_SUBJECTS } from '../constants/subjects'

interface Student {
  id: string
  name: string
  fullName: string
  phone: string
  contactNumber: string
  grade: string
  class: string
  assignedClass: string
  enrollmentDate: string
  status: 'active' | 'inactive'
  parentName: string
  guardianName: string
  parentPhone: string
  guardianContact: string
  address: string
  dob: string
  gender: string
  nationality: string
  religion: string
  prevSchool: string
  lastClass: string
  subjects: string
  specialNeeds: string
  relationship: string
  occupation: string
  guardianAddress: string
  admissionNumber: string
  house: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

interface Teacher {
  id: string
  fullName: string
  email: string
  assignedClass: string
  subjects: string[]
}

interface Grade {
  id: string
  studentId: string
  studentName: string
  subject: string
  assignment: string
  score: number
  maxScore: number
  grade: string
  comments: string
  date: string
  academicYear: string
  term: string
  teacherId: string
  teacherName: string
  createdAt: string
  updatedAt: string
}

// Helper functions for report generation
const generateCoverPage = (student: Student, currentPeriod: any, _teacher: Teacher) => {
  return `
    <div class="cover-page">
      <div class="cover-header">
        <div class="flex items-center justify-between mb-8 border-b-2 border-purple-600 pb-4">
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 bg-gradient-to-br from-purple-600 to-green-600 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
      </div>
            <div>
              <h1 class="text-2xl font-bold text-purple-600">BLESSED BLESS ACADEMY</h1>
              <p class="text-lg text-purple-500 italic">Excellence in Education</p>
              <p class="text-sm text-gray-600">Primary School Division</p>
          </div>
          </div>
          <div class="text-right">
            <h2 class="text-3xl font-bold text-gray-800 mb-2">REPORT CARD</h2>
            <div class="text-sm text-gray-600 space-y-1">
              <p><span class="font-semibold">Academic Year:</span> ${currentPeriod.academicYear}</p>
              <p><span class="font-semibold">Term:</span> ${currentPeriod.term}</p>
              <p><span class="font-semibold">Date:</span> ${new Date().toLocaleDateString()}</p>
          </div>
          </div>
        </div>
      </div>
      
      <div class="student-info">
        <div class="grid grid-cols-2 gap-8 mb-8">
          <div class="space-y-4">
            <div class="flex items-center space-x-4">
              ${student.photoUrl ? `
                <img src="${student.photoUrl}" alt="Student Photo" class="w-20 h-20 rounded-full object-cover border-2 border-purple-200" />
              ` : `
                <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center border-2 border-purple-200">
                  <span class="text-purple-600 font-semibold text-2xl">${student.fullName.charAt(0)}</span>
        </div>
              `}
              <div>
                <h3 class="text-xl font-bold text-gray-800">${student.fullName}</h3>
                <p class="text-gray-600">Class: ${student.assignedClass || 'N/A'}</p>
        </div>
        </div>
        </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="font-semibold">Next Term Begins:</span>
              <span class="border-b borde r-gray-300 w-32 text-center">_________________</span>
        </div>
            <div class="flex justify-between">
              <span class="font-semibold">School:</span>
              <span class="border-b border-gray-300 w-32 text-center">BLESSED BLESS ACADEMY</span>
            </div>
            <div class="flex justify-between">
              <span class="font-semibold">Class:</span>
              <span class="border-b border-gray-300 w-32 text-center">${student.assignedClass || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const generateDetailsPage = (_student: Student, studentGrades: any, _currentPeriod: any, _teacher: Teacher, _subjects: string[], _averageScore: number, _averageGrade: string, studentPositions: Record<string, number> = {}) => {
  const grades = studentGrades?.grades || {}
  
  // Get subjects from actual grades data
  const reportSubjects = Object.keys(grades).filter(subject => {
    const gradeData = grades[subject]
    return gradeData && (gradeData.sbaScore || gradeData.examScore || gradeData.totalScore || gradeData.classScore || gradeData.score)
  });

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 font-bold';
      case 'B+':
      case 'B':
        return 'text-blue-600 font-semibold';
      case 'C+':
      case 'C':
        return 'text-yellow-600 font-semibold';
      case 'D+':
      case 'D':
        return 'text-orange-600 font-semibold';
      case 'E':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-600';
    }
  };
  
  return `
    <div class="details-page">
      <div class="mb-8">
        <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">ACADEMIC PERFORMANCE</h3>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-400">
          <thead>
            <tr>
                    <th>SUBJECT</th>
                    <th>SBA SCORE<br/>(50)</th>
                    <th>EXAMS SCORE<br/>(50)</th>
                    <th>TOTAL SCORE<br/>(100)</th>
                    <th>GRADE</th>
                    <th>POSITION</th>
                    <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
              ${reportSubjects.map((subject, index) => {
              const gradeData = grades[subject]
                const grade = gradeData ? gradeData.grade : ''
              
              return `
                      <tr class="${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
                        <td>
                          ${subject}
                        </td>
                        <td>
                          ${gradeData?.sbaScore || gradeData?.classScore || '--'}
                        </td>
                        <td>
                          ${gradeData?.examScore || '--'}
                        </td>
                        <td style="font-weight: 700;">
                          ${gradeData?.totalScore || gradeData?.score || '--'}
                        </td>
                        <td class="${getGradeColor(grade)}">
                          ${grade || '--'}
                        </td>
                        <td>
                          ${studentPositions[subject] || gradeData?.position || '--'}
                        </td>
                        <td>
                          ${gradeData?.remarks || gradeData?.comments || 'No remarks'}
                        </td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
      </div>
      
        <div class="mb-6">
          <h3 class="text-sm font-bold text-gray-800 mb-3">ATTENDANCE</h3>
          <div class="flex items-center space-x-3 mb-4">
            <span class="text-xs font-semibold">ATTENDANCE</span>
            <div class="flex-1 border-b-2 border-dotted border-gray-400 h-4"></div>
            <span class="text-xs font-semibold">OUT OF TOTAL OF</span>
            <div class="flex-1 border-b-2 border-dotted border-gray-400 h-4"></div>
          </div>
        </div>
        
        <div class="mb-6">
          <h3 class="text-sm font-bold text-gray-800 mb-3">TALENT AND INTEREST</h3>
          <div class="border-b-2 border-dotted border-gray-400 h-6 mb-4"></div>
        </div>
        
        <div class="mb-6">
          <h3 class="text-sm font-bold text-gray-800 mb-3">CONDUCT:</h3>
          <p class="text-xs text-gray-700 mb-3">COMMENT ON PUPIL'S COURTESY, EMOTIONAL CONTROL, INITIATIVE, DEPENDABILITY AND SENSE OF CO-OPERATION.</p>
          <div class="border-b-2 border-dotted border-gray-400 h-12 mb-4"></div>
          </div>
        
      <div class="mb-6">
        <h3 class="text-sm font-bold text-gray-800 mb-3">CLASS TEACHER'S REMARKS AND SIGNATURE</h3>
        <div class="border-b-2 border-dotted border-gray-400 h-6 mb-4"></div>
        </div>
        
      <div class="mb-6">
        <h3 class="text-sm font-bold text-gray-800 mb-3">HEAD TEACHER'S REMARKS AND SIGNATURE</h3>
        <div class="border-b-2 border-dotted border-gray-400 h-6 mb-4"></div>
          </div>
          
      <div class="border-t-2 border-purple-600 pt-4">
        <div class="grid grid-cols-3 gap-8 text-center">
          <div>
            <div class="border-b border-gray-400 w-32 mx-auto mb-2"></div>
            <p class="text-sm font-semibold">Class Teacher</p>
          </div>
          <div>
            <div class="border-b border-gray-400 w-32 mx-auto mb-2"></div>
            <p class="text-sm font-semibold">Head Teacher</p>
          </div>
          <div>
            <div class="border-b border-gray-400 w-32 mx-auto mb-2"></div>
            <p class="text-sm font-semibold">Date</p>
          </div>
        </div>
        <div class="text-center mt-6">
          <p class="text-xs text-gray-500">
            This report card is issued by Blessed Bless Academy Primary School
          </p>
          <p class="text-xs text-gray-500 mt-1">
            For any queries, please contact the school administration
          </p>
        </div>
      </div>
    </div>
  `;
};


const generateReportCardHTML = (student: Student, studentGrades: any, currentPeriod: any, teacher: Teacher, studentPositions: Record<string, number> = {}) => {
  // Calculate overall statistics
  const grades = studentGrades?.grades || {}
  const subjects = Object.keys(grades).filter(subject => {
    const gradeData = grades[subject]
    return gradeData && (gradeData.sbaScore || gradeData.examScore || gradeData.totalScore)
  })
  
  let totalScore = 0
  let totalMaxScore = 0
  let gradeCount = 0

  subjects.forEach(subject => {
    const gradeData = grades[subject]
    if (gradeData && (gradeData.totalScore || gradeData.score)) {
      const score = parseFloat(gradeData.totalScore || gradeData.score)
      totalScore += score
      totalMaxScore += 100 // Assuming 100 is max score per subject
      gradeCount++
    }
  })

  const averageScore = gradeCount > 0 ? (totalScore / totalMaxScore) * 100 : 0
  const averageGrade = calculateGradeFromScore(averageScore)

  // Generate cover page
  const coverPage = generateCoverPage(student, currentPeriod, teacher)
  
  // Generate details page
  const detailsPage = generateDetailsPage(student, studentGrades, currentPeriod, teacher, subjects, averageScore, averageGrade, studentPositions)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Report Card - ${student.fullName}</title>
      <style>
        @page {
          size: A4;
          margin: 0.3in;
          resolution: 300dpi;
        }
        
        body {
          font-family: 'Times New Roman', serif;
          margin: 0;
          padding: 0;
          background: white;
          color: #000;
          font-size: 11px;
          line-height: 1.3;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          text-rendering: optimizeLegibility;
        }
        
        .page {
          width: 100%;
          max-width: 8.5in;
          height: 11in;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          padding: 0.5in;
          box-sizing: border-box;
          margin: 0 auto;
          transform: scale(1.0);
          transform-origin: top left;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        /* High DPI support */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .page {
            transform: scale(1.2);
            width: 83%;
          }
        }
        
        @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) {
          .page {
            transform: scale(1.5);
            width: 67%;
          }
        }
        
        /* Cover Page Styles */
        .cover-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          padding: 2rem 0;
        }
        
        /* Tailwind-like utility classes */
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .space-x-4 > * + * { margin-left: 1rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mt-6 { margin-top: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .pb-4 { padding-bottom: 1rem; }
        .px-2 { padding-left: 0.3rem; padding-right: 0.3rem; }
        .py-2 { padding-top: 0.3rem; padding-bottom: 0.3rem; }
        .py-1 { padding-top: 0.2rem; padding-bottom: 0.2rem; }
        .p-4 { padding: 1rem; }
        .p-3 { padding: 0.75rem; }
        .p-8 { padding: 2rem; }
        .w-16 { width: 4rem; }
        .h-16 { height: 4rem; }
        .w-20 { width: 5rem; }
        .h-20 { height: 5rem; }
        .w-32 { width: 8rem; }
        .w-10 { width: 2.5rem; }
        .h-10 { height: 2.5rem; }
        .w-full { width: 100%; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .h-4 { height: 1rem; }
        .h-6 { height: 1.5rem; }
        .h-12 { height: 3rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .text-purple-600 { color: #9333ea; }
        .text-purple-500 { color: #a855f7; }
        .text-gray-800 { color: #1f2937; }
        .text-gray-700 { color: #374151; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-500 { color: #6b7280; }
        .text-green-600 { color: #16a34a; }
        .text-red-600 { color: #dc2626; }
        .text-blue-600 { color: #2563eb; }
        .text-yellow-600 { color: #ca8a04; }
        .text-orange-600 { color: #ea580c; }
        .bg-purple-100 { background-color: #f3e8ff; }
        .bg-purple-200 { background-color: #e9d5ff; }
        .bg-gray-50 { background-color: #f9fafb; }
        .bg-gray-25 { background-color: #fcfcfd; }
        .bg-white { background-color: #ffffff; }
        .bg-gradient-to-br { background: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
        .from-purple-600 { --tw-gradient-from: #9333ea; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(147, 51, 234, 0)); }
        .to-green-600 { --tw-gradient-to: #16a34a; }
        .rounded-full { border-radius: 9999px; }
        .rounded-lg { border-radius: 0.5rem; }
        .border-2 { border-width: 2px; }
        .border-b { border-bottom-width: 1px; }
        .border-t-2 { border-top-width: 2px; }
        .border-gray-300 { border-color: #d1d5db; }
        .border-gray-400 { border-color: #9ca3af; }
        .border-purple-200 { border-color: #e9d5ff; }
        .border-purple-600 { border-color: #9333ea; }
        .border-collapse { border-collapse: collapse; }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .gap-8 { gap: 2rem; }
        .gap-4 { gap: 1rem; }
        .overflow-x-auto { overflow-x: auto; }
        .min-h-\[60px\] { min-height: 60px; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .italic { font-style: italic; }
        .pl-6 { padding-left: 1.5rem; }
        
        /* Table specific styling */
        .w-full { width: 100%; }
        .border-collapse { border-collapse: collapse; }
        .border { border-width: 1px; }
        .border-gray-400 { border-color: #9ca3af; }
        
        /* Table column widths */
        table { 
          width: 100%; 
          table-layout: fixed; 
          font-size: 0.75rem;
        }
        
        th:first-child, td:first-child { width: 20%; } /* Subject */
        th:nth-child(2), td:nth-child(2) { width: 12%; } /* SBA Score */
        th:nth-child(3), td:nth-child(3) { width: 12%; } /* Exam Score */
        th:nth-child(4), td:nth-child(4) { width: 12%; } /* Total Score */
        th:nth-child(5), td:nth-child(5) { width: 10%; } /* Grade */
        th:nth-child(6), td:nth-child(6) { width: 10%; } /* Position */
        th:last-child, td:last-child { width: 24%; } /* Remarks */
        
        /* Table header styling */
        th {
          background-color: #f3e8ff !important;
          border: 1px solid #9ca3af !important;
          padding: 0.3rem !important;
          text-align: center !important;
          font-weight: 700 !important;
          font-size: 0.7rem !important;
          line-height: 1.2 !important;
          vertical-align: middle !important;
        }
        
        /* Specific header styling for better display */
        th:first-child { text-align: left !important; } /* Subject */
        th:last-child { text-align: left !important; } /* Remarks */
        
        /* Table cell styling */
        td {
          border: 1px solid #9ca3af !important;
          padding: 0.3rem !important;
          text-align: center !important;
          font-size: 0.7rem !important;
          line-height: 1.2 !important;
          vertical-align: middle !important;
        }
        
        /* Specific cell styling */
        td:first-child { text-align: left !important; font-weight: 600 !important; } /* Subject */
        td:last-child { text-align: left !important; font-size: 0.65rem !important; } /* Remarks */
        
        /* Dotted line styling */
        .border-dotted { border-style: dotted; }
        .border-b-2 { border-bottom-width: 2px; }
        .h-6 { height: 1.5rem; }
        .h-8 { height: 2rem; }
        .h-16 { height: 4rem; }
        
        .cover-header {
          margin-bottom: 1.5rem;
        }
        
        .school-name {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 10px 0;
          letter-spacing: 1px;
        }
        
        .education-service {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 8px 0;
          color: #333;
        }
        
        .report-title {
          font-size: 22px;
          font-weight: bold;
          margin: 0 0 8px 0;
          text-decoration: underline;
        }
        
        .school-type {
          font-size: 16px;
          font-weight: bold;
          margin: 0;
          color: #666;
        }
        
        .school-logo {
          margin: 0.5rem 0;
        }
        
        .logo-shield {
          width: 120px;
          height: 120px;
          border: 3px solid #000;
          border-radius: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          margin: 0 auto 1rem auto;
        }
        
        .shield-quadrant {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #000;
          font-size: 16px;
          font-weight: bold;
        }
        
        .motto-banner {
          font-size: 14px;
          font-weight: bold;
          margin-top: 0.5rem;
          text-decoration: underline;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 200px;
        }
        
        .motto-left, .motto-right {
          flex: 1;
        }
        
        .motto-center {
          flex: 0.5;
          text-align: center;
        }
        
        .cover-info {
          margin-top: 1.5rem;
          text-align: left;
          width: 100%;
          max-width: 350px;
        }
        
        .info-line {
          display: flex;
          margin-bottom: 0.8rem;
          font-size: 14px;
        }
        
        .info-line .label {
          font-weight: bold;
          min-width: 80px;
          margin-right: 10px;
        }
        
        .info-line .dots {
          flex: 1;
          padding-bottom: 2px;
          font-family: monospace;
        }
        
        
        /* Details Page Styles */
        .details-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding-top: 0;
          margin-top: -0.2in;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.1rem;
          padding-bottom: 0.1rem;
          border-bottom: 2px solid #000;
          flex-wrap: wrap;
        }
        
        .header-left, .header-right {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        
        .info-group {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        
        .info-group .label {
          font-weight: bold;
          font-size: 11px;
        }
        
        .info-group .dots {
          min-width: 100px;
          padding-bottom: 1px;
          font-family: monospace;
        }
        
        .term-info {
          text-align: right;
        }
        
        .term-label {
          font-weight: bold;
          font-size: 14px;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .academic-table {
          flex: 1;
          margin-bottom: 0.1rem;
          overflow: hidden;
        }
        
        .performance-table {
          width: 100%;
          max-width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          font-size: 9px;
          table-layout: fixed;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        .performance-table th {
          background-color: #f0f0f0;
          border: 1px solid #000;
          padding: 2px;
          text-align: center;
          font-weight: bold;
          vertical-align: top;
        }
        
        .performance-table td {
          border: 1px solid #000;
          padding: 2px;
          text-align: center;
          vertical-align: middle;
        }
        
        .subject-col {
          width: 25%;
          text-align: left !important;
        }
        
        .score-col {
          width: 10%;
        }
        
        .grade-col, .position-col {
          width: 7%;
        }
        
        .remarks-col {
          width: 25%;
          text-align: left !important;
        }
        
        .sub-heading {
          font-size: 8px;
          font-weight: normal;
        }
        
        .subject-name {
          text-align: left !important;
          font-weight: bold;
        }
        
        .english-sub .subject-name {
          padding-left: 15px;
          font-weight: normal;
          font-style: italic;
          font-size: 9px;
        }
        
        .score-cell, .grade-cell, .position-cell {
          font-weight: bold;
        }
        
        .remarks-cell {
          text-align: left !important;
        }
        
        .additional-info {
          margin-top: 0.1rem;
          flex-shrink: 0;
        }
        
        .attendance-section, .talent-section, .conduct-section {
          margin-bottom: 0.2rem;
          font-size: 11px;
        }
        
        .attendance-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .talent-section .dots, .conduct-comment {
          margin-top: 0.25rem;
          min-height: 20px;
          font-family: monospace;
        }
        
        .dots {
          font-family: monospace;
        }
        
        .conduct-prompt {
          font-size: 10px;
          font-style: italic;
          margin: 0.1rem 0;
        }
        
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 0.3rem;
        }
        
        .teacher-signature, .head-teacher-signature {
          width: 45%;
        }
        
        .signature-line {
          margin-top: 0.5rem;
          min-height: 30px;
          font-family: monospace;
        }
        
      </style>
    </head>
    <body>
      <div class="page">
        ${coverPage}
            </div>
      <div class="page">
        ${detailsPage}
      </div>
    </body>
    </html>
  `
}

const calculateGradeFromScore = (score: number): string => {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

// Calculate positions for all students in each subject
const calculateStudentPositions = async (classStudents: Student[], currentPeriod: any) => {
  const studentPositions: Record<string, Record<string, number>> = {}
  
  try {
    // Get grades for all students in the class
    const allStudentGrades = await Promise.all(
      classStudents.map(async (student) => {
        const gradesData = await gradesUtils.getStudentGrades(
          currentPeriod.academicYear,
          currentPeriod.term,
          student.id
        )
        return {
          studentId: student.id,
          studentName: student.fullName,
          grades: gradesData?.grades || {}
        }
      })
    )

    // Get all unique subjects across all students
    const allSubjects = new Set<string>()
    allStudentGrades.forEach(studentData => {
      Object.keys(studentData.grades).forEach(subject => {
        allSubjects.add(subject)
      })
    })

    // Calculate positions for each subject
    for (const subject of allSubjects) {
      // Collect scores for this subject from all students
      const subjectScores: Array<{studentId: string, studentName: string, score: number}> = []
      
      allStudentGrades.forEach(studentData => {
        const gradeData = studentData.grades[subject]
        if (gradeData) {
          const score = parseFloat(gradeData.totalScore || gradeData.score || '0')
          if (score > 0) {
            subjectScores.push({
              studentId: studentData.studentId,
              studentName: studentData.studentName,
              score: score
            })
          }
        }
      })

      // Sort by score (descending - highest first)
      subjectScores.sort((a, b) => b.score - a.score)

      // Assign positions (handle ties)
      let currentPosition = 1
      let previousScore = -1
      
      subjectScores.forEach((studentScore, index) => {
        if (previousScore !== -1 && studentScore.score < previousScore) {
          currentPosition = index + 1
        }
        
        if (!studentPositions[studentScore.studentId]) {
          studentPositions[studentScore.studentId] = {}
        }
        studentPositions[studentScore.studentId][subject] = currentPosition
        
        previousScore = studentScore.score
      })
    }

    console.log('Calculated positions:', studentPositions)
    return studentPositions
  } catch (error) {
    console.error('Error calculating positions:', error)
    return {}
  }
}


const Grades = () => {
  const { currentUser } = useAuth()
  const { currentPeriod } = useGradesAcademicPeriod()
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [students, setStudents] = useState<Student[]>([])
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [allClassSubjects, setAllClassSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [showGradesModal, setShowGradesModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [grades, setGrades] = useState<Grade[]>([])
  const [isSavingGrade, setIsSavingGrade] = useState(false)
  const [isGeneratingReports, setIsGeneratingReports] = useState(false)
  const [isDownloadingReports, setIsDownloadingReports] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [showDownloadProgressModal, setShowDownloadProgressModal] = useState(false)
  const [showBatchRecordModal, setShowBatchRecordModal] = useState(false)
  const [selectedSubjectsForBatch, setSelectedSubjectsForBatch] = useState<string[]>([])
  const [batchGrades, setBatchGrades] = useState<Record<string, Record<string, { classScore: string; examScore: string }>>>({})
  const [isSavingBatch, setIsSavingBatch] = useState(false)

  // Grade form state - now for multiple subjects
  const [gradeForm, setGradeForm] = useState({
    maxScore: '',
    comments: '',
    classMaxScore: '30',
    examMaxScore: '70',
    subjectGrades: {} as Record<string, { classScore: string; examScore: string; classGrade: string; examGrade: string }>
  })

  // Function to get all subjects for a class level
  const getAllSubjectsForClass = async (className: string): Promise<string[]> => {
    try {
      // First try to get the actual class data from database
      const classData = await classUtils.getClassByName(className) as any
      if (classData && classData.subjects && classData.subjects.length > 0) {
        return classData.subjects
      }
    } catch (error) {
      console.error('Error fetching class subjects:', error)
    }
    
    // Fallback to hardcoded subjects based on class level
    if (className.includes('Creche') || className.includes('Nursery') || className.includes('Kindergarten')) {
      return EARLY_CHILDHOOD_SUBJECTS.map(subject => subject.name)
    } else if (className.includes('Primary')) {
      return PRIMARY_SUBJECTS.map(subject => subject.name)
    } else if (className.includes('JHS')) {
      return JUNIOR_HIGH_SUBJECTS.map(subject => subject.name)
    }
    return []
  }

  // Fetch teacher information and students
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.email) return

      try {
        setLoading(true)
        
        // Get all teachers and find the current teacher
        const teachers = await teacherUtils.getTeachers()
        const currentTeacher = teachers.find((t: any) => t.email === currentUser.email)
        
        if (currentTeacher) {
          const teacherData = {
            id: currentTeacher.id,
            fullName: (currentTeacher as any).fullName,
            email: (currentTeacher as any).email,
            assignedClass: (currentTeacher as any).assignedClass || '',
            subjects: (currentTeacher as any).subjects || []
          }
          setTeacher(teacherData)
          
          // Set all subjects for the class level
          const classSubjects = await getAllSubjectsForClass(teacherData.assignedClass)
          setAllClassSubjects(classSubjects)
          
          // Fetch all students
          const allStudents = await studentUtils.getStudents()
          
          // Filter students by the teacher's assigned class
          const classStudents = allStudents.filter((student: any) => 
            student.assignedClass === teacherData.assignedClass || 
            student.class === teacherData.assignedClass
          ).map((student: any) => ({
            id: student.id,
            name: student.fullName || student.name,
            fullName: student.fullName || student.name,
            phone: student.contactNumber || student.phone || '',
            contactNumber: student.contactNumber || student.phone || '',
            grade: student.grade || student.assignedClass || '',
            class: student.class || student.assignedClass || '',
            assignedClass: student.assignedClass || student.class || '',
            enrollmentDate: student.enrollmentDate || new Date().toISOString().split('T')[0],
            status: student.status || 'active',
            parentName: student.guardianName || student.parentName || '',
            guardianName: student.guardianName || student.parentName || '',
            parentPhone: student.guardianContact || student.parentPhone || '',
            guardianContact: student.guardianContact || student.parentPhone || '',
            address: student.address || '',
            dob: student.dob || '',
            gender: student.gender || '',
            nationality: student.nationality || '',
            religion: student.religion || '',
            prevSchool: student.prevSchool || '',
            lastClass: student.lastClass || '',
            subjects: student.subjects || '',
            specialNeeds: student.specialNeeds || '',
            relationship: student.relationship || '',
            occupation: student.occupation || '',
            guardianAddress: student.guardianAddress || '',
            admissionNumber: student.admissionNumber || '',
            house: student.house || '',
            photoUrl: student.photoUrl || '',
            createdAt: student.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: student.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          }))
          
          setStudents(classStudents)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentUser])

  // Fetch grades from the new collection
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const allGrades = await gradesUtils.getAllGrades()
        const transformedGrades: Grade[] = allGrades.map((grade: any) => ({
          id: grade.id,
          studentId: grade.studentId,
          studentName: grade.studentName,
          subject: grade.subject,
          assignment: grade.assignment,
          score: grade.score,
          maxScore: grade.maxScore,
          grade: grade.grade,
          comments: grade.comments,
          date: grade.date,
          academicYear: grade.academicYear,
          term: grade.term,
          teacherId: grade.teacherId,
          teacherName: grade.teacherName,
          createdAt: grade.createdAt,
          updatedAt: grade.updatedAt
        }))
        setGrades(transformedGrades)
      } catch (error) {
        console.error('Error fetching grades:', error)
        setGrades([])
      }
    }

    fetchGrades()
  }, [])

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.guardianName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleGradeStudent = async (student: Student) => {
    setSelectedStudent(student)
    
    // Initialize subject grades for all subjects available for the class
    const initialSubjectGrades: Record<string, { classScore: string; examScore: string; classGrade: string; examGrade: string }> = {}
    allClassSubjects.forEach(subject => {
      initialSubjectGrades[subject] = { classScore: '', examScore: '', classGrade: '', examGrade: '' }
    })
    
    // Load existing grades for this student if available
    let existingComments = ''
    let existingMaxScore = '100'
    let existingClassMaxScore = '30'
    let existingExamMaxScore = '70'
    
    if (currentPeriod) {
      try {
        const existingGrades = await gradesUtils.getStudentGrades(
          currentPeriod.academicYear, 
          currentPeriod.term, 
          student.id
        )
        
        if (existingGrades && existingGrades.grades) {
          // Populate form with existing grades
          console.log(`Loading existing grades for ${student.fullName}:`, existingGrades.grades)
          Object.keys(existingGrades.grades).forEach(subject => {
            if (allClassSubjects.includes(subject)) {
              const gradeData = existingGrades.grades[subject]
              initialSubjectGrades[subject] = {
                classScore: gradeData.sbaScore?.toString() || gradeData.classScore?.toString() || '',
                examScore: gradeData.examScore?.toString() || '',
                classGrade: gradeData.classGrade || '',
                examGrade: gradeData.examGrade || ''
              }
              console.log(`Pre-filled ${subject}:`, initialSubjectGrades[subject])
            }
          })
          
          // Get comments and max scores from the first grade entry
          const firstGrade = Object.values(existingGrades.grades)[0] as any
          if (firstGrade) {
            existingComments = firstGrade.comments || ''
            existingMaxScore = firstGrade.maxScore?.toString() || '100'
            // Calculate class and exam max scores from existing data
            const classMax = parseFloat(firstGrade.classMaxScore?.toString() || '30')
            const examMax = parseFloat(firstGrade.examMaxScore?.toString() || '70')
            existingClassMaxScore = classMax.toString()
            existingExamMaxScore = examMax.toString()
          }
        }
      } catch (error) {
        console.error('Error loading existing grades:', error)
      }
    }
    
    const formData = {
      maxScore: existingMaxScore,
      comments: existingComments,
      classMaxScore: existingClassMaxScore,
      examMaxScore: existingExamMaxScore,
      subjectGrades: initialSubjectGrades
    }
    
    console.log(`Setting grade form for ${student.fullName}:`, formData)
    setGradeForm(formData)
    
    setShowGradeModal(true)
  }

  const handleViewGrades = async (student: Student) => {
    if (!currentPeriod || !teacher) {
      alert('No active academic period or teacher information available.')
      return
    }

    setIsLoadingReport(true)
    setSelectedStudent(student)
    setReportUrl(null)

    try {
      // Check if report exists
      const exists = await reportUtils.reportExists(
        currentPeriod.academicYear,
        currentPeriod.term,
        teacher.assignedClass,
        student.fullName
      )

      if (!exists) {
        alert(`Report card for ${student.fullName} has not been generated yet. Please generate reports first.`)
        setIsLoadingReport(false)
        return
      }

      // Get the report path and download URL (for viewing)
      const fileName = `${student.fullName.replace(/\s+/g, '_')}_${currentPeriod.academicYear}_${currentPeriod.term}.pdf`
      const storagePath = `reports/${currentPeriod.academicYear}_${currentPeriod.term}/${teacher.assignedClass}/${fileName}`
      
      const downloadURL = await reportUtils.getReportDownloadURL(storagePath)
      setReportUrl(downloadURL)
      setShowReportModal(true)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Failed to load report. Please try again.')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleViewReport = (url: string) => {
    window.open(url, '_blank')
  }

  const handleDownloadReport = async (storagePath: string, studentName: string) => {
    try {
      // Use Cloud Function to download report (works in all browsers, even Safari)
      const fileName = `${studentName.replace(/\s+/g, '_')}_${currentPeriod?.academicYear}_${currentPeriod?.term}.pdf`
      const cloudFunctionUrl = `https://us-central1-school-management-e6e17.cloudfunctions.net/downloadReport?storagePath=${encodeURIComponent(storagePath)}&fileName=${encodeURIComponent(fileName)}`
      
      const response = await fetch(cloudFunctionUrl)
      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`)
      }
      
      // Get the blob from the response
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Create anchor element with download attribute
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    }
  }

  const handleDownloadAllReports = async () => {
    if (!currentPeriod || !teacher) {
      alert('No active academic period or teacher information available.')
      return
    }

    // Get all students in the class
    const classStudents = students.filter(student => 
      student.assignedClass === teacher.assignedClass
    )

    if (classStudents.length === 0) {
      alert('No students found in this class.')
      return
    }

    setIsDownloadingReports(true)
    setShowDownloadProgressModal(true)
    setDownloadProgress({ current: 0, total: 0, percentage: 0 })

    try {
      const existingReports: Array<{ student: Student; storagePath: string }> = []
      
      // Check which reports exist and get their storage paths
      setDownloadProgress({ current: 0, total: classStudents.length, percentage: 0 })
      
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i]
        try {
          const exists = await reportUtils.reportExists(
            currentPeriod.academicYear,
            currentPeriod.term,
            teacher.assignedClass,
            student.fullName
          )

          if (exists) {
            const fileName = `${student.fullName.replace(/\s+/g, '_')}_${currentPeriod.academicYear}_${currentPeriod.term}.pdf`
            const storagePath = `reports/${currentPeriod.academicYear}_${currentPeriod.term}/${teacher.assignedClass}/${fileName}`
            existingReports.push({ student, storagePath })
          }
          
          // Update progress while checking
          const checkProgress = Math.round(((i + 1) / classStudents.length) * 50) // First 50% is checking
          setDownloadProgress({ 
            current: i + 1, 
            total: classStudents.length, 
            percentage: checkProgress 
          })
        } catch (error) {
          console.error(`Error checking report for ${student.fullName}:`, error)
        }
      }

      if (existingReports.length === 0) {
        alert('No reports found. Please generate reports first.')
        setIsDownloadingReports(false)
        setShowDownloadProgressModal(false)
        setDownloadProgress({ current: 0, total: 0, percentage: 0 })
        return
      }

      // Update total to reflect actual reports found
      setDownloadProgress({ 
        current: 0, 
        total: existingReports.length, 
        percentage: 50 
      })

      // Download all reports with progress tracking
      for (let i = 0; i < existingReports.length; i++) {
        const { student, storagePath } = existingReports[i]
        
        // Calculate progress: 50% (checking) + 50% (downloading)
        const downloadProgress = 50 + Math.round(((i + 1) / existingReports.length) * 50)
        
        setTimeout(async () => {
          await handleDownloadReport(storagePath, student.fullName)
          setDownloadProgress({ 
            current: i + 1, 
            total: existingReports.length, 
            percentage: downloadProgress 
          })
          
          // Close modal and show success when all downloads are complete
          if (i === existingReports.length - 1) {
            setTimeout(() => {
              setShowDownloadProgressModal(false)
              setIsDownloadingReports(false)
              setDownloadProgress({ current: 0, total: 0, percentage: 0 })
              alert(`Successfully downloaded ${existingReports.length} report(s)!`)
            }, 500)
          }
        }, i * 500) // 500ms delay between each download to allow time for blob processing
      }
    } catch (error) {
      console.error('Error downloading reports:', error)
      alert('Failed to download reports. Please try again.')
      setIsDownloadingReports(false)
      setShowDownloadProgressModal(false)
      setDownloadProgress({ current: 0, total: 0, percentage: 0 })
    }
  }


  const calculateGrade = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return 'A+'
    else if (percentage >= 80) return 'A'
    else if (percentage >= 70) return 'B+'
    else if (percentage >= 60) return 'B'
    else if (percentage >= 50) return 'C+'
    else if (percentage >= 40) return 'C'
    else if (percentage >= 30) return 'D'
    else return 'F'
  }

  const handleScoreChange = (subject: string, type: 'classScore' | 'examScore', score: string) => {
    setGradeForm(prev => ({
      ...prev,
      subjectGrades: {
        ...prev.subjectGrades,
        [subject]: {
          ...prev.subjectGrades[subject] || { classScore: '', examScore: '', classGrade: '', examGrade: '' },
          [type]: score
        }
      }
    }))
  }

  const handleSaveGrade = async () => {
    if (!selectedStudent || !gradeForm.maxScore) {
      alert('Please fill in max score')
      return
    }

    // Check if class and exam max scores sum to main max score
    const classMaxScore = parseInt(gradeForm.classMaxScore) || 0
    const examMaxScore = parseInt(gradeForm.examMaxScore) || 0
    const mainMaxScore = parseInt(gradeForm.maxScore) || 0
    
    if (classMaxScore + examMaxScore !== mainMaxScore) {
      alert(`Class max score (${classMaxScore}) + Exam max score (${examMaxScore}) must equal Main max score (${mainMaxScore})`)
      return
    }

    // Check if at least one subject has a score (class or exam)
    const hasAnyScore = Object.values(gradeForm.subjectGrades).some(subject => 
      subject.classScore.trim() !== '' || subject.examScore.trim() !== ''
    )
    if (!hasAnyScore) {
      alert('Please enter at least one subject score (class or exam)')
      return
    }

    if (!currentPeriod) {
      alert('No academic period selected. Please select an academic period.')
      return
    }

    setIsSavingGrade(true)
    try {
      const maxScore = parseFloat(gradeForm.maxScore)
      const academicYear = currentPeriod.academicYear
      const term = currentPeriod.term

      // Ensure the academic period exists for grades
      await gradesUtils.ensureGradesAcademicPeriodExists(academicYear, term)

      const savedGrades: Grade[] = []

      // Create a grade entry for each subject that has at least one score
      for (const [subject, subjectData] of Object.entries(gradeForm.subjectGrades)) {
        const hasClassScore = subjectData.classScore.trim() !== ''
        const hasExamScore = subjectData.examScore.trim() !== ''
        
        if (hasClassScore || hasExamScore) {
          const classScore = parseFloat(subjectData.classScore) || 0
          const examScore = parseFloat(subjectData.examScore) || 0
          const classMaxScore = parseFloat(gradeForm.classMaxScore) || 30
          const examMaxScore = parseFloat(gradeForm.examMaxScore) || 70
          
          // Calculate total score
          // Sum of class and exam scores divided by total max score
          const totalRawScore = classScore + examScore
          const totalMaxScore = classMaxScore + examMaxScore
          const totalScore = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0
          const totalGrade = totalScore > 0 ? calculateGrade(totalScore, 100) : ''

          const gradeData = {
            studentId: selectedStudent.id,
            studentName: selectedStudent.fullName,
            subject: subject,
            assignment: '',
            classScore: classScore,
            sbaScore: classScore, // Also save as sbaScore for report compatibility
            examScore: examScore,
            totalScore: totalScore, // Also save as totalScore for report compatibility
            score: totalScore,
            maxScore: maxScore,
            grade: totalGrade,
            comments: gradeForm.comments,
            date: new Date().toISOString().split('T')[0],
            teacherId: teacher?.id || '',
            teacherName: teacher?.fullName || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Include academic period info for the createGrade function
            academicYear: academicYear,
            term: term,
            // Include max score settings
            classMaxScore: classMaxScore,
            examMaxScore: examMaxScore
          }

          // Save to Firebase
          const gradeId = await gradesUtils.createGrade(gradeData)
          
          const newGrade: Grade = {
            id: gradeId,
            ...gradeData
          }

          savedGrades.push(newGrade)
        }
      }

      // Update local state
      setGrades(prev => [...prev, ...savedGrades])
      
      // Don't reset the form - keep existing grades for editing
      setShowGradeModal(false)
      alert(`Grades saved successfully for ${savedGrades.length} subject(s)!`)
    } catch (error) {
      console.error('Error saving grades:', error)
      alert('Failed to save grades. Please try again.')
    } finally {
      setIsSavingGrade(false)
    }
  }

  const handleGenerateReports = async () => {
    if (!currentPeriod || !teacher) {
      alert('No active academic period or teacher information available.')
      return
    }

    // Get all students in the class for confirmation
    const classStudents = students.filter(student => 
      student.assignedClass === teacher.assignedClass
    )

    if (classStudents.length === 0) {
      alert('No students found in this class.')
      return
    }

    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to generate report cards for ${classStudents.length} student(s) in ${teacher.assignedClass}?\n\nThis will generate PDF reports for all students.`
    if (!confirm(confirmMessage)) {
      return
    }

    setIsGeneratingReports(true)
    try {
      console.log('Starting report generation...')

      // Calculate positions for all students in each subject
      console.log('Calculating student positions...')
      const studentPositions = await calculateStudentPositions(classStudents, currentPeriod)
      console.log('Student positions calculated:', studentPositions)

      // Generate reports for each student
      console.log(`Generating reports for ${classStudents.length} students...`)
      const reportPromises = classStudents.map(async (student, index) => {
        try {
          console.log(`[${index + 1}/${classStudents.length}] Processing ${student.fullName}...`)
          
          // Check if report already exists
          const fileName = `${student.fullName.replace(/\s+/g, '_')}_${currentPeriod.academicYear}_${currentPeriod.term}.pdf`
          const storagePath = `reports/${currentPeriod.academicYear}_${currentPeriod.term}/${teacher.assignedClass}/${fileName}`
          
          console.log(`[${index + 1}/${classStudents.length}] Checking if report exists for ${student.fullName}...`)
          const exists = await reportUtils.reportExists(
            currentPeriod.academicYear, 
            currentPeriod.term, 
            teacher.assignedClass, 
            student.fullName
          )
          console.log(`[${index + 1}/${classStudents.length}] Report exists: ${exists} for ${student.fullName}`)

          // Get student grades
          console.log(`[${index + 1}/${classStudents.length}] Fetching grades for ${student.fullName}...`)
          const studentGradesData = await gradesUtils.getStudentGrades(
            currentPeriod.academicYear,
            currentPeriod.term,
            student.id
          )

          // Check if student has grades
          if (!studentGradesData || !studentGradesData.grades) {
            console.log(`[${index + 1}/${classStudents.length}] No grades found for student ${student.fullName}`)
            return { 
              student: student.fullName, 
              success: false, 
              error: 'No grades found for this student'
            }
          }

          console.log(`[${index + 1}/${classStudents.length}] Grades found for ${student.fullName}:`, Object.keys(studentGradesData.grades))

          // Get positions for this student
          const studentPositionData = studentPositions[student.id] || {}

          // Generate report card HTML
          console.log(`[${index + 1}/${classStudents.length}] Generating HTML for ${student.fullName}...`)
          const reportHTML = generateReportCardHTML(student, studentGradesData, currentPeriod, teacher, studentPositionData)
          
          // Convert HTML to PDF
          console.log(`[${index + 1}/${classStudents.length}] Converting to PDF for ${student.fullName}...`)
          const pdfBlob = await reportUtils.generatePDFFromHTML(reportHTML)
          console.log(`[${index + 1}/${classStudents.length}] PDF generated for ${student.fullName}, size: ${(pdfBlob.size / 1024).toFixed(2)} KB`)
          
          // Upload to Firebase Storage (will replace existing file if it exists)
          console.log(`[${index + 1}/${classStudents.length}] Uploading report for ${student.fullName}...`)
          await reportUtils.uploadReport(pdfBlob, storagePath)
          console.log(`[${index + 1}/${classStudents.length}] ✅ Report uploaded successfully for ${student.fullName}`)
          
          return { 
            student: student.fullName, 
            success: true, 
            replaced: exists,
            action: exists ? 'replaced' : 'created'
          }
        } catch (error) {
          console.error(`[${index + 1}/${classStudents.length}] ❌ Error generating report for ${student.fullName}:`, error)
          return { 
            student: student.fullName, 
            success: false, 
            error: (error as Error).message || 'Unknown error'
          }
        }
      })

      console.log('Waiting for all reports to complete...')
      const results = await Promise.all(reportPromises)
      console.log('All reports completed:', results)
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const replaced = results.filter(r => r.success && r.replaced).length
      const created = results.filter(r => r.success && !r.replaced).length

      let message = `Report generation completed!\n\n`
      message += `✅ Successful: ${successful}\n`
      message += `❌ Failed: ${failed}\n`
      if (created > 0) {
        message += `📄 New reports: ${created}\n`
      }
      if (replaced > 0) {
        message += `🔄 Replaced existing: ${replaced}\n`
      }
      
      alert(message)
      
      if (failed > 0) {
        const failedStudents = results.filter(r => !r.success).map(r => r.student).join(', ')
        console.log('Failed students:', failedStudents)
      }
    } catch (error) {
      console.error('Error generating reports:', error)
      alert('Failed to generate reports. Please try again.')
    } finally {
      setIsGeneratingReports(false)
    }
  }

  const handleOpenBatchRecord = () => {
    // Reset selections
    setSelectedSubjectsForBatch([])
    setBatchGrades({})
    setShowBatchRecordModal(true)
  }

  const handleSubjectSelection = (subject: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSubjectsForBatch(prev => [...prev, subject])
      // Initialize grades for all students for this subject
      const newBatchGrades: Record<string, Record<string, { classScore: string; examScore: string }>> = {}
      students.forEach(student => {
        if (!newBatchGrades[student.id]) {
          newBatchGrades[student.id] = {}
        }
        newBatchGrades[student.id][subject] = { classScore: '', examScore: '' }
      })
      setBatchGrades(prev => ({ ...prev, ...newBatchGrades }))
    } else {
      setSelectedSubjectsForBatch(prev => prev.filter(s => s !== subject))
      // Remove this subject from batch grades
      const updatedBatchGrades = { ...batchGrades }
      students.forEach(student => {
        if (updatedBatchGrades[student.id]) {
          delete updatedBatchGrades[student.id][subject]
        }
      })
      setBatchGrades(updatedBatchGrades)
    }
  }

  const handleBatchGradeChange = (studentId: string, subject: string, type: 'classScore' | 'examScore', value: string) => {
    setBatchGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: {
          ...prev[studentId]?.[subject],
          [type]: value
        }
      }
    }))
  }

  const handleSaveBatchGrades = async () => {
    if (selectedSubjectsForBatch.length === 0) {
      alert('Please select at least one subject')
      return
    }

    // Validate that we're using the grade form's max scores
    if (!gradeForm.maxScore || !gradeForm.classMaxScore || !gradeForm.examMaxScore) {
      alert('Please set max scores in Score Details section first')
      return
    }

    // Check if class and exam max scores sum to main max score
    const classMaxScore = parseInt(gradeForm.classMaxScore) || 0
    const examMaxScore = parseInt(gradeForm.examMaxScore) || 0
    const mainMaxScore = parseInt(gradeForm.maxScore) || 0
    
    if (classMaxScore + examMaxScore !== mainMaxScore) {
      alert(`Class max score (${classMaxScore}) + Exam max score (${examMaxScore}) must equal Main max score (${mainMaxScore})`)
      return
    }

    if (!currentPeriod) {
      alert('No academic period selected. Please select an academic period.')
      return
    }

    setIsSavingBatch(true)
    try {
      const maxScore = parseFloat(gradeForm.maxScore)
      const academicYear = currentPeriod.academicYear
      const term = currentPeriod.term

      // Ensure the academic period exists for grades
      await gradesUtils.ensureGradesAcademicPeriodExists(academicYear, term)

      const savedGrades: Grade[] = []
      let totalSaved = 0

      // Save grades for each student and selected subject
      for (const student of students) {
        for (const subject of selectedSubjectsForBatch) {
          const gradeData = batchGrades[student.id]?.[subject]
          
          if (gradeData && (gradeData.classScore.trim() !== '' || gradeData.examScore.trim() !== '')) {
            const classScore = parseFloat(gradeData.classScore) || 0
            const examScore = parseFloat(gradeData.examScore) || 0
            
            // Calculate total score
            const totalRawScore = classScore + examScore
            const totalMaxScore = classMaxScore + examMaxScore
            const totalScore = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0
            const totalGrade = totalScore > 0 ? calculateGrade(totalScore, 100) : ''

            const gradeEntry = {
              studentId: student.id,
              studentName: student.fullName,
              subject: subject,
              assignment: '',
              classScore: classScore,
              sbaScore: classScore,
              examScore: examScore,
              totalScore: totalScore,
              score: totalScore,
              maxScore: maxScore,
              grade: totalGrade,
              comments: gradeForm.comments,
              date: new Date().toISOString().split('T')[0],
              teacherId: teacher?.id || '',
              teacherName: teacher?.fullName || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              academicYear: academicYear,
              term: term,
              classMaxScore: classMaxScore,
              examMaxScore: examMaxScore
            }

            // Save to Firebase
            const gradeId = await gradesUtils.createGrade(gradeEntry)
            
            const newGrade: Grade = {
              id: gradeId,
              ...gradeEntry
            }

            savedGrades.push(newGrade)
            totalSaved++
          }
        }
      }

      // Update local state
      setGrades(prev => [...prev, ...savedGrades])
      
      setShowBatchRecordModal(false)
      alert(`Batch grades saved successfully! ${totalSaved} grade(s) recorded.`)
      
      // Reset batch data
      setSelectedSubjectsForBatch([])
      setBatchGrades({})
    } catch (error) {
      console.error('Error saving batch grades:', error)
      alert('Failed to save batch grades. Please try again.')
    } finally {
      setIsSavingBatch(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your students...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Teacher Profile Found</h2>
          <p className="text-gray-600">Please contact the administrator to set up your teacher profile.</p>
        </div>
      </div>
    )
  }

  if (!teacher.assignedClass) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Class Assigned</h2>
          <p className="text-gray-600">You haven't been assigned to any class yet. Please contact the administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Grades Management</h1>
        </div>
        <div className="mt-2 sm:mt-0">
          <div className="flex flex-row items-center space-x-2">
            <button
              onClick={handleOpenBatchRecord}
              disabled={!currentPeriod}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span>Batch Record</span>
            </button>
            <button
              onClick={handleGenerateReports}
              disabled={!currentPeriod || isGeneratingReports}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingReports ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                  <span>Generating Reports...</span>
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span>Generate Reports</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadAllReports}
              disabled={!currentPeriod || isDownloadingReports}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingReports ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span>Download Reports</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-8 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {allClassSubjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Academic Period Display */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Academic Period</h3>
            {currentPeriod ? (
              <p className="text-xs sm:text-sm text-gray-600">
                Current: {currentPeriod.academicYear} - {currentPeriod.term}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-gray-600">No active academic period</p>
            )}
          </div>
        </div>
      </div>

      {/* Students List */}
      {!loading && (
        <div className="w-full">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No students are assigned to your class yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredStudents.map((student) => (
                <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-2">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                          {student.fullName}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${
                          student.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-2">
                      <button 
                        onClick={() => handleGradeStudent(student)}
                        className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Grade Student</span>
                        <span className="sm:hidden">Grade</span>
                      </button>
                      <button 
                        onClick={() => handleViewGrades(student)}
                        className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">View Report</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grade Modal */}
      {showGradeModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-2xl font-bold truncate">Add Grade - {selectedStudent.fullName}</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setShowGradeModal(false)}
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 relative">
              {/* Loading overlay */}
              {isSavingGrade && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Saving grades...</p>
                  </div>
                </div>
              )}
              {/* Max Score Setting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500" htmlFor="maxScore">Max Score *</label>
                  <input
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600 text-sm"
                    id="maxScore"
                    placeholder="e.g., 100"
                    type="number"
                    value={gradeForm.maxScore}
                    onChange={(e) => {
                      const mainMax = parseInt(e.target.value) || 100
                      const currentClassMax = parseInt(gradeForm.classMaxScore) || 30
                      const currentExamMax = parseInt(gradeForm.examMaxScore) || 70
                      const currentTotal = currentClassMax + currentExamMax
                      
                      // If current total doesn't match new main max, adjust proportionally
                      if (currentTotal !== mainMax && currentTotal > 0) {
                        const classRatio = currentClassMax / currentTotal
                        const newClassMax = Math.round(mainMax * classRatio)
                        const newExamMax = mainMax - newClassMax
                        
                        setGradeForm(prev => ({
                          ...prev, 
                          maxScore: e.target.value,
                          classMaxScore: newClassMax.toString(),
                          examMaxScore: newExamMax.toString()
                        }))
                      } else {
                        setGradeForm(prev => ({...prev, maxScore: e.target.value}))
                      }
                    }}
                  />
                </div>
              </div>

              {/* Score Max Settings */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <h4 className="text-xs sm:text-sm font-medium text-blue-900 mb-2 sm:mb-3">Maximum Scores for Each Component</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-blue-700" htmlFor="classMaxScore">Class Work Max Score *</label>
                    <input
                      className="mt-1 block w-full rounded-md border-blue-300 bg-white text-blue-900 focus:border-blue-600 focus:ring-blue-600 text-sm"
                      id="classMaxScore"
                      placeholder="e.g., 30"
                      type="number"
                      min="0"
                      value={gradeForm.classMaxScore}
                      onChange={(e) => {
                        const classMax = parseInt(e.target.value) || 0
                        const mainMax = parseInt(gradeForm.maxScore) || 100
                        const examMax = mainMax - classMax
                        setGradeForm(prev => ({
                          ...prev, 
                          classMaxScore: e.target.value,
                          examMaxScore: examMax.toString()
                        }))
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-blue-700" htmlFor="examMaxScore">Exam Max Score *</label>
                    <input
                      className="mt-1 block w-full rounded-md border-blue-300 bg-white text-blue-900 focus:border-blue-600 focus:ring-blue-600 text-sm"
                      id="examMaxScore"
                      placeholder="e.g., 70"
                      type="number"
                      min="0"
                      value={gradeForm.examMaxScore}
                      onChange={(e) => {
                        const examMax = parseInt(e.target.value) || 0
                        const mainMax = parseInt(gradeForm.maxScore) || 100
                        const classMax = mainMax - examMax
                        setGradeForm(prev => ({
                          ...prev, 
                          examMaxScore: e.target.value,
                          classMaxScore: classMax.toString()
                        }))
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Grades Table */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Enter Scores for Each Subject</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class Score (Max: {gradeForm.classMaxScore})
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Exam Score (Max: {gradeForm.examMaxScore})
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allClassSubjects.map((subject) => {
                        const subjectData = gradeForm.subjectGrades[subject] || { classScore: '', examScore: '', classGrade: '', examGrade: '' }
                        const classScore = parseFloat(subjectData.classScore) || 0
                        const examScore = parseFloat(subjectData.examScore) || 0
                        
                        // Calculate total score
                        // Sum of class and exam scores divided by main max score
                        const classMaxScore = parseFloat(gradeForm.classMaxScore) || 30
                        const examMaxScore = parseFloat(gradeForm.examMaxScore) || 70
                        const totalRawScore = classScore + examScore
                        const totalMaxScore = classMaxScore + examMaxScore
                        const totalScore = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0
                        const totalPercentage = totalScore.toFixed(1)
                        
                        return (
                          <tr key={subject} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                              {subject}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <input
                                type="number"
                                className="w-16 sm:w-20 px-2 sm:px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                placeholder="0"
                                value={subjectData.classScore}
                                onChange={(e) => handleScoreChange(subject, 'classScore', e.target.value)}
                                min="0"
                                max={gradeForm.classMaxScore || 30}
                              />
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <input
                                type="number"
                                className="w-16 sm:w-20 px-2 sm:px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                placeholder="0"
                                value={subjectData.examScore}
                                onChange={(e) => handleScoreChange(subject, 'examScore', e.target.value)}
                                min="0"
                                max={gradeForm.examMaxScore || 70}
                              />
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                totalScore >= 90 ? 'bg-green-100 text-green-800' :
                                totalScore >= 80 ? 'bg-blue-100 text-blue-800' :
                                totalScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                totalScore >= 60 ? 'bg-orange-100 text-orange-800' :
                                totalScore > 0 ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {totalScore > 0 ? calculateGrade(totalScore, 100) : '-'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {totalScore > 0 ? `${totalPercentage}%` : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  * Leave score blank for subjects not taken by this student
                </p>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-500" htmlFor="comments">General Comments</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 focus:border-blue-600 focus:ring-blue-600"
                  id="comments"
                  rows={3}
                  placeholder="Additional comments about the student's overall performance..."
                  value={gradeForm.comments}
                  onChange={(e) => setGradeForm(prev => ({...prev, comments: e.target.value}))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-4 p-4 sm:p-6 border-t border-gray-200">
              <button 
                className="px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-blue-50 w-full sm:w-auto"
                onClick={() => setShowGradeModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 w-full sm:w-auto"
                onClick={handleSaveGrade}
                disabled={isSavingGrade}
              >
                {isSavingGrade ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Grade</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Grades Modal */}
      {showGradesModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Grades - {selectedStudent.fullName}</h2>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowGradesModal(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6">
              {grades.filter(grade => grade.studentId === selectedStudent.id).length === 0 ? (
                <div className="text-center py-12">
                  <Award className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No grades recorded</h3>
                  <p className="mt-1 text-sm text-gray-500">This student doesn't have any grades yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group grades by assignment */}
                  {(() => {
                    const studentGrades = grades.filter(grade => grade.studentId === selectedStudent.id)
                    const groupedByAssignment = studentGrades.reduce((acc, grade) => {
                      if (!acc[grade.assignment]) {
                        acc[grade.assignment] = []
                      }
                      acc[grade.assignment].push(grade)
                      return acc
                    }, {} as Record<string, Grade[]>)

                    return Object.entries(groupedByAssignment).map(([assignment, assignmentGrades]) => (
                      <div key={assignment} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900">{assignment}</h3>
                          <p className="text-sm text-gray-500">
                            {assignmentGrades[0].date} • Max Score: {assignmentGrades[0].maxScore}
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Subject
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Score
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Grade
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Percentage
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {assignmentGrades.map((grade) => (
                                <tr key={grade.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {grade.subject}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {grade.score}/{grade.maxScore}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      grade.grade === 'A+' || grade.grade === 'A' ? 'bg-green-100 text-green-800' :
                                      grade.grade === 'B+' || grade.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                      grade.grade === 'C+' || grade.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                      grade.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                      grade.grade === 'F' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-500'
                                    }`}>
                                      {grade.grade}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {((grade.score / grade.maxScore) * 100).toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {assignmentGrades[0].comments && (
                          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Comments:</span> {assignmentGrades[0].comments}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report View Modal */}
      {showReportModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold">Report Card - {selectedStudent.fullName}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentPeriod?.academicYear} - {currentPeriod?.term}
                </p>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={() => {
                  setShowReportModal(false)
                  setReportUrl(null)
                }}
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {isLoadingReport ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading report...</p>
                  </div>
                </div>
              ) : reportUrl ? (
                <div className="space-y-4">
                  {/* PDF Viewer */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100" style={{ minHeight: '600px' }}>
                    <iframe
                      src={reportUrl}
                      className="w-full h-full"
                      style={{ minHeight: '600px' }}
                      title="Report Card PDF"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Report Not Available</h3>
                  <p className="text-gray-500">Unable to load the report. Please try again.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {reportUrl && (
              <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowReportModal(false)
                    setReportUrl(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
                <button
                  onClick={() => handleViewReport(reportUrl)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </button>
                <button
                  onClick={() => {
                    if (!currentPeriod || !teacher || !selectedStudent) return
                    const fileName = `${selectedStudent.fullName.replace(/\s+/g, '_')}_${currentPeriod.academicYear}_${currentPeriod.term}.pdf`
                    const storagePath = `reports/${currentPeriod.academicYear}_${currentPeriod.term}/${teacher.assignedClass}/${fileName}`
                    handleDownloadReport(storagePath, selectedStudent.fullName)
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {showDownloadProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Downloading Reports</h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                <div 
                  className="bg-purple-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${downloadProgress.percentage}%` }}
                >
                  {downloadProgress.percentage > 10 && (
                    <span className="text-xs font-medium text-white">
                      {downloadProgress.percentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Text */}
              <div className="text-sm text-gray-600 mb-2">
                {downloadProgress.percentage < 50 ? (
                  <span>Checking reports... ({downloadProgress.current}/{downloadProgress.total} students)</span>
                ) : (
                  <span>Downloading reports... ({downloadProgress.current}/{downloadProgress.total} reports)</span>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Please wait while reports are being downloaded. Do not close this window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Batch Record Modal */}
      {showBatchRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-2xl font-bold">Batch Record Grades</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setShowBatchRecordModal(false)}
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" x2="6" y1="6" y2="18"></line>
                  <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Loading overlay */}
              {isSavingBatch && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Saving batch grades...</p>
                  </div>
                </div>
              )}

              {/* Step 1: Subject Selection */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-medium text-green-900 mb-3">Step 1: Select Subjects</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {allClassSubjects.map((subject) => (
                    <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubjectsForBatch.includes(subject)}
                        onChange={(e) => handleSubjectSelection(subject, e.target.checked)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{subject}</span>
                    </label>
                  ))}
                </div>
                {selectedSubjectsForBatch.length > 0 && (
                  <p className="mt-3 text-sm text-green-700 font-medium">
                    Selected: {selectedSubjectsForBatch.length} subject(s)
                  </p>
                )}
              </div>

              {/* Step 2: Score Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-medium text-blue-900 mb-3">Step 2: Score Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-1">Max Score *</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="100"
                      value={gradeForm.maxScore}
                      onChange={(e) => {
                        const mainMax = parseInt(e.target.value) || 100
                        const currentClassMax = parseInt(gradeForm.classMaxScore) || 30
                        const currentExamMax = parseInt(gradeForm.examMaxScore) || 70
                        const currentTotal = currentClassMax + currentExamMax
                        
                        if (currentTotal !== mainMax && currentTotal > 0) {
                          const classRatio = currentClassMax / currentTotal
                          const newClassMax = Math.round(mainMax * classRatio)
                          const newExamMax = mainMax - newClassMax
                          
                          setGradeForm(prev => ({
                            ...prev,
                            maxScore: e.target.value,
                            classMaxScore: newClassMax.toString(),
                            examMaxScore: newExamMax.toString()
                          }))
                        } else {
                          setGradeForm(prev => ({...prev, maxScore: e.target.value}))
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-1">Class Max / Exam Max *</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-full px-2 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="30"
                        value={gradeForm.classMaxScore}
                        onChange={(e) => {
                          const classMax = parseInt(e.target.value) || 0
                          const mainMax = parseInt(gradeForm.maxScore) || 100
                          const examMax = mainMax - classMax
                          setGradeForm(prev => ({
                            ...prev,
                            classMaxScore: e.target.value,
                            examMaxScore: examMax.toString()
                          }))
                        }}
                      />
                      <span className="self-center text-gray-600">/</span>
                      <input
                        type="number"
                        className="w-full px-2 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="70"
                        value={gradeForm.examMaxScore}
                        onChange={(e) => {
                          const examMax = parseInt(e.target.value) || 0
                          const mainMax = parseInt(gradeForm.maxScore) || 100
                          const classMax = mainMax - examMax
                          setGradeForm(prev => ({
                            ...prev,
                            examMaxScore: e.target.value,
                            classMaxScore: classMax.toString()
                          }))
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Record Grades */}
              {selectedSubjectsForBatch.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Step 3: Record Grades</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                            Student
                          </th>
                          {selectedSubjectsForBatch.map((subject) => (
                            <React.Fragment key={subject}>
                              <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                                {subject}<br />
                                <span className="text-xs text-gray-400">Class</span>
                              </th>
                              <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                                <span className="text-xs text-gray-400">Exam</span>
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                              {student.fullName}
                            </td>
                            {selectedSubjectsForBatch.map((subject) => (
                              <React.Fragment key={subject}>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap border-l border-gray-200">
                                  <input
                                    type="number"
                                    className="w-14 sm:w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-xs"
                                    placeholder="0"
                                    min="0"
                                    max={gradeForm.classMaxScore}
                                    value={batchGrades[student.id]?.[subject]?.classScore || ''}
                                    onChange={(e) => handleBatchGradeChange(student.id, subject, 'classScore', e.target.value)}
                                  />
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap border-l border-gray-200">
                                  <input
                                    type="number"
                                    className="w-14 sm:w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-xs"
                                    placeholder="0"
                                    min="0"
                                    max={gradeForm.examMaxScore}
                                    value={batchGrades[student.id]?.[subject]?.examScore || ''}
                                    onChange={(e) => handleBatchGradeChange(student.id, subject, 'examScore', e.target.value)}
                                  />
                                </td>
                              </React.Fragment>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-4 p-4 sm:p-6 border-t border-gray-200">
              <button 
                className="px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-300 hover:bg-gray-100 w-full sm:w-auto"
                onClick={() => setShowBatchRecordModal(false)}
                disabled={isSavingBatch}
              >
                Cancel
              </button>
              <button 
                className="px-4 sm:px-6 py-2 rounded-md text-xs sm:text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 w-full sm:w-auto"
                onClick={handleSaveBatchGrades}
                disabled={isSavingBatch || selectedSubjectsForBatch.length === 0}
              >
                {isSavingBatch ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <ClipboardList className="h-4 w-4" />
                    <span>Save Batch Grades</span>
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

export default Grades
