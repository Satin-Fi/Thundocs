import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Home } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface HeaderProps {
    toolName?: string;
    className?: string;
}

export const Header: React.FC<HeaderProps> = ({ toolName, className }) => {
    const { setTheme, themeStyles, isNight } = useTheme();

    return (
        <header
            className={cn(
                "sticky top-0 z-50 border-b backdrop-blur-xl",
                themeStyles.headerBorder,
                themeStyles.headerBg,
                className
            )}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo and Brand */}
                    <Link
                        to="/"
                        className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
                    >
                        {/* Modern Logo Container */}
                        <div className="relative">
                            <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-all duration-500 animate-pulse"></div>
                            <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 rounded-xl shadow-lg">
                                <svg
                                    className="w-6 h-6 text-white"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M9 9L15 15M15 9L9 15"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Brand Name */}
                        <div className="flex flex-col">
                            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                                Thundocs
                            </span>
                            {toolName && (
                                <span className={cn("text-xs font-medium", themeStyles.secondaryText)}>
                                    {toolName}
                                </span>
                            )}
                        </div>
                    </Link>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {/* Home Button (only show on tool pages) */}
                        {toolName && (
                            <Link to="/">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "rounded-xl transition-all duration-300",
                                        themeStyles.buttonGhost,
                                        "hover:scale-110"
                                    )}
                                >
                                    <Home className="h-5 w-5" />
                                </Button>
                            </Link>
                        )}

                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(isNight ? "day" : "night")}
                            className={cn(
                                "rounded-xl transition-all duration-300",
                                themeStyles.buttonGhost,
                                "hover:scale-110 hover:rotate-12"
                            )}
                        >
                            {isNight ? (
                                <Sun className="h-5 w-5 text-amber-400" />
                            ) : (
                                <Moon className="h-5 w-5 text-indigo-400" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};
