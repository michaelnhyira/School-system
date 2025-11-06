import React, { useState, useRef } from 'react';
import { reportUtils } from '../utils/firebaseUtils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Student {
  id: string;
  name: string;
  className: string;
  academicYear: string;
  term: string;
  photoUrl?: string;
}

interface Grade {
  subject: string;
  sbaScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  position: number;
  remarks: string;
}

interface ReportCardData {
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

interface ReportCardGeneratorProps {
  reportData: ReportCardData;
  onGenerate: (downloadURL: string) => void;
  onClose: () => void;
}

const ReportCardGenerator: React.FC<ReportCardGeneratorProps> = ({
  reportData,
  onGenerate,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Ghanaian Primary School Subjects
  const ghanaianSubjects = [
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

  // English sub-subjects
  const englishSubSubjects = [
    'a) LISTENING AND SPEAKING',
    'b) READING COMPREHENSION',
    'c) GRAMMAR',
    'd) WRITING / COMPREHENSION'
  ];

  const generatePDF = async () => {
    if (!reportRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 3, // Increased from 2 to 3 for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1200, // Increased from 800 for better resolution
        height: 1800, // Increased proportionally
        logging: false,
        windowWidth: 1200, // Match canvas width
        windowHeight: 1800 // Match canvas height
      });

      // Use JPEG format with high quality for optimal size/quality balance
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable compression for smaller file size
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `${reportData.student.name.replace(/\s+/g, '_')}_${reportData.student.academicYear}_${reportData.student.term}.pdf`;
      const filePath = `reports/${reportData.student.academicYear}_${reportData.student.term}/${reportData.student.className}/${fileName}`;
      
      const downloadURL = await reportUtils.uploadReport(pdfBlob, filePath);
      onGenerate(downloadURL);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

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

  const getPositionColor = (position: number) => {
    if (position <= 3) return 'text-green-600 font-bold';
    if (position <= 10) return 'text-blue-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Generate Report Card</h2>
          <div className="flex space-x-3">
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="p-6">
          <div ref={reportRef} className="bg-white p-8 shadow-lg" style={{ width: '800px', minHeight: '1200px' }}>
            {/* Header with Logo and School Info */}
            <div className="flex items-center justify-between mb-8 border-b-2 border-purple-600 pb-4">
              <div className="flex items-center space-x-4">
                {/* Church Logo Placeholder */}
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-purple-600">The Hopeway Revival Church</h1>
                  <p className="text-lg text-purple-500 italic">the supernatural Church</p>
                  <p className="text-sm text-gray-600">Primary School Division</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">REPORT CARD</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-semibold">Academic Year:</span> {reportData.student.academicYear}</p>
                  <p><span className="font-semibold">Term:</span> {reportData.student.term}</p>
                  <p><span className="font-semibold">Date:</span> {reportData.reportDate}</p>
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {reportData.student.photoUrl && (
                    <img
                      src={reportData.student.photoUrl}
                      alt="Student Photo"
                      className="w-20 h-20 rounded-full object-cover border-2 border-purple-200"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{reportData.student.name}</h3>
                    <p className="text-gray-600">Class: {reportData.student.className}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">Next Term Begins:</span>
                  <span className="border-b border-gray-300 w-32 text-center">{reportData.nextTermBegins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Attendance:</span>
                  <span>{reportData.attendance.present}/{reportData.attendance.total} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Attendance Rate:</span>
                  <span className="font-bold text-green-600">
                    {Math.round((reportData.attendance.present / reportData.attendance.total) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Grades Table */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">ACADEMIC PERFORMANCE</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="border border-gray-400 px-2 py-2 text-left text-sm font-bold">SUBJECT</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">SBA SCORE (50)</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">EXAMS SCORE (50)</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">TOTAL SCORE (100)</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">GRADE</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">POSITION</th>
                      <th className="border border-gray-400 px-2 py-2 text-left text-sm font-bold">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghanaianSubjects.map((subject, index) => {
                      const grade = reportData.grades.find(g => g.subject === subject);
                      return (
                        <React.Fragment key={subject}>
                          <tr className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="border border-gray-400 px-2 py-2 text-sm font-semibold">
                              {subject}
                            </td>
                            <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                              {grade?.sbaScore || '--'}
                            </td>
                            <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                              {grade?.examScore || '--'}
                            </td>
                            <td className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">
                              {grade?.totalScore || '--'}
                            </td>
                            <td className={`border border-gray-400 px-2 py-2 text-center text-sm ${getGradeColor(grade?.grade || '')}`}>
                              {grade?.grade || '--'}
                            </td>
                            <td className={`border border-gray-400 px-2 py-2 text-center text-sm ${getPositionColor(grade?.position || 0)}`}>
                              {grade?.position || '--'}
                            </td>
                            <td className="border border-gray-400 px-2 py-2 text-sm text-xs">
                              {grade?.remarks || 'No remarks'}
                            </td>
                          </tr>
                          {subject === 'ENGLISH' && (
                            <>
                              {englishSubSubjects.map((subSubject) => (
                                <tr key={subSubject} className="bg-gray-25">
                                  <td className="border border-gray-400 px-2 py-1 text-xs pl-6 text-gray-600">
                                    {subSubject}
                                  </td>
                                  <td className="border border-gray-400 px-2 py-1 text-center text-xs">--</td>
                                  <td className="border border-gray-400 px-2 py-1 text-center text-xs">--</td>
                                  <td className="border border-gray-400 px-2 py-1 text-center text-xs">--</td>
                                  <td className="border border-gray-400 px-2 py-1 text-center text-xs">--</td>
                                  <td className="border border-gray-400 px-2 py-1 text-center text-xs">--</td>
                                  <td className="border border-gray-400 px-2 py-1 text-xs">--</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance Section */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">ATTENDANCE RECORD</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Days Present:</span>
                  <span className="text-lg font-bold text-green-600">{reportData.attendance.present}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Days Absent:</span>
                  <span className="text-lg font-bold text-red-600">{reportData.attendance.absent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total School Days:</span>
                  <span className="text-lg font-bold text-gray-600">{reportData.attendance.total}</span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">TEACHER'S COMMENTS</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class Teacher's Remarks:</label>
                  <div className="border border-gray-300 rounded-lg p-3 min-h-[60px] bg-gray-50">
                    {reportData.teacherComments || 'No comments provided.'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Head Teacher's Remarks:</label>
                  <div className="border border-gray-300 rounded-lg p-3 min-h-[60px] bg-gray-50">
                    {reportData.headTeacherComments || 'No comments provided.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-purple-600 pt-4">
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="border-b border-gray-400 w-32 mx-auto mb-2"></div>
                  <p className="text-sm font-semibold">Class Teacher</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 w-32 mx-auto mb-2"></div>
                  <p className="text-sm font-semibold">Head Teacher</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 w-32 mx-auto mb-2"></div>
                  <p className="text-sm font-semibold">Date</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  This report card is issued by The Hopeway Revival Church Primary School
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  For any queries, please contact the school administration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCardGenerator;
