import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThundocsLogo } from "@/components/ThundocsLogo";
import { AlertCircle, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { themeStyles } = useTheme();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="hero-group relative min-h-screen overflow-hidden bg-[#020408]">
      {/* Ambient lightning background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(rgba(0,240,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute -top-40 -left-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #00f0ff 0%, #0055ff 40%, transparent 70%)",
          }}
        />
        <div className="absolute top-[55%] left-1/2 w-[820px] h-[820px] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg]">
          <svg
            viewBox="0 0 512 512"
            className="thunder-bolt-svg hero-bolt w-full h-full"
          >
            <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Minimal header – Thundocs white logo */}
      <header className="relative z-10 px-4 pt-6">
        <div className="container mx-auto flex items-center justify-start">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <ThundocsLogo className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">
              Thundocs
            </span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <Card className={`${themeStyles.cardBg} ${themeStyles.cardBorder} max-w-md w-full shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-white/5 border-white/15 rounded-3xl`}>
          <CardContent className="p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
            </div>
            <h1 className={`text-5xl font-bold mb-3 ${themeStyles.text}`}>404</h1>
            <p className={`text-sm uppercase tracking-[0.25em] text-cyan-300 mb-4`}>
              Lost in the matrix
            </p>
            <p className={`text-base mb-8 ${themeStyles.secondaryText}`}>
              The page you were looking for doesn&apos;t exist or has moved. Let&apos;s get you back to safety.
            </p>
            <Link to="/">
              <Button
                variant="outline"
                className="group relative w-full h-11 rounded-full border border-white/25 bg-white/10 text-white font-semibold text-sm backdrop-blur-md flex items-center justify-center gap-2 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Home</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
