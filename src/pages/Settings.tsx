import { useState, useEffect } from 'react'
import { Save, Database, Trash2, Upload, Download, Users, UserPlus, Edit3, Lock, Unlock, AlertTriangle, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePaymentLock } from '../contexts/PaymentLockContext'
import { paymentLockUtils } from '../utils/firebaseUtils'
import { roleUtils } from '../utils/roleUtils'
import type { UserRole, UserRoleData } from '../utils/roleUtils'
import { Navigate } from 'react-router-dom'


const Settings = () => {
  const { hasPermission, currentUser, refreshUserRole, isTeacher } = useAuth()
  const { lockData, isNoticeActive, isLockActive, getRemainingDays, refreshLockStatus, loading: lockLoading } = usePaymentLock()
  const [activeTab, setActiveTab] = useState(hasPermission('canManageUsers') ? 'users' : 'backup')
  const [isSaving, setIsSaving] = useState(false)
  const [users, setUsers] = useState<UserRoleData[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRoleData | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserDisplayName, setNewUserDisplayName] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>('teacher')
  const [isTogglingNotice, setIsTogglingNotice] = useState(false)
  const [isTogglingLock, setIsTogglingLock] = useState(false)
  const [lockMessage, setLockMessage] = useState('')

  const isSuperAdmin = currentUser?.email === 'michaelnhyira77@gmail.com'

  const tabs = [
    ...(hasPermission('canManageUsers') ? [{ id: 'users', name: 'User Management', icon: Users }] : []),
    ...(isSuperAdmin ? [{ id: 'paymentLock', name: 'Payment Lock', icon: Lock }] : []),
    { id: 'backup', name: 'Backup & Export', icon: Database }
  ]

  // Fetch users when component mounts or users tab is selected
  useEffect(() => {
    if (activeTab === 'users' && hasPermission('canManageUsers')) {
      fetchUsers()
    }
  }, [activeTab, hasPermission])

  const fetchUsers = async () => {
    try {
      setUsersLoading(true)
      const allUsers = await roleUtils.getAllUsersWithRoles()
      setUsers(allUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAddUser = async () => {
    try {
      setIsSaving(true)
      await roleUtils.assignUserRole(
        newUserEmail, 
        newUserRole, 
        newUserDisplayName, 
        currentUser?.email || 'system'
      )
      
      // Reset form
      setNewUserEmail('')
      setNewUserDisplayName('')
      setNewUserRole('teacher')
      setShowAddUserModal(false)
      
      // Refresh users list
      await fetchUsers()
      
      // Show success message (you can implement a toast system)
      alert('User role assigned successfully!')
    } catch (error) {
      console.error('Error adding user:', error)
      alert('Error assigning user role. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return
    
    try {
      setIsSaving(true)
      
      // Validate role change
      const validation = await roleUtils.validateRoleChange(selectedUser.email, newUserRole)
      if (!validation.isValid) {
        alert(validation.message)
        return
      }
      
      await roleUtils.updateUserRole(
        selectedUser.email,
        {
          role: newUserRole,
          displayName: newUserDisplayName,
          isActive: true
        },
        currentUser?.email || 'system'
      )
      
      setShowEditUserModal(false)
      setSelectedUser(null)
      
      // Refresh users list
      await fetchUsers()
      
      // Refresh current user role if editing own role
      if (selectedUser.email === currentUser?.email) {
        await refreshUserRole()
      }
      
      alert('User role updated successfully!')
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user role. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveUser = async (userEmail: string) => {
    if (!confirm('Are you sure you want to remove this user\'s role? They will lose access to the system.')) {
      return
    }
    
    try {
      // Validate role change
      const validation = await roleUtils.validateRoleChange(userEmail, null)
      if (!validation.isValid) {
        alert(validation.message)
        return
      }
      
      await roleUtils.removeUserRole(userEmail)
      await fetchUsers()
      alert('User role removed successfully!')
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Error removing user role. Please try again.')
    }
  }

  const openEditModal = (user: UserRoleData) => {
    setSelectedUser(user)
    setNewUserEmail(user.email)
    setNewUserDisplayName(user.displayName)
    setNewUserRole(user.role)
    setShowEditUserModal(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    // Show success message
  }

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
          <p className="mt-1 text-sm text-gray-500">Manage user roles and permissions</p>
        </div>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {usersLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading users...</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {users.filter(user => user.email !== 'michaelnhyira77@gmail.com').map((user) => (
              <li key={user.email}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {roleUtils.getRoleDisplayName(user.role)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                          {user.email === currentUser?.email && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {user.email !== currentUser?.email && (
                        <button
                          onClick={() => handleRemoveUser(user.email)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Created by {user.createdBy}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new user.</p>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={newUserDisplayName}
                    onChange={(e) => setNewUserDisplayName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddUserModal(false)
                    setNewUserEmail('')
                    setNewUserDisplayName('')
                    setNewUserRole('teacher')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={!newUserEmail || !newUserDisplayName || isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    disabled
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={newUserDisplayName}
                    onChange={(e) => setNewUserDisplayName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditUserModal(false)
                    setSelectedUser(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={!newUserDisplayName || isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const handleToggleNotice = async () => {
    if (!currentUser?.email) return

    setIsTogglingNotice(true)
    try {
      if (isNoticeActive()) {
        await paymentLockUtils.deactivateNotice()
        console.log('Notice deactivated, refreshing status...')
        alert('Payment notice deactivated successfully.')
      } else {
        await paymentLockUtils.activateNotice(currentUser.email, lockMessage)
        console.log('Notice activated, refreshing status...')
        alert('Payment notice activated successfully.')
        setLockMessage('')
      }
      // Small delay to ensure Firestore update completes
      await new Promise(resolve => setTimeout(resolve, 500))
      await refreshLockStatus()
      console.log('Lock status refreshed')
    } catch (error) {
      console.error('Error toggling payment notice:', error)
      alert('Failed to toggle payment notice. Please try again.')
    } finally {
      setIsTogglingNotice(false)
    }
  }

  const handleToggleLock = async () => {
    if (!currentUser?.email) return

    setIsTogglingLock(true)
    try {
      if (isLockActive()) {
        await paymentLockUtils.deactivateLock()
        console.log('Lock deactivated, refreshing status...')
        alert('Payment lock deactivated successfully.')
      } else {
        await paymentLockUtils.activateLock(currentUser.email)
        console.log('Lock activated, refreshing status...')
        alert('Payment lock activated successfully.')
      }
      // Small delay to ensure Firestore update completes
      await new Promise(resolve => setTimeout(resolve, 500))
      await refreshLockStatus()
      console.log('Lock status refreshed')
    } catch (error) {
      console.error('Error toggling payment lock:', error)
      alert('Failed to toggle payment lock. Please try again.')
    } finally {
      setIsTogglingLock(false)
    }
  }

  const renderPaymentLock = () => {
    const remainingDays = getRemainingDays()
    const noticeActivatedDate = lockData?.noticeActivatedAt?.toDate()
    const lockActivatedDate = lockData?.lockActivatedAt?.toDate()
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Lock</h3>
          <p className="mt-1 text-sm text-gray-500">Control system access based on payment status</p>
        </div>

        {/* Notice Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-medium text-gray-900">Payment Notice</h4>
              <p className="text-sm text-gray-500 mt-1">
                {isNoticeActive() ? 'Notice is currently active (dismissible)' : 'Notice is currently inactive'}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isNoticeActive() ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
            }`}>
              {isNoticeActive() ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Active</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">Inactive</span>
                </>
              )}
            </div>
          </div>

          {isNoticeActive() && lockData?.noticeActivatedAt && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">Notice Activated</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Activated on: {noticeActivatedDate?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-xs text-yellow-700">
                    Activated by: {lockData.activatedBy || 'N/A'}
                  </p>
                  {remainingDays > 0 && (
                    <p className="text-sm font-semibold text-yellow-900 mt-2">
                      {remainingDays} day{remainingDays !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                  {remainingDays <= 0 && (
                    <p className="text-sm font-semibold text-orange-900 mt-2">
                      Notice period has ended. Consider activating the lock.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={lockMessage}
              onChange={(e) => setLockMessage(e.target.value)}
              placeholder="Enter a custom message to display to users..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              disabled={isNoticeActive()}
            />
            <p className="mt-1 text-xs text-gray-500">
              This message will be shown to users when the notice is active
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {isNoticeActive() ? (
                <p>Deactivate the notice to stop showing payment warnings</p>
              ) : (
                <p>Activate the notice to show dismissible payment warning to all users</p>
              )}
            </div>
            <button
              onClick={handleToggleNotice}
              disabled={isTogglingNotice || lockLoading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isNoticeActive()
                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isTogglingNotice ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isNoticeActive() ? 'Deactivating...' : 'Activating...'}
                </>
              ) : (
                <>
                  {isNoticeActive() ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Deactivate Notice
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Activate Notice
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lock Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-base font-medium text-gray-900">Payment Lock</h4>
              <p className="text-sm text-gray-500 mt-1">
                {isLockActive() ? 'Lock is currently active (non-dismissible)' : 'Lock is currently inactive'}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isLockActive() ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {isLockActive() ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span className="font-semibold">Active</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span className="font-semibold">Inactive</span>
                </>
              )}
            </div>
          </div>

          {isLockActive() && lockData?.lockActivatedAt && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Lock Activated</p>
                  <p className="text-xs text-red-700 mt-1">
                    Activated on: {lockActivatedDate?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-xs text-red-700">
                    Activated by: {lockData.activatedBy || 'N/A'}
                  </p>
                  <p className="text-sm font-semibold text-red-900 mt-2">
                    Access is blocked for all users (except super admin)
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {isLockActive() ? (
                <p>Deactivate the lock to restore full access to all users</p>
              ) : (
                <p>Activate the lock to block access for all users (cannot be dismissed)</p>
              )}
            </div>
            <button
              onClick={handleToggleLock}
              disabled={isTogglingLock || lockLoading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isLockActive()
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
            >
              {isTogglingLock ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isLockActive() ? 'Deactivating...' : 'Activating...'}
                </>
              ) : (
                <>
                  {isLockActive() ? (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Deactivate Lock
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Activate Lock
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderBackupSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">Backup & Export</h3>
        <p className="mt-1 text-sm text-gray-500">Manage data backup and export options</p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Download className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Export Data</h4>
                <p className="text-sm text-gray-500">Download all school data as CSV/Excel files</p>
              </div>
            </div>
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Export
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Upload className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Import Data</h4>
                <p className="text-sm text-gray-500">Import student, teacher, or fee data from files</p>
              </div>
            </div>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Import
            </button>
          </div>
        </div>

        <div className="border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trash2 className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Delete All Data</h4>
                <p className="text-sm text-gray-500">Permanently delete all school data (irreversible)</p>
              </div>
            </div>
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Redirect teachers away from the Settings page
  if (isTeacher()) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your school management system configuration
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && hasPermission('canManageUsers') && renderUserManagement()}
          {activeTab === 'paymentLock' && isSuperAdmin && renderPaymentLock()}
          {activeTab === 'backup' && renderBackupSettings()}
        </div>

        <div className="bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
