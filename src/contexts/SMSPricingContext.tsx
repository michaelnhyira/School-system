import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface SMSPricing {
  pricePerPoint: number; // Price in GHS
  currency: string;
  lastUpdated: Timestamp | null;
  updatedBy: string | null;
  createdAt: Timestamp;
}

interface SMSPricingContextType {
  pricing: SMSPricing | null;
  loading: boolean;
  error: string | null;
  updatePricing: (pricePerPoint: number, updatedBy: string) => Promise<boolean>;
  calculateCost: (points: number) => number;
  calculatePoints: (amount: number) => number;
}

const SMSPricingContext = createContext<SMSPricingContextType | undefined>(undefined);

export const SMSPricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pricing, setPricing] = useState<SMSPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const docRef = doc(db, 'appSettings', 'smsPricing');

  const fetchPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPricing(docSnap.data() as SMSPricing);
      } else {
        // Initialize with default pricing
        const defaultPricing: SMSPricing = {
          pricePerPoint: 0.5, // 0.5 GHS per SMS point
          currency: 'GHS',
          lastUpdated: null,
          updatedBy: null,
          createdAt: Timestamp.now(),
        };
        await setDoc(docRef, defaultPricing);
        setPricing(defaultPricing);
      }
    } catch (err: any) {
      console.error('Error fetching SMS pricing:', err);
      setError('Failed to fetch SMS pricing.');
      // Set default pricing even if there's an error to prevent white screen
      setPricing({
        pricePerPoint: 0.5,
        currency: 'GHS',
        lastUpdated: null,
        updatedBy: null,
        createdAt: Timestamp.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const updatePricing = async (pricePerPoint: number, updatedBy: string): Promise<boolean> => {
    try {
      const updatedPricing: SMSPricing = {
        pricePerPoint,
        currency: 'GHS',
        lastUpdated: Timestamp.now(),
        updatedBy,
        createdAt: pricing?.createdAt || Timestamp.now(),
      };
      
      await setDoc(docRef, updatedPricing);
      setPricing(updatedPricing);
      return true;
    } catch (err: any) {
      console.error('Error updating SMS pricing:', err);
      setError(`Failed to update pricing: ${err.message || err}`);
      return false;
    }
  };

  const calculateCost = (points: number): number => {
    if (!pricing) return 0;
    return points * pricing.pricePerPoint;
  };

  const calculatePoints = (amount: number): number => {
    if (!pricing || pricing.pricePerPoint === 0) return 0;
    return Math.floor(amount / pricing.pricePerPoint);
  };

  const value = {
    pricing,
    loading,
    error,
    updatePricing,
    calculateCost,
    calculatePoints,
  };

  return (
    <SMSPricingContext.Provider value={value}>
      {children}
    </SMSPricingContext.Provider>
  );
};

export const useSMSPricing = () => {
  const context = useContext(SMSPricingContext);
  if (context === undefined) {
    throw new Error('useSMSPricing must be used within an SMSPricingProvider');
  }
  return context;
};
