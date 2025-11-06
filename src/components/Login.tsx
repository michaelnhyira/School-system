import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const { login, signup, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      // Check internet connection first
      if (!navigator.onLine) {
        setError('No internet connection. Please check your network and try again.');
        setLoading(false);
        return;
      }
      
      if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      // Check for network-related errors
      const isNetworkError = 
        !navigator.onLine ||
        error?.code === 'auth/network-request-failed' ||
        error?.message?.includes('network') ||
        error?.message?.includes('internet') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        setError('No internet connection. Please check your network and try again.');
      } else if (error?.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please check your credentials.');
      } else if (error?.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error?.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(isSignUp ? 'Failed to create account. Please try again.' : 'Failed to sign in. Please check your credentials.');
      }
      console.error(isSignUp ? 'Signup error:' : 'Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">School Management</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {isSignUp ? 'Create your account to get started.' : 'Welcome back! Please sign in to your account.'}
          </p>
        </div>
        
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-lg">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                Username or Email
              </label>
              <div className="mt-1">
                <input
                  autoComplete="username"
                  className="block w-full appearance-none rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  id="email"
                  name="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="mt-1">
                <input
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="block w-full appearance-none rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  id="password"
                  name="password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </div>
            
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    autoComplete="new-password"
                    className="block w-full appearance-none rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}
            
            {!isSignUp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="ml-2 block text-sm text-slate-900 dark:text-slate-300" htmlFor="remember-me">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotPasswordEmail(email);
                      setForgotPasswordError('');
                      setForgotPasswordSuccess(false);
                    }}
                    className="font-medium text-primary hover:text-primary/90"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            )}
            
            <div>
              <button
                className="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign up' : 'Sign in')}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="font-medium text-primary hover:text-primary/90 ml-1"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          {!isSignUp && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Need help?
              <a className="font-medium text-primary hover:text-primary/90 ml-1" href="#">
                Contact Support
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Reset Password</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordError('');
                    setForgotPasswordSuccess(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success Message */}
              {forgotPasswordSuccess && (
                <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Password reset email sent!
                      </p>
                      <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                        Please check your email ({forgotPasswordEmail}) for instructions to reset your password. 
                        The email may take a few minutes to arrive.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {forgotPasswordError && (
                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{forgotPasswordError}</p>
                </div>
              )}

              {/* Form */}
              {!forgotPasswordSuccess && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!forgotPasswordEmail) {
                      setForgotPasswordError('Please enter your email address');
                      return;
                    }

                    setForgotPasswordLoading(true);
                    setForgotPasswordError('');

                    try {
                      await resetPassword(forgotPasswordEmail);
                      setForgotPasswordSuccess(true);
                    } catch (error: any) {
                      if (error?.code === 'auth/user-not-found') {
                        setForgotPasswordError('No account found with this email address.');
                      } else if (error?.code === 'auth/invalid-email') {
                        setForgotPasswordError('Invalid email address. Please check and try again.');
                      } else if (error?.code === 'auth/too-many-requests') {
                        setForgotPasswordError('Too many requests. Please try again later.');
                      } else {
                        setForgotPasswordError('Failed to send reset email. Please try again.');
                      }
                      console.error('Password reset error:', error);
                    } finally {
                      setForgotPasswordLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="block w-full pl-10 appearance-none rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail('');
                        setForgotPasswordError('');
                        setForgotPasswordSuccess(false);
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}

              {/* Close button when success */}
              {forgotPasswordSuccess && (
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordError('');
                    setForgotPasswordSuccess(false);
                  }}
                  className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
