import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft } from 'lucide-react';
import ModernBackground from '@/components/ModernBackground';

export default function SignIn() {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSuccess = (credentialResponse: any) => {
        signIn(credentialResponse);
        navigate('/');
    };

    const handleError = () => {
        console.error('Google Sign-In failed');
    };

    return (
        <div className="min-h-screen bg-zinc-950 font-sans selection:bg-white/20 flex items-center justify-center px-6">
            <ModernBackground className="bg-zinc-950" gradientColor="radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(9, 9, 11, 0) 70%)" />

            <div className="relative z-10 w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Back to Home */}
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>

                    {/* Card */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
                        {/* Logo & Title */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="p-3 rounded-xl bg-white/5 mb-4">
                                <Zap className="w-8 h-8 text-white" fill="currentColor" />
                            </div>
                            <h1 className="text-3xl font-heading font-bold text-white mb-2">
                                Welcome to Thundocs
                            </h1>
                            <p className="text-zinc-400 text-center">
                                Sign in to access your documents and preferences
                            </p>
                        </div>

                        {/* Google Sign-In Button */}
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={handleError}
                                theme="filled_black"
                                size="large"
                                text="signin_with"
                                shape="rectangular"
                                logo_alignment="left"
                            />
                        </div>

                        {/* Features */}
                        <div className="mt-8 pt-8 border-t border-zinc-800">
                            <p className="text-zinc-500 text-sm text-center mb-4">
                                Benefits of signing in:
                            </p>
                            <ul className="space-y-2 text-sm text-zinc-400">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                    Save your document preferences
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                    Track your file processing history
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                    Access premium features (coming soon)
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                    API access for developers (coming soon)
                                </li>
                            </ul>
                        </div>

                        {/* Privacy Note */}
                        <p className="mt-6 text-xs text-zinc-600 text-center">
                            We respect your privacy. Your data is never shared with third parties.
                            <br />
                            <Link to="/privacy" className="text-zinc-500 hover:text-zinc-400 underline">
                                Privacy Policy
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
