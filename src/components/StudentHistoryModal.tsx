import React, { useState, useEffect } from 'react';
import { X, Users, DollarSign, Calendar, CheckCircle, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { feesUtils, attendanceUtils } from '../utils/firebaseUtils';
import { useAcademicPeriod } from '../contexts/AcademicPeriodContext';

interface Student {
  id: string;
  name: string;
  fullName?: string;
  class?: string;
  assignedClass?: string;
  admissionNumber?: string;
  photoUrl?: string;
}

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

interface PaymentHistory {
  id: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  academicYear: string;
  term: string;
  description?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
  remarks?: string;
  recordedBy: string;
  createdAt: string;
}

const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  const { currentPeriod } = useAcademicPeriod();
  const [activeTab, setActiveTab] = useState<'financial' | 'attendance'>('financial');
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalPaid: 0,
    totalDue: 0,
    balance: 0,
    paymentCount: 0
  });
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    if (isOpen && student) {
      loadStudentHistory();
    }
  }, [isOpen, student]);

  const loadStudentHistory = async () => {
    if (!student || !currentPeriod) return;

    setLoading(true);
    try {
      // Load financial history
      await loadFinancialHistory();
      
      // Load attendance history
      await loadAttendanceHistory();
    } catch (error) {
      console.error('Error loading student history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialHistory = async () => {
    if (!student || !currentPeriod) return;

    try {
      // Get payment history for the current period
      const payments = await feesUtils.getStudentPaymentsForPeriod(
        student.id,
        currentPeriod.academicYear,
        currentPeriod.term
      );

      const paymentHistoryData: PaymentHistory[] = payments.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount || 0,
        paymentMethod: payment.paymentMethod || 'unknown',
        createdAt: payment.createdAt || new Date().toISOString(),
        academicYear: payment.academicYear || currentPeriod.academicYear,
        term: payment.term || currentPeriod.term,
        description: payment.description
      }));

      setPaymentHistory(paymentHistoryData);

      // Calculate financial summary
      const totalPaid = paymentHistoryData.reduce((sum, payment) => sum + payment.amount, 0);
      const totalDue = 1000; // This should come from fees structure - placeholder for now
      const balance = totalDue - totalPaid;

      setFinancialSummary({
        totalPaid,
        totalDue,
        balance,
        paymentCount: paymentHistoryData.length
      });
    } catch (error) {
      console.error('Error loading financial history:', error);
    }
  };

  const loadAttendanceHistory = async () => {
    if (!student || !currentPeriod) return;

    try {
      console.log('Loading attendance for student:', student.id);
      console.log('Current period:', currentPeriod);
      
      // Get attendance records for the current period
      const attendanceRecords = await attendanceUtils.getStudentAttendance(
        currentPeriod.academicYear,
        currentPeriod.term,
        student.id
      );

      console.log('Raw attendance records from database:', attendanceRecords);

      const attendanceData: AttendanceRecord[] = attendanceRecords.map((record: any) => ({
        id: record.id,
        date: record.date || new Date().toISOString(),
        status: (record.status as 'present' | 'absent' | 'excused') || 'absent',
        remarks: record.remarks,
        recordedBy: record.recordedBy || 'Unknown',
        createdAt: record.createdAt || new Date().toISOString()
      }));

      console.log('Processed attendance data:', attendanceData);
      setAttendanceHistory(attendanceData);

      // Calculate attendance summary
      const totalDays = attendanceData.length;
      const presentDays = attendanceData.filter(record => record.status === 'present').length;
      const absentDays = attendanceData.filter(record => record.status === 'absent').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      setAttendanceSummary({
        totalDays,
        presentDays,
        absentDays,
        attendanceRate
      });
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'momo':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'bank_transfer':
        return <TrendingDown className="h-4 w-4 text-purple-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Student History
              </h3>
              <p className="text-sm text-gray-500">
                {student.name} - {student.class || 'No Class Assigned'}
              </p>
              <p className="text-xs text-gray-400">
                {currentPeriod?.academicYear} - {currentPeriod?.term}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('financial')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'financial'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Financial History</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Attendance History</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading history...</span>
            </div>
          ) : (
            <>
              {/* Financial History Tab */}
              {activeTab === 'financial' && (
                <div className="space-y-6">
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-600">Total Paid</p>
                          <p className="text-2xl font-bold text-green-900">
                            ₵{financialSummary.totalPaid.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Total Due</p>
                          <p className="text-2xl font-bold text-blue-900">
                            ₵{financialSummary.totalDue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-lg p-4 ${
                      financialSummary.balance >= 0 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center">
                        <TrendingDown className={`h-8 w-8 ${
                          financialSummary.balance >= 0 ? 'text-red-600' : 'text-green-600'
                        }`} />
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            financialSummary.balance >= 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            Balance
                          </p>
                          <p className={`text-2xl font-bold ${
                            financialSummary.balance >= 0 ? 'text-red-900' : 'text-green-900'
                          }`}>
                            ₵{Math.abs(financialSummary.balance).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Calendar className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-purple-600">Payments</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {financialSummary.paymentCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                      <p className="text-gray-500">
                        {student.name} has not made any payments for this period.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-gray-900">Payment Records</h4>
                      {paymentHistory.map((payment, index) => (
                        <div key={payment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-green-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getPaymentMethodIcon(payment.paymentMethod)}
                                <div>
                                  <div className="font-medium text-gray-900">
                                    ₵{payment.amount.toLocaleString()}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">
                                {new Date(payment.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(payment.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attendance History Tab */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  {/* Attendance Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-600">Present</p>
                          <p className="text-2xl font-bold text-green-900">
                            {attendanceSummary.presentDays}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-600">Absent</p>
                          <p className="text-2xl font-bold text-red-900">
                            {attendanceSummary.absentDays}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Rate</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {attendanceSummary.attendanceRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Records */}
                  {attendanceHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
                      <p className="text-gray-500">
                        No attendance records found for {student.name} in this period.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-gray-900">Attendance Records</h4>
                      <div className="space-y-2">
                        {attendanceHistory.map((record, index) => (
                          <div key={record.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {index + 1}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(record.status)}
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {new Date(record.date).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {record.recordedBy}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                  {record.status.toUpperCase()}
                                </span>
                                {record.remarks && (
                                  <div className="text-xs text-gray-400 mt-1 max-w-32 truncate">
                                    {record.remarks}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentHistoryModal;
