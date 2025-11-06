import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AcademicPeriodProvider } from './contexts/AcademicPeriodContext'
import { GradesAcademicPeriodProvider } from './contexts/GradesAcademicPeriodContext'
import { SMSPointsProvider } from './contexts/SMSPointsContext'
import { SMSPricingProvider } from './contexts/SMSPricingContext'
import { PaymentLockProvider } from './contexts/PaymentLockContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import PaymentNoticeModal from './components/PaymentNoticeModal'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Classes from './pages/Classes'
import Subjects from './pages/Subjects'
import Messaging from './pages/Messaging'
import Fees from './pages/Fees'
import Functions from './pages/Functions'
import Settings from './pages/Settings'
import MyStudents from './pages/MyStudents'
import Grades from './pages/Grades'
import Attendance from './pages/Attendance'
import Promote from './pages/Promote'
import PromoteAll from './pages/PromoteAll'
import SMSAdmin from './pages/SMSAdmin'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PaymentLockProvider>
          <AcademicPeriodProvider>
              <GradesAcademicPeriodProvider>
                <SMSPointsProvider>
                  <SMSPricingProvider>
                    <Router>
                      <ProtectedRoute>
                        <Layout>
                          <PaymentNoticeModal />
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/students" element={<Students />} />
                            <Route path="/teachers" element={<Teachers />} />
                            <Route path="/classes" element={<Classes />} />
                            <Route path="/subjects" element={<Subjects />} />
                            <Route path="/messaging" element={<Messaging />} />
                            <Route path="/fees" element={<Fees />} />
                            <Route path="/functions" element={<Functions />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/my-students" element={<MyStudents />} />
                            <Route path="/grades" element={<Grades />} />
                            <Route path="/attendance" element={<Attendance />} />
                            <Route path="/promote" element={<Promote />} />
                            <Route path="/promote-all" element={<PromoteAll />} />
                            <Route path="/sms-admin" element={<SMSAdmin />} />
                          </Routes>
                        </Layout>
                      </ProtectedRoute>
                    </Router>
                  </SMSPricingProvider>
                </SMSPointsProvider>
              </GradesAcademicPeriodProvider>
            </AcademicPeriodProvider>
        </PaymentLockProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
