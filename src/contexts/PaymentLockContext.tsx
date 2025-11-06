import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

interface PaymentLockData {
  isNoticeActive: boolean; // Dismissible notice
  isLockActive: boolean; // Non-dismissible lock
  noticeActivatedAt: Timestamp | null;
  lockActivatedAt: Timestamp | null;
  activatedBy: string;
  message?: string;
  updatedAt: Timestamp;
}

interface PaymentLockDismissedData {
  dismissedAt: Timestamp;
  lockActivatedAt: Timestamp;
}

interface PaymentLockContextType {
  lockData: PaymentLockData | null;
  loading: boolean;
  error: string | null;
  isNoticeActive: () => boolean;
  isLockActive: () => boolean;
  shouldShowModal: () => boolean;
  canDismiss: () => boolean;
  getRemainingDays: () => number;
  dismissNotice: () => Promise<void>;
  hasUserDismissed: () => boolean;
  refreshLockStatus: () => Promise<void>;
}

const PaymentLockContext = createContext<PaymentLockContextType>({} as PaymentLockContextType);

export const usePaymentLock = () => {
  return useContext(PaymentLockContext);
};

interface PaymentLockProviderProps {
  children: React.ReactNode;
}

export const PaymentLockProvider: React.FC<PaymentLockProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [lockData, setLockData] = useState<PaymentLockData | null>(null);
  const [userDismissal, setUserDismissal] = useState<PaymentLockDismissedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is super admin (bypasses all restrictions)
  const isSuperAdmin = currentUser?.email === 'michaelnhyira77@gmail.com';

  // Initialize payment lock if it doesn't exist
  const initializePaymentLock = async () => {
    try {
      const lockRef = doc(db, 'system', 'paymentLock');
      const lockSnap = await getDoc(lockRef);
      
      if (!lockSnap.exists()) {
        const initialData: PaymentLockData = {
          isNoticeActive: false,
          isLockActive: false,
          noticeActivatedAt: null,
          lockActivatedAt: null,
          activatedBy: '',
          message: '',
          updatedAt: Timestamp.now()
        };
        
        await setDoc(lockRef, initialData);
        setLockData(initialData);
      } else {
        const data = lockSnap.data() as PaymentLockData;
        // Handle migration from old format
        if ('isActive' in data && !('isNoticeActive' in data)) {
          const migratedData: PaymentLockData = {
            isNoticeActive: (data as any).isActive || false,
            isLockActive: false,
            noticeActivatedAt: (data as any).activatedAt || null,
            lockActivatedAt: null,
            activatedBy: (data as any).activatedBy || '',
            message: (data as any).message || '',
            updatedAt: (data as any).updatedAt || Timestamp.now()
          };
          setLockData(migratedData);
        } else {
          setLockData(data);
        }
      }
    } catch (err) {
      console.error('Error initializing payment lock:', err);
      setError('Failed to initialize payment lock');
    }
  };

  // Load user dismissal status
  const loadUserDismissal = async () => {
    if (!currentUser?.uid) return;

    try {
      const dismissalRef = doc(db, 'users', currentUser.uid, 'paymentLockDismissed', 'current');
      const dismissalSnap = await getDoc(dismissalRef);
      
      if (dismissalSnap.exists()) {
        const data = dismissalSnap.data() as PaymentLockDismissedData;
        setUserDismissal(data);
      } else {
        setUserDismissal(null);
      }
    } catch (err) {
      console.error('Error loading user dismissal:', err);
    }
  };

  // Listen to real-time updates for lock status
  useEffect(() => {
    const lockRef = doc(db, 'system', 'paymentLock');
    
    const unsubscribe = onSnapshot(lockRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Handle migration from old format
        if ('isActive' in data && !('isNoticeActive' in data)) {
          const migratedData: PaymentLockData = {
            isNoticeActive: (data as any).isActive || false,
            isLockActive: false,
            noticeActivatedAt: (data as any).activatedAt || null,
            lockActivatedAt: null,
            activatedBy: (data as any).activatedBy || '',
            message: (data as any).message || '',
            updatedAt: (data as any).updatedAt || Timestamp.now()
          };
          setLockData(migratedData);
          // Update Firestore with new format
          setDoc(lockRef, migratedData, { merge: true }).catch(err => {
            console.error('Error migrating payment lock data:', err);
          });
        } else {
          // Ensure all required fields exist with proper defaults
          const completeData: PaymentLockData = {
            isNoticeActive: data?.isNoticeActive ?? false,
            isLockActive: data?.isLockActive ?? false,
            noticeActivatedAt: data?.noticeActivatedAt ?? null,
            lockActivatedAt: data?.lockActivatedAt ?? null,
            activatedBy: data?.activatedBy || '',
            message: data?.message || '',
            updatedAt: data?.updatedAt || Timestamp.now()
          };
          console.log('Payment lock data updated:', completeData);
          setLockData(completeData);
        }
        setError(null);
      } else {
        // Initialize if document doesn't exist
        initializePaymentLock();
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to payment lock:', err);
      setError('Failed to load payment lock status');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user dismissal when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      loadUserDismissal();
    } else {
      setUserDismissal(null);
    }
  }, [currentUser?.uid]);

  // Check if notice is active (for UI display - doesn't bypass for super admin)
  const isNoticeActive = (): boolean => {
    return lockData?.isNoticeActive === true;
  };

  // Check if lock is active (for UI display - doesn't bypass for super admin)
  const isLockActive = (): boolean => {
    return lockData?.isLockActive === true;
  };

  // Check if notice should affect user (bypasses for super admin)
  const shouldShowNotice = (): boolean => {
    if (isSuperAdmin) return false; // Super admin bypasses notice
    return lockData?.isNoticeActive === true;
  };

  // Check if lock should affect user (bypasses for super admin)
  const shouldShowLock = (): boolean => {
    if (isSuperAdmin) return false; // Super admin bypasses lock
    return lockData?.isLockActive === true;
  };

  // Check if modal should be shown (bypass for super admin)
  const shouldShowModal = (): boolean => {
    if (isSuperAdmin) return false; // Super admin bypasses everything
    return shouldShowNotice() || shouldShowLock();
  };

  // Calculate remaining days from notice activation
  const getRemainingDays = (): number => {
    if (!lockData?.isNoticeActive || !lockData?.noticeActivatedAt) {
      return 0;
    }

    const activatedAt = lockData.noticeActivatedAt.toMillis();
    const now = Date.now();
    const elapsedDays = Math.floor((now - activatedAt) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 3 - elapsedDays);
    
    return remainingDays;
  };

  // Check if user can dismiss (only for notice, not for lock)
  const canDismiss = (): boolean => {
    if (isSuperAdmin) return false; // Super admin doesn't need to dismiss
    if (shouldShowLock()) return false; // Lock cannot be dismissed
    if (!shouldShowNotice() || !lockData?.noticeActivatedAt) {
      return false;
    }

    // Check if user has already dismissed for this specific notice activation
    if (userDismissal) {
      const dismissalActivatedAt = userDismissal.lockActivatedAt.toMillis();
      const currentActivatedAt = lockData.noticeActivatedAt.toMillis();
      
      // If dismissal is for the same activation, user cannot dismiss again
      if (dismissalActivatedAt === currentActivatedAt) {
        return false;
      }
    }

    // All users can dismiss notice
    return true;
  };

  // Check if user has dismissed for current notice activation
  const hasUserDismissed = (): boolean => {
    if (isSuperAdmin) return true; // Super admin is considered "dismissed"
    if (shouldShowLock()) return false; // Lock cannot be dismissed
    if (!shouldShowNotice() || !lockData?.noticeActivatedAt || !userDismissal) {
      return false;
    }

    const dismissalActivatedAt = userDismissal.lockActivatedAt.toMillis();
    const currentActivatedAt = lockData.noticeActivatedAt.toMillis();
    
    return dismissalActivatedAt === currentActivatedAt;
  };

  // Dismiss notice for current user
  const dismissNotice = async (): Promise<void> => {
    if (isSuperAdmin) return; // Super admin doesn't need to dismiss
    if (!currentUser?.uid || !lockData?.noticeActivatedAt) {
      throw new Error('User not authenticated or notice not active');
    }

    try {
      const dismissalRef = doc(db, 'users', currentUser.uid, 'paymentLockDismissed', 'current');
      await setDoc(dismissalRef, {
        dismissedAt: Timestamp.now(),
        lockActivatedAt: lockData.noticeActivatedAt
      });
      
      await loadUserDismissal();
    } catch (err) {
      console.error('Error dismissing notice:', err);
      throw err;
    }
  };

  // Refresh lock status
  const refreshLockStatus = async (): Promise<void> => {
    setLoading(true);
    try {
      await initializePaymentLock();
      await loadUserDismissal();
    } catch (err) {
      console.error('Error refreshing lock status:', err);
      setError('Failed to refresh lock status');
    } finally {
      setLoading(false);
    }
  };

  const value: PaymentLockContextType = {
    lockData,
    loading,
    error,
    isNoticeActive,
    isLockActive,
    shouldShowModal,
    canDismiss,
    getRemainingDays,
    dismissNotice,
    hasUserDismissed,
    refreshLockStatus
  };

  return (
    <PaymentLockContext.Provider value={value}>
      {children}
    </PaymentLockContext.Provider>
  );
};

