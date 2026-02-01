
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { auth } from '../services/api'; // Import API service
import {
    loginUser as mockLogin,
    registerStudent as mockSignup,
    verifyUserEmail as mockVerify,
    resetUserPassword as mockResetPassword,
    loginWithGoogle as mockGoogleLogin
} from '../services/dataService'; // Import Mock service for fallback
import { GraduationCap, BookOpen, X, KeyRound, Mail, ArrowLeft, AlertCircle, User as UserIcon, Lock, CheckCircle2, Send, WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Logo } from '../components/Logo';

interface LoginProps {
    // CHANGED: Now accepts the full User object instead of just credentials
    onLogin: (user: User) => void;
    onCancel: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
    const { t } = useLanguage();

    // Modes: LOGIN, SIGNUP, VERIFY
    const [viewMode, setViewMode] = useState<'LOGIN' | 'SIGNUP' | 'VERIFY'>('LOGIN');
    const [role, setRole] = useState<UserRole>(UserRole.STUDENT);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [classLevel, setClassLevel] = useState<number>(12);
    const [verificationCode, setVerificationCode] = useState('');

    // UI State
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    // Forgot Password State
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetStatus, setResetStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [resetMsg, setResetMsg] = useState('');

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const trimmedEmail = email.trim();

        try {
            // Attempt API Login
            const data = await auth.login(trimmedEmail, password, role);
            handleAuthSuccess(data);
        } catch (err: any) {
            // console.error("API Login Error", err); // Suppress console noise

            // Special Case: If using hardcoded demo teacher credentials and API fails (e.g. 401 because DB is empty or incorrect environment), force fallback to mock
            const isDemoTeacher = role === UserRole.TEACHER && trimmedEmail === 'thef94089@gmail.com';

            // Check for Network Error or Server Error
            // Axios error object usually has `message: 'Network Error'` when backend is down
            const isNetworkError = err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response;
            const isServerError = err.response && err.response.status >= 500;
            const isAuthErrorForDemo = isDemoTeacher && (err.response?.status === 401 || err.response?.status === 404);

            if (isNetworkError || isServerError || isAuthErrorForDemo) {
                console.log("Switching to Offline Mock Mode due to connection issue.");
                setIsOfflineMode(true);

                const { user: mockUser, error: mockError } = mockLogin(trimmedEmail, role, password);
                if (mockUser) {
                    handleAuthSuccess({ ...mockUser, token: 'mock-token-' + Date.now() });
                    return;
                } else {
                    setError(mockError || "Login failed.");
                }
            } else {
                const msg = err.response?.data?.message || err.message;
                setError(msg || "Login failed. Please check your credentials.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthSuccess = (data: any) => {
        // Ensure ID compatibility and role presence
        const userForStorage: User = {
            ...data,
            id: data.id || data._id,
            role: data.role || role // Ensure role is preserved
        };

        localStorage.setItem('token', data.token);
        localStorage.setItem('physics_app_current_user', JSON.stringify(userForStorage));

        // Pass the full user object to App.tsx
        onLogin(userForStorage);
    };

    const handleGoogleLogin = async () => {
        // Simulate a Google Login Flow that creates a REAL user on backend
        // This prevents 401 errors when accessing protected routes (like payments) later

        setIsLoading(true);

        // Simulate Popup Delay
        setTimeout(async () => {
            try {
                // Generate a random-ish user or prompt (For demo, we use a consistent logic or random)
                // To satisfy "sign up using google account of user", we ideally need the real email.
                // Since we can't get it without real OAuth keys, we'll prompt the user for their Google Email to simulate the linkage.

                const simulatedEmail = prompt("Enter your Google Email (Simulation):", "student.demo@gmail.com");
                if (!simulatedEmail) {
                    setIsLoading(false);
                    return;
                }

                const simulatedName = simulatedEmail.split('@')[0]; // Extract name from email
                const googleId = "google-id-" + Math.random().toString(36).substr(2, 9);

                // Call Backend to Create/Login this user
                try {
                    const data = await auth.socialLogin({
                        email: simulatedEmail,
                        name: simulatedName,
                        googleId: googleId
                    });
                    handleAuthSuccess(data);
                } catch (apiErr: any) {
                    // If Backend is Down, fallback to Mock
                    console.warn("Backend Social Login Failed, falling back to mock", apiErr);
                    const mockUser = mockGoogleLogin(simulatedEmail, simulatedName);
                    handleAuthSuccess({ ...mockUser, token: 'mock-google-token' });
                }

            } catch (e) {
                console.error(e);
                setError("Google sign-in failed");
            } finally {
                setIsLoading(false);
            }
        }, 1000);
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim();

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await auth.signup({
                name,
                email: trimmedEmail,
                password,
                role,
                classLevel
            });

            if (response.verificationCode) {
                alert(`Your verification code is: ${response.verificationCode}`);
            }

            setSuccessMsg("Registration successful! Please check your email (or alert) for the verification code.");
            setViewMode('VERIFY');
        } catch (err: any) {
            // Fallback if Network Error or Server Error (500)
            const isNetworkError = err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response;
            if (isNetworkError || err.response?.status >= 500) {
                setIsOfflineMode(true);
                const result = mockSignup(name, trimmedEmail, password);
                if (result.success) {
                    setSuccessMsg(result.message);
                    setViewMode('VERIFY');
                } else {
                    setError(result.message);
                }
            } else {
                setError(err.response?.data?.message || "Signup failed.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const trimmedEmail = email.trim();

        try {
            await auth.verify(trimmedEmail, verificationCode);
            setSuccessMsg("Email verified successfully! Logging you in...");
            performAutoLogin(trimmedEmail);

        } catch (err: any) {
            // Fallback
            const isNetworkError = err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response;
            if (isNetworkError || err.response?.status >= 500) {
                setIsOfflineMode(true);
                const isValid = mockVerify(trimmedEmail, verificationCode);
                if (isValid) {
                    setSuccessMsg("Email verified (Offline Mode)! Logging you in...");
                    performAutoLogin(trimmedEmail);
                } else {
                    setError("Invalid code.");
                    setIsLoading(false);
                }
            } else {
                setError(err.response?.data?.message || "Invalid or expired verification code.");
                setIsLoading(false);
            }
        }
    };

    const performAutoLogin = (emailStr: string) => {
        setTimeout(async () => {
            try {
                // Try API
                const data = await auth.login(emailStr, password, UserRole.STUDENT);
                handleAuthSuccess(data);
            } catch (loginErr: any) {
                // Try Mock
                const isNetworkError = loginErr.message === 'Network Error' || !loginErr.response;
                if (isNetworkError || loginErr.response?.status >= 500) {
                    const { user: mockUser } = mockLogin(emailStr, UserRole.STUDENT, password);
                    if (mockUser) {
                        handleAuthSuccess({ ...mockUser, token: 'mock-token' });
                        return;
                    }
                }
                setError("Verification successful, but auto-login failed. Please login manually.");
                setViewMode('LOGIN');
                setIsLoading(false);
            }
        }, 1500);
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetStatus('LOADING');
        setResetMsg('');

        try {
            const res = await auth.forgotPassword(resetEmail);
            setResetStatus('SUCCESS');
            setResetMsg(res.message || "Password reset instructions sent.");
        } catch (err: any) {
            // Fallback
            const isNetworkError = err.message === 'Network Error' || !err.response;
            if (isNetworkError || err.response?.status >= 500) {
                const res = mockResetPassword(resetEmail);
                if (res.success) {
                    setResetStatus('SUCCESS');
                    setResetMsg(`(Offline Mode) New Password: ${res.newPassword}`);
                } else {
                    setResetStatus('ERROR');
                    setResetMsg(res.message);
                }
            } else {
                setResetStatus('ERROR');
                setResetMsg(err.response?.data?.message || "Failed to reset password.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-slate-50"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-50"></div>
            </div>

            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl relative z-10 border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto h-24 w-24 flex items-center justify-center mb-4">
                        <Logo className="h-20 w-auto" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {viewMode === 'LOGIN' ? t('login_welcome') : viewMode === 'SIGNUP' ? 'Create Account' : 'Verify Email'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        {viewMode === 'LOGIN' ? t('login_subtitle') : viewMode === 'SIGNUP' ? 'Join thousands of students' : `Enter code sent to ${email}`}
                    </p>
                </div>

                {/* Toggle between Login/Signup (Only for Students) */}
                {viewMode !== 'VERIFY' && (
                    <div className="flex justify-center border-b border-slate-200 mb-6">
                        <button
                            onClick={() => { setViewMode('LOGIN'); setError(null); }}
                            className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${viewMode === 'LOGIN' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setViewMode('SIGNUP'); setRole(UserRole.STUDENT); setError(null); }}
                            className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${viewMode === 'SIGNUP' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Sign Up
                        </button>
                    </div>
                )}

                {/* Role Selector - Available in both Login and Signup now */}
                {viewMode !== 'VERIFY' && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setRole(UserRole.STUDENT);
                                setError(null);
                                if (email === 'thef94089@gmail.com') {
                                    setEmail('');
                                    setPassword('');
                                }
                            }}
                            className={`py-3 px-4 rounded-xl flex items-center justify-center border-2 transition-all duration-200 ${role === UserRole.STUDENT ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <GraduationCap className="h-5 w-5 mr-2" />
                            <span className="font-semibold">{t('login_student')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRole(UserRole.TEACHER);
                                setError(null);
                                setEmail('');
                                setPassword('');
                            }}
                            className={`py-3 px-4 rounded-xl flex items-center justify-center border-2 transition-all duration-200 ${role === UserRole.TEACHER ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <BookOpen className="h-5 w-5 mr-2" />
                            <span className="font-semibold">{t('login_teacher')}</span>
                        </button>
                    </div>
                )}

                {isOfflineMode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start mb-4">
                        <WifiOff className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">Network unavailable. Running in <strong>Offline Mode</strong>. Some features may be limited.</p>
                    </div>
                )}

                {(error || successMsg) && (
                    <div className={`p-4 rounded-lg flex items-start ${error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                        {error ? <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />}
                        <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>{error || successMsg}</p>
                    </div>
                )}

                {viewMode === 'LOGIN' && (
                    <div className="space-y-6">
                        <form className="space-y-6" onSubmit={handleLoginSubmit}>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <button type="button" onClick={onCancel} className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center transition-colors">
                                    <ArrowLeft className="h-4 w-4 mr-1" /> {t('login_back')}
                                </button>
                                <button type="button" onClick={() => { setShowForgot(true); setResetStatus('IDLE'); setResetMsg(''); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                            >
                                {isLoading ? 'Signing In...' : t('login_btn')}
                            </button>
                        </form>

                        {role === UserRole.STUDENT && (
                            /* GOOGLE SIGN UP - UNCOMMENT TO ENABLE
                            <div className="mt-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-slate-500">Or continue with</span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                    onClick={handleGoogleLogin}
                                    type="button"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                                            <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                            />
                                            <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                            />
                                            <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                                            fill="#FBBC05"
                                            />
                                            <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                            />
                                        </svg>
                                        Sign in with Google
                                    </button>
                                </div>
                            </div>
                            */
                            <></>
                        )}
                    </div>
                )}

                {viewMode === 'SIGNUP' && (
                    <form className="mt-2 space-y-6" onSubmit={handleSignupSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                        {/* Only show Class Level selection if role is Student */}
                        {role === UserRole.STUDENT && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Class Level</label>
                                <select
                                    value={classLevel}
                                    onChange={(e) => setClassLevel(Number(e.target.value))}
                                    className="appearance-none block w-full px-3 py-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value={11}>Class 11</option>
                                    <option value={12}>Class 12</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                    placeholder={role === UserRole.TEACHER ? "teacher@example.com" : "student@example.com"}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                    placeholder="Create a strong password"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-start mt-2">
                            <button type="button" onClick={onCancel} className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center transition-colors">
                                <ArrowLeft className="h-4 w-4 mr-1" /> {t('login_back')}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>
                )}

                {viewMode === 'VERIFY' && (
                    <form className="mt-2 space-y-6" onSubmit={handleVerifySubmit}>
                        <div className="text-center mb-4">
                            <p className="text-sm text-slate-600">We've sent a verification code to <strong>{email}</strong>.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Verification Code</label>
                            <div className="relative">
                                <KeyRound className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm tracking-widest text-center text-lg"
                                    placeholder="123456"
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <button type="button" onClick={() => setViewMode('LOGIN')} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                                Back to Login
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                        >
                            {isLoading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>
                )}
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity" onClick={() => setShowForgot(false)}></div>
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full p-6 relative">
                            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                            <div className="text-center pt-2">
                                <h3 className="text-xl font-bold text-slate-900">Reset Password</h3>
                                <p className="text-sm text-slate-500 mt-2 mb-6">Enter your registered email address to receive a new password.</p>

                                {resetStatus === 'SUCCESS' ? (
                                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6">
                                        <CheckCircle2 className="h-6 w-6 mx-auto mb-2" />
                                        <p className="font-medium">{resetMsg}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleForgotSubmit}>
                                        {resetStatus === 'ERROR' && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
                                                {resetMsg}
                                            </div>
                                        )}
                                        <div className="mb-4 text-left">
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute top-3.5 left-3 h-5 w-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    required
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="you@example.com"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={resetStatus === 'LOADING'}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-70"
                                        >
                                            {resetStatus === 'LOADING' ? 'Sending...' : 'Send New Password'}
                                            {!resetStatus && <Send className="ml-2 h-4 w-4" />}
                                        </button>
                                    </form>
                                )}

                                <button onClick={() => setShowForgot(false)} className="mt-4 text-sm text-slate-500 hover:text-slate-700">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
