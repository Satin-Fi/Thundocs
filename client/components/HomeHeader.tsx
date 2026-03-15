import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HomeHeaderProps {
    className?: string;
}

/**
 * The top navigation bar used on the homepage and all content pages
 * (About, Privacy, Terms, Language, Help, Blog, etc.)
 */
export const HomeHeader: React.FC<HomeHeaderProps> = ({ className }) => {
    const { isAuthenticated, user } = useAuth();

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 ${className ?? ""}`}
        >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Zap className="w-5 h-5 text-white" fill="currentColor" />
                    </div>
                    <span className="font-heading text-lg font-bold text-white tracking-tight">
                        Thundocs
                    </span>
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link
                        to="/#tools"
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Tools
                    </Link>
                    <Link
                        to="/blog"
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Blog
                    </Link>
                    <Link
                        to="/about"
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        About
                    </Link>
                    <Link
                        to="/help"
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Help
                    </Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {isAuthenticated && user ? (
                        <Link to="/profile">
                            <Button
                                variant="outline"
                                className="hidden md:flex border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white transition-all text-zinc-300 gap-2"
                            >
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="w-5 h-5 rounded-full"
                                />
                                {user.name.split(" ")[0]}
                            </Button>
                        </Link>
                    ) : (
                        <Link to="/signin">
                            <Button
                                variant="outline"
                                className="hidden md:flex border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white transition-all text-zinc-300"
                            >
                                <LogIn className="w-4 h-4 mr-2" />
                                Sign In
                            </Button>
                        </Link>
                    )}
                    <Link to="/#tools">
                        <Button
                            variant="outline"
                            className="hidden md:flex border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-white transition-all text-zinc-300"
                        >
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
};
