import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { gradesUtils } from '../utils/firebaseUtils';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

interface GradesAcademicPeriod {
  id: string;
  academicYear: string;
  term: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalGrades: number;
  totalStudents: number;
  averageScore: number;
}

interface GradesAcademicPeriodContextType {
  currentPeriod: GradesAcademicPeriod | null;
  allPeriods: GradesAcademicPeriod[];
  loading: boolean;
  error: string | null;
  setCurrentPeriod: (academicYear: string, term: string) => Promise<void>;
  refreshPeriods: () => Promise<void>;
}

const GradesAcademicPeriodContext = createContext<GradesAcademicPeriodContextType | undefined>(undefined);

export const useGradesAcademicPeriod = () => {
  const context = useContext(GradesAcademicPeriodContext);
  if (context === undefined) {
    throw new Error('useGradesAcademicPeriod must be used within a GradesAcademicPeriodProvider');
  }
  return context;
};

interface GradesAcademicPeriodProviderProps {
  children: ReactNode;
}

export const GradesAcademicPeriodProvider: React.FC<GradesAcademicPeriodProviderProps> = ({ children }) => {
  const [currentPeriod, setCurrentPeriodState] = useState<GradesAcademicPeriod | null>(null);
  const [allPeriods, setAllPeriods] = useState<GradesAcademicPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('GradesAcademicPeriodProvider rendering, currentPeriod:', currentPeriod, 'loading:', loading);

  const refreshPeriods = async (retryCount = 0): Promise<void> => {
    const maxRetries = 5
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff, max 10s
    
    try {
      console.log('GradesAcademicPeriodContext - refreshPeriods called');
      setLoading(true);
      setError(null);
      
      const periods = await gradesUtils.getAllGradesAcademicPeriods();
      console.log('GradesAcademicPeriodContext - fetched periods:', periods);
      setAllPeriods(periods as GradesAcademicPeriod[]);
      
      // Load user's selected period from their user document
      // This will be handled by the calling component with user context
      // For now, set to null - will be updated by the calling component
      setCurrentPeriodState(null);
      
      console.log('GradesAcademicPeriodContext - state updated');
      setLoading(false);
    } catch (err) {
      console.error(`Error refreshing grades academic periods (attempt ${retryCount + 1}/${maxRetries + 1}):`, err);
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        console.log(`Retrying grades period load in ${retryDelay}ms...`);
        setTimeout(() => {
          refreshPeriods(retryCount + 1);
        }, retryDelay);
        return;
      }
      
      // If all retries failed, set error but keep trying in background
      setError(err instanceof Error ? err.message : 'Failed to load academic periods');
      setCurrentPeriodState(null);
      setAllPeriods([]);
      setLoading(false);
      
      // Continue retrying in background every 30 seconds until successful
      setTimeout(() => {
        console.log('Retrying grades period load in background...');
        refreshPeriods(0);
      }, 30000);
    }
  };

  const setCurrentPeriod = async (academicYear: string, term: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find the period
      const period = allPeriods.find(p => 
        p.academicYear === academicYear && p.term === term
      );
      
      if (!period) {
        throw new Error('Academic period not found');
      }
      
      // Update local state
      setCurrentPeriodState(period);
      
      // Store user's selected period in their user document
      // This will be handled by the calling component with user context
      
    } catch (err) {
      console.error('Error setting current period:', err);
      setError(err instanceof Error ? err.message : 'Failed to set academic period');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPeriods();
  }, []);

  // Refresh periods when user logs in - with retry logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User logged in, wait a bit for auth to fully complete, then refresh periods
        console.log('User logged in, refreshing grades academic periods...');
        // Small delay to ensure auth state is fully settled
        await new Promise(resolve => setTimeout(resolve, 100));
        refreshPeriods(0).catch(err => {
          console.error('Failed to refresh grades periods after login:', err);
          // Continue retrying
          setTimeout(() => refreshPeriods(0), 2000);
        });
      }
    });

    return unsubscribe;
  }, []);

  const value: GradesAcademicPeriodContextType = {
    currentPeriod,
    allPeriods,
    loading,
    error,
    setCurrentPeriod,
    refreshPeriods
  };

  return (
    <GradesAcademicPeriodContext.Provider value={value}>
      {children}
    </GradesAcademicPeriodContext.Provider>
  );
};

export default GradesAcademicPeriodProvider;
