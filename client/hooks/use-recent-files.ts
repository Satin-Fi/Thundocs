import { useState, useEffect, useCallback } from 'react';

export interface RecentFile {
    id: string;
    name: string;
    tool: string;
    toolPath: string;
    processedAt: number; // epoch ms
    inputSize: number;   // bytes
}

const MAX_RECENT = 20;

function storageKey(userId: string) {
    return `thundocs_recent_${userId}`;
}

function loadFiles(userId: string): RecentFile[] {
    try {
        const raw = localStorage.getItem(storageKey(userId));
        if (!raw) return [];
        return JSON.parse(raw) as RecentFile[];
    } catch {
        return [];
    }
}

function saveFiles(userId: string, files: RecentFile[]) {
    try {
        localStorage.setItem(storageKey(userId), JSON.stringify(files));
    } catch {
        // quota exceeded – silently ignore
    }
}

export function useRecentFiles(userId: string | null) {
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

    useEffect(() => {
        if (!userId) {
            setRecentFiles([]);
            return;
        }
        setRecentFiles(loadFiles(userId));
    }, [userId]);

    const addRecentFile = useCallback(
        (entry: Omit<RecentFile, 'id' | 'processedAt'>) => {
            if (!userId) return;

            setRecentFiles((prev) => {
                // Remove older duplicate with same name+tool
                const filtered = prev.filter(
                    (f) => !(f.name === entry.name && f.tool === entry.tool)
                );
                const newEntry: RecentFile = {
                    ...entry,
                    id: Math.random().toString(36).substring(2),
                    processedAt: Date.now(),
                };
                const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
                saveFiles(userId, updated);
                return updated;
            });
        },
        [userId]
    );

    const clearHistory = useCallback(() => {
        if (!userId) return;
        localStorage.removeItem(storageKey(userId));
        setRecentFiles([]);
    }, [userId]);

    return { recentFiles, addRecentFile, clearHistory };
}
