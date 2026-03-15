import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CredentialResponse } from '@react-oauth/google';

interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
    // Future API support fields
    apiKey?: string;
    apiUsage?: {
        totalRequests: number;
        monthlyLimit: number;
    };
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    signIn: (credentialResponse: CredentialResponse) => void;
    signOut: () => void;
    // Future API methods (placeholder)
    generateApiKey?: () => Promise<string>;
    revokeApiKey?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('Thundocs_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('Thundocs_user');
            }
        }
    }, []);

    const signIn = (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            // Decode JWT token to get user info
            const base64Url = credentialResponse.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );

            const payload = JSON.parse(jsonPayload);

            const newUser: User = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
            };

            setUser(newUser);
            localStorage.setItem('Thundocs_user', JSON.stringify(newUser));
        }
    };

    const signOut = () => {
        setUser(null);
        localStorage.removeItem('Thundocs_user');
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
