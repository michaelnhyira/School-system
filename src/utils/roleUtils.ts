import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type UserRole = 'admin' | 'teacher' | 'accountant';

export interface UserRoleData {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  isActive: boolean;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canManageClasses: boolean;
  canManageSubjects: boolean;
  canManageFees: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canSendMessages: boolean;
  canViewDashboard: boolean;
}

// Role permissions configuration
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canManageStudents: true,
    canManageTeachers: true,
    canManageClasses: true,
    canManageSubjects: true,
    canManageFees: true,
    canViewReports: true,
    canManageSettings: true,
    canSendMessages: true,
    canViewDashboard: true,
  },
  teacher: {
    canManageUsers: false,
    canManageStudents: true,
    canManageTeachers: false,
    canManageClasses: true,
    canManageSubjects: true,
    canManageFees: false,
    canViewReports: true,
    canManageSettings: false,
    canSendMessages: false,
    canViewDashboard: true,
  },
  accountant: {
    canManageUsers: false,
    canManageStudents: true,
    canManageTeachers: false,
    canManageClasses: false,
    canManageSubjects: false,
    canManageFees: true,
    canViewReports: true,
    canManageSettings: false,
    canSendMessages: true,
    canViewDashboard: true,
  },
};

export const roleUtils = {
  // Initialize admin user (call this once to set up the initial admin)
  async initializeAdminUser(email: string = 'michaelnhyira77@gmail.com') {
    try {
      const userRoleRef = doc(db, 'userRoles', email);
      const existingDoc = await getDoc(userRoleRef);
      
      if (!existingDoc.exists()) {
        const adminData: Omit<UserRoleData, 'id'> = {
          email: email,
          displayName: 'Michael Nhyira (Admin)',
          role: 'admin',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'system',
          isActive: true,
        };
        
        await setDoc(userRoleRef, adminData);
        console.log(`Admin user ${email} initialized successfully`);
        return { id: email, ...adminData };
      } else {
        console.log(`Admin user ${email} already exists`);
        return { id: existingDoc.id, ...existingDoc.data() } as UserRoleData;
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
      throw error;
    }
  },

  // Get user role by email
  async getUserRole(email: string): Promise<UserRoleData | null> {
    try {
      const userRoleRef = doc(db, 'userRoles', email);
      const userRoleDoc = await getDoc(userRoleRef);
      
      if (userRoleDoc.exists()) {
        return { id: userRoleDoc.id, ...userRoleDoc.data() } as UserRoleData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  },

  // Assign role to user
  async assignUserRole(email: string, role: UserRole, displayName: string, assignedBy: string) {
    try {
      const userRoleRef = doc(db, 'userRoles', email);
      const userData: Omit<UserRoleData, 'id'> = {
        email: email,
        displayName: displayName,
        role: role,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: assignedBy,
        isActive: true,
      };
      
      await setDoc(userRoleRef, userData);
      console.log(`Role ${role} assigned to ${email} by ${assignedBy}`);
      return { id: email, ...userData };
    } catch (error) {
      console.error('Error assigning user role:', error);
      throw error;
    }
  },

  // Update user role
  async updateUserRole(email: string, updates: Partial<Pick<UserRoleData, 'role' | 'displayName' | 'isActive'>>, updatedBy: string) {
    try {
      const userRoleRef = doc(db, 'userRoles', email);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: updatedBy,
      };
      
      await updateDoc(userRoleRef, updateData);
      console.log(`User role updated for ${email} by ${updatedBy}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Remove user role
  async removeUserRole(email: string) {
    try {
      const userRoleRef = doc(db, 'userRoles', email);
      await deleteDoc(userRoleRef);
      console.log(`User role removed for ${email}`);
    } catch (error) {
      console.error('Error removing user role:', error);
      throw error;
    }
  },

  // Get all users with roles
  async getAllUsersWithRoles(): Promise<UserRoleData[]> {
    try {
      const userRolesRef = collection(db, 'userRoles');
      const querySnapshot = await getDocs(userRolesRef);
      
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRoleData[];
      
      return users.sort((a, b) => a.email.localeCompare(b.email));
    } catch (error) {
      console.error('Error getting all users with roles:', error);
      return [];
    }
  },

  // Get users by role
  async getUsersByRole(role: UserRole): Promise<UserRoleData[]> {
    try {
      const userRolesRef = collection(db, 'userRoles');
      const q = query(userRolesRef, where('role', '==', role), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRoleData[];
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  },

  // Check if user has permission
  hasPermission(role: UserRole | null, permission: keyof RolePermissions): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.[permission] || false;
  },

  // Get user permissions
  getUserPermissions(role: UserRole | null): RolePermissions | null {
    if (!role) return null;
    return ROLE_PERMISSIONS[role] || null;
  },

  // Check if user is admin
  isAdmin(role: UserRole | null): boolean {
    return role === 'admin';
  },

  // Check if user is teacher
  isTeacher(role: UserRole | null): boolean {
    return role === 'teacher';
  },

  // Check if user is accountant
  isAccountant(role: UserRole | null): boolean {
    return role === 'accountant';
  },

  // Get role display name
  getRoleDisplayName(role: UserRole): string {
    const roleNames = {
      admin: 'Administrator',
      teacher: 'Teacher',
      accountant: 'Accountant'
    };
    return roleNames[role];
  },

  // Get role color for UI
  getRoleColor(role: UserRole): string {
    const roleColors = {
      admin: 'red',
      teacher: 'blue',
      accountant: 'green'
    };
    return roleColors[role];
  },

  // Validate role assignment (ensure at least one admin exists)
  async validateRoleChange(targetEmail: string, newRole: UserRole | null): Promise<{ isValid: boolean; message?: string }> {
    try {
      const allUsers = await this.getAllUsersWithRoles();
      const admins = allUsers.filter(user => user.role === 'admin' && user.isActive);
      
      // If trying to remove admin role or deactivate admin
      if (newRole !== 'admin') {
        const targetUser = allUsers.find(user => user.email === targetEmail);
        if (targetUser?.role === 'admin' && admins.length === 1) {
          return {
            isValid: false,
            message: 'Cannot remove the last admin user. Please assign admin role to another user first.'
          };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating role change:', error);
      return { isValid: false, message: 'Error validating role change' };
    }
  }
};

