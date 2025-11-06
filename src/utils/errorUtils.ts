import { FirebaseError } from 'firebase/app';

export type ErrorType = 'network' | 'invalid-credentials' | 'user-not-found' | 'email-already-in-use' | 'weak-password' | 'unknown';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  isRetryable: boolean;
}

/**
 * Detects the type of error and returns appropriate error information
 */
export const getErrorInfo = (error: any): ErrorInfo => {
  // Check if it's a Firebase error
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        return {
          type: 'user-not-found',
          message: 'No account found with this email address. Please check your email address or create a new account.',
          isRetryable: false
        };
      
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return {
          type: 'invalid-credentials',
          message: 'Incorrect email or password. Please double-check your credentials and try again.',
          isRetryable: true
        };
      
      case 'auth/email-already-in-use':
        return {
          type: 'email-already-in-use',
          message: 'An account with this email already exists. Please sign in instead.',
          isRetryable: false
        };
      
      case 'auth/weak-password':
        return {
          type: 'weak-password',
          message: 'Password is too weak. Please choose a stronger password with at least 6 characters.',
          isRetryable: true
        };
      
      case 'auth/network-request-failed':
        return {
          type: 'network',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          isRetryable: true
        };
      
      case 'auth/too-many-requests':
        return {
          type: 'network',
          message: 'Too many failed attempts. Please wait a moment before trying again.',
          isRetryable: true
        };
      
      default:
        return {
          type: 'unknown',
          message: 'An unexpected error occurred. Please try again.',
          isRetryable: true
        };
    }
  }

  // Check for network-related errors
  if (error?.message?.includes('network') || 
      error?.message?.includes('fetch') || 
      error?.message?.includes('connection') ||
      error?.code === 'NETWORK_ERROR' ||
      error?.name === 'NetworkError') {
    return {
      type: 'network',
      message: 'No internet connection detected. Please check your network settings and try again.',
      isRetryable: true
    };
  }

  // Check for timeout errors
  if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
    return {
      type: 'network',
      message: 'Request timed out. Your connection may be slow. Please try again.',
      isRetryable: true
    };
  }

  // Default fallback
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    isRetryable: true
  };
};

/**
 * Checks if the device is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Gets a user-friendly error message based on error type
 */
export const getErrorMessage = (errorType: ErrorType, isSignUp: boolean = false): string => {
  switch (errorType) {
    case 'network':
      return 'Connection problem detected. Please check your internet connection and try again.';
    
    case 'invalid-credentials':
      return 'Incorrect email or password. Please double-check your credentials and try again.';
    
    case 'user-not-found':
      return isSignUp 
        ? 'An account with this email already exists. Please sign in instead.'
        : 'No account found with this email address. Please check your email or create a new account.';
    
    case 'email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    
    case 'weak-password':
      return 'Password is too weak. Please choose a stronger password with at least 6 characters.';
    
    default:
      return isSignUp 
        ? 'Failed to create account. Please try again.' 
        : 'Failed to sign in. Please try again.';
  }
};
