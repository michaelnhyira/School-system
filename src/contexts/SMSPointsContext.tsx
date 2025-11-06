import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface SMSPointsData {
  totalPoints: number;
  usedPoints: number;
  remainingPoints: number;
  lastUpdated: string;
  allocatedBy: string;
  allocationDate: string;
  totalPurchased: number;
  totalSpent: number;
}

interface PurchaseRecord {
  id: string;
  points: number;
  amount: number;
  paymentReference: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed';
  purchasedAt: string;
  purchasedBy: string;
}

interface SMSPointsContextType {
  smsPoints: SMSPointsData | null;
  loading: boolean;
  error: string | null;
  deductPoints: (points: number) => Promise<boolean>;
  addPoints: (points: number, allocatedBy: string) => Promise<boolean>;
  purchasePoints: (points: number, amount: number, paymentReference: string, purchasedBy: string) => Promise<boolean>;
  refreshPoints: () => Promise<void>;
}

const SMSPointsContext = createContext<SMSPointsContextType>({} as SMSPointsContextType);

export const useSMSPoints = () => {
  return useContext(SMSPointsContext);
};

interface SMSPointsProviderProps {
  children: React.ReactNode;
}

export const SMSPointsProvider: React.FC<SMSPointsProviderProps> = ({ children }) => {
  const [smsPoints, setSmsPoints] = useState<SMSPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize SMS points if they don't exist
  const initializeSMSPoints = async () => {
    try {
      const smsPointsRef = doc(db, 'system', 'smsPoints');
      const smsPointsSnap = await getDoc(smsPointsRef);
      
      if (!smsPointsSnap.exists()) {
        // Initialize with 0 points
        const initialData: SMSPointsData = {
          totalPoints: 0,
          usedPoints: 0,
          remainingPoints: 0,
          lastUpdated: new Date().toISOString(),
          allocatedBy: 'system',
          allocationDate: new Date().toISOString(),
          totalPurchased: 0,
          totalSpent: 0
        };
        
        await setDoc(smsPointsRef, initialData);
        setSmsPoints(initialData);
      } else {
        const data = smsPointsSnap.data() as SMSPointsData;
        setSmsPoints(data);
      }
    } catch (err) {
      console.error('Error initializing SMS points:', err);
      setError('Failed to initialize SMS points');
    }
  };

  // Listen to real-time updates
  useEffect(() => {
    const smsPointsRef = doc(db, 'system', 'smsPoints');
    
    const unsubscribe = onSnapshot(smsPointsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as SMSPointsData;
        setSmsPoints(data);
        setError(null);
      } else {
        // Initialize if document doesn't exist
        initializeSMSPoints();
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to SMS points:', err);
      setError('Failed to load SMS points');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Deduct points when sending SMS
  const deductPoints = async (points: number): Promise<boolean> => {
    if (!smsPoints || smsPoints.remainingPoints < points) {
      return false;
    }

    try {
      const smsPointsRef = doc(db, 'system', 'smsPoints');
      const newUsedPoints = smsPoints.usedPoints + points;
      const newRemainingPoints = smsPoints.totalPoints - newUsedPoints;
      
      await updateDoc(smsPointsRef, {
        usedPoints: newUsedPoints,
        remainingPoints: newRemainingPoints,
        lastUpdated: new Date().toISOString()
      });
      
      return true;
    } catch (err) {
      console.error('Error deducting SMS points:', err);
      setError('Failed to deduct SMS points');
      return false;
    }
  };

  // Add points (top-up)
  const addPoints = async (points: number, allocatedBy: string): Promise<boolean> => {
    try {
      const smsPointsRef = doc(db, 'system', 'smsPoints');
      const currentTotal = smsPoints?.totalPoints || 0;
      const currentUsed = smsPoints?.usedPoints || 0;
      const newTotalPoints = currentTotal + points;
      const newRemainingPoints = newTotalPoints - currentUsed;
      
      await updateDoc(smsPointsRef, {
        totalPoints: newTotalPoints,
        remainingPoints: newRemainingPoints,
        lastUpdated: new Date().toISOString(),
        allocatedBy: allocatedBy,
        allocationDate: new Date().toISOString()
      });
      
      return true;
    } catch (err) {
      console.error('Error adding SMS points:', err);
      setError('Failed to add SMS points');
      return false;
    }
  };

  // Purchase points via Paystack
  const purchasePoints = async (points: number, amount: number, paymentReference: string, purchasedBy: string): Promise<boolean> => {
    try {
      const smsPointsRef = doc(db, 'system', 'smsPoints');
      const purchaseRef = doc(db, 'purchases', paymentReference);
      
      // Create purchase record
      const purchaseRecord: PurchaseRecord = {
        id: paymentReference,
        points,
        amount,
        paymentReference,
        paymentMethod: 'paystack',
        status: 'completed',
        purchasedAt: new Date().toISOString(),
        purchasedBy
      };
      
      await setDoc(purchaseRef, purchaseRecord);
      
      // Update SMS points
      const currentTotal = smsPoints?.totalPoints || 0;
      const currentUsed = smsPoints?.usedPoints || 0;
      const currentPurchased = smsPoints?.totalPurchased || 0;
      const newTotalPoints = currentTotal + points;
      const newRemainingPoints = newTotalPoints - currentUsed;
      const newTotalPurchased = currentPurchased + points;
      
      await updateDoc(smsPointsRef, {
        totalPoints: newTotalPoints,
        remainingPoints: newRemainingPoints,
        totalPurchased: newTotalPurchased,
        lastUpdated: new Date().toISOString(),
        allocatedBy: purchasedBy,
        allocationDate: new Date().toISOString()
      });
      
      return true;
    } catch (err) {
      console.error('Error purchasing SMS points:', err);
      setError('Failed to purchase SMS points');
      return false;
    }
  };

  // Refresh points manually
  const refreshPoints = async (): Promise<void> => {
    setLoading(true);
    try {
      const smsPointsRef = doc(db, 'system', 'smsPoints');
      const smsPointsSnap = await getDoc(smsPointsRef);
      
      if (smsPointsSnap.exists()) {
        const data = smsPointsSnap.data() as SMSPointsData;
        setSmsPoints(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error refreshing SMS points:', err);
      setError('Failed to refresh SMS points');
    } finally {
      setLoading(false);
    }
  };

  const value: SMSPointsContextType = {
    smsPoints,
    loading,
    error,
    deductPoints,
    addPoints,
    purchasePoints,
    refreshPoints
  };

  return (
    <SMSPointsContext.Provider value={value}>
      {children}
    </SMSPointsContext.Provider>
  );
};
