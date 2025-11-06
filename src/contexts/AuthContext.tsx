import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { roleUtils } from '../utils/roleUtils';
import type { UserRole, UserRoleData, RolePermissions } from '../utils/roleUtils';

// Export User type for use in other components
export type { User, UserRole, UserRoleData, RolePermissions };

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  userRoleData: UserRoleData | null;
  permissions: RolePermissions | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  roleLoading: boolean;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  isAdmin: () => boolean;
  isTeacher: () => boolean;
  isAccountant: () => boolean;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userRoleData, setUserRoleData] = useState<UserRoleData | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && user) {
        await updateProfile(user, { displayName });
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const createOrUpdateUserDocument = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          selectedAcademicPeriod: null // Will be set when user selects a period
        });
        console.log('User document created for:', user.email);
      } else {
        // Update last login time
        await setDoc(userRef, {
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
        console.log('User document updated for:', user.email);
      }
    } catch (error) {
      console.error('Error creating/updating user document:', error);
    }
  };

  const refreshUserRole = async () => {
    if (currentUser?.email) {
      setRoleLoading(true);
      try {
        const roleData = await roleUtils.getUserRole(currentUser.email);
        setUserRoleData(roleData);
        setUserRole(roleData?.role || null);
        setPermissions(roleData?.role ? roleUtils.getUserPermissions(roleData.role) : null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRoleData(null);
        setUserRole(null);
        setPermissions(null);
      } finally {
        setRoleLoading(false);
      }
    } else {
      setUserRoleData(null);
      setUserRole(null);
      setPermissions(null);
      setRoleLoading(false);
    }
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return roleUtils.hasPermission(userRole, permission);
  };

  const isAdmin = (): boolean => {
    return roleUtils.isAdmin(userRole);
  };

  const isTeacher = (): boolean => {
    return roleUtils.isTeacher(userRole);
  };

  const isAccountant = (): boolean => {
    return roleUtils.isAccountant(userRole);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user?.email) {
        // Set role loading to true when starting to fetch role
        setRoleLoading(true);
        
        // Create or update user document
        await createOrUpdateUserDocument(user);
        
        // Fetch user role when user signs in
        try {
          const roleData = await roleUtils.getUserRole(user.email);
          setUserRoleData(roleData);
          setUserRole(roleData?.role || null);
          setPermissions(roleData?.role ? roleUtils.getUserPermissions(roleData.role) : null);
          
          // Initialize admin user if this is the first login and no role exists
          if (!roleData && user.email === 'michaelnhyira77@gmail.com') {
            const adminData = await roleUtils.initializeAdminUser(user.email);
            setUserRoleData(adminData);
            setUserRole(adminData.role);
            setPermissions(roleUtils.getUserPermissions(adminData.role));
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRoleData(null);
          setUserRole(null);
          setPermissions(null);
        } finally {
          setRoleLoading(false);
        }
      } else {
        setUserRoleData(null);
        setUserRole(null);
        setPermissions(null);
        setRoleLoading(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userRole,
    userRoleData,
    permissions,
    login,
    signup,
    logout,
    resetPassword,
    loading,
    roleLoading,
    hasPermission,
    isAdmin,
    isTeacher,
    isAccountant,
    refreshUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {loading || roleLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {roleLoading ? 'Loading your account...' : 'Loading...'}
            </p>
          </div>
        </div>
      ) : currentUser && !userRole ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-yellow-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Access Pending</h3>
              <p className="text-yellow-700 mb-4">
                Your account ({currentUser.email}) has not been assigned a role yet. 
                Please contact an administrator to get access to the system.
              </p>
              <div className="bg-yellow-100 border border-yellow-300 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> If you believe you should have access, please also check your internet connection 
                  and try refreshing the page, as connectivity issues can sometimes cause this message to appear.
                </p>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
