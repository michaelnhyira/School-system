import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { feesUtils } from '../utils/firebaseUtils'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'

interface AcademicPeriod {
  academicYear: string
  term: string
  isActive: boolean
  updatedAt: string
}

interface AcademicPeriodContextType {
  currentPeriod: AcademicPeriod | null
  allPeriods: AcademicPeriod[]
  loading: boolean
  error: string | null
  setCurrentPeriod: (academicYear: string, term: string) => Promise<void>
  refreshPeriods: () => Promise<void>
}

const AcademicPeriodContext = createContext<AcademicPeriodContextType | undefined>(undefined)

interface AcademicPeriodProviderProps {
  children: ReactNode
}

export const AcademicPeriodProvider = ({ children }: AcademicPeriodProviderProps) => {
  const [currentPeriod, setCurrentPeriodState] = useState<AcademicPeriod | null>(null)
  const [allPeriods, setAllPeriods] = useState<AcademicPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPeriods = async (retryCount = 0): Promise<void> => {
    const maxRetries = 5
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff, max 10s
    
    try {
      setLoading(true)
      setError(null)
      
      const [systemActive, all] = await Promise.all([
        feesUtils.getSystemActivePeriod(),
        feesUtils.getAllAcademicPeriods()
      ])
      
      // Convert system active period to the expected format
      const current = systemActive ? {
        academicYear: systemActive.academicYear,
        term: systemActive.term,
        isActive: systemActive.isActive,
        updatedAt: systemActive.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } : null
      
      setCurrentPeriodState(current)
      setAllPeriods(all)
      setLoading(false)
    } catch (err) {
      console.error(`Error refreshing academic periods (attempt ${retryCount + 1}/${maxRetries + 1}):`, err)
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        console.log(`Retrying period load in ${retryDelay}ms...`)
        setTimeout(() => {
          refreshPeriods(retryCount + 1)
        }, retryDelay)
        return
      }
      
      // If all retries failed, set error but keep trying in background
      setError('Failed to load academic periods')
      setCurrentPeriodState(null)
      setAllPeriods([])
      setLoading(false)
      
      // Continue retrying in background every 30 seconds until successful
      setTimeout(() => {
        console.log('Retrying period load in background...')
        refreshPeriods(0)
      }, 30000)
    }
  }

  const setCurrentPeriod = async (academicYear: string, term: string) => {
    try {
      setError(null)
      await feesUtils.setActiveAcademicPeriod(academicYear, term)
      await refreshPeriods()
    } catch (err) {
      console.error('Error setting current academic period:', err)
      setError('Failed to set academic period')
      throw err
    }
  }

  useEffect(() => {
    // Wrap in try-catch to prevent initialization errors
    try {
      refreshPeriods()
    } catch (error) {
      console.error('Error initializing academic period context:', error)
      setLoading(false)
      setError('Failed to initialize academic periods')
    }
  }, [])

  // Refresh periods when user logs in - with retry logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User logged in, wait a bit for auth to fully complete, then refresh periods
        console.log('User logged in, refreshing academic periods...')
        // Small delay to ensure auth state is fully settled
        await new Promise(resolve => setTimeout(resolve, 100))
        refreshPeriods(0).catch(err => {
          console.error('Failed to refresh periods after login:', err)
          // Continue retrying
          setTimeout(() => refreshPeriods(0), 2000)
        })
      }
    })

    return unsubscribe
  }, [])

  const value: AcademicPeriodContextType = {
    currentPeriod,
    allPeriods,
    loading,
    error,
    setCurrentPeriod,
    refreshPeriods
  }

  return (
    <AcademicPeriodContext.Provider value={value}>
      {children}
    </AcademicPeriodContext.Provider>
  )
}

export const useAcademicPeriod = () => {
  const context = useContext(AcademicPeriodContext)
  if (context === undefined) {
    throw new Error('useAcademicPeriod must be used within an AcademicPeriodProvider')
  }
  return context
}
