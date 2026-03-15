import React, { useRef, useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Monitor, Cloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CloudPickerMenuProps {
    onFilesSelected: (files: File[]) => void;
    trigger: React.ReactNode;
    multiple?: boolean;
    accept?: string;
    className?: string;
}

export function CloudPickerMenu({
    onFilesSelected,
    trigger,
    multiple = true,
    accept = ".pdf",
    className,
}: CloudPickerMenuProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [googleDriveReady, setGoogleDriveReady] = useState(false);
    const [dropboxReady, setDropboxReady] = useState(false);

    useEffect(() => {
        // --- Initialize Google Drive Scripts ---
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

        if (clientId && apiKey) {
            let gapiLoaded = false;
            let gisLoaded = false;

            const checkGoogleReady = () => {
                if (gapiLoaded && gisLoaded) setGoogleDriveReady(true);
            };

            // Load GAPI (for Picker API)
            if (!(window as any).gapi) {
                const script = document.createElement("script");
                script.src = "https://apis.google.com/js/api.js";
                script.onload = () => {
                    (window as any).gapi.load('picker', () => {
                        gapiLoaded = true;
                        checkGoogleReady();
                    });
                };
                document.body.appendChild(script);
            } else {
                (window as any).gapi.load('picker', () => {
                    gapiLoaded = true;
                    checkGoogleReady();
                });
            }

            // Load GIS (for Authentication)
            if (!(window as any).google?.accounts) {
                const script = document.createElement("script");
                script.src = "https://accounts.google.com/gsi/client";
                script.onload = () => {
                    gisLoaded = true;
                    checkGoogleReady();
                };
                document.body.appendChild(script);
            } else {
                gisLoaded = true;
                checkGoogleReady();
            }
        }

        // --- Initialize Dropbox Script ---
        const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;
        if (appKey) {
            if (!(window as any).Dropbox) {
                const script = document.createElement("script");
                script.src = "https://www.dropbox.com/static/api/2/dropins.js";
                script.id = "dropboxjs";
                script.setAttribute("data-app-key", appKey);
                script.onload = () => setDropboxReady(true);
                document.body.appendChild(script);
            } else {
                setDropboxReady(true);
            }
        }
    }, []);

    // ── Local File Upload ───────────────────────────────────────────────
    const handleLocalClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Google Drive Integration ────────────────────────────────────────
    const handleGoogleDrive = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

        if (!clientId || !apiKey) {
            toast({
                title: "Integration Required",
                description: "Google Drive requires VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in your .env file.",
                variant: "destructive",
            });
            return;
        }

        if (!googleDriveReady) {
            toast({
                title: "Loading Google Drive",
                description: "Please wait a moment while Google Drive initializes...",
            });
            return;
        }

        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    showGooglePicker(tokenResponse.access_token, apiKey);
                } else if (tokenResponse?.error) {
                    toast({ title: "Google Drive Error", description: tokenResponse.error_description || "Authentication failed", variant: "destructive" });
                }
            },
        });

        // Request access token MUST be synchronous to user click
        tokenClient.requestAccessToken();
    };

    const showGooglePicker = (oauthToken: string, apiKey: string) => {
        const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS);
        view.setIncludeFolders(true);

        const pickerBuilder = new (window as any).google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(oauthToken)
            .setDeveloperKey(apiKey)
            .setCallback(async (data: any) => {
                if (data.action === (window as any).google.picker.Action.PICKED) {
                    toast({ title: "Downloading...", description: "Fetching files from Google Drive." });
                    try {
                        const fetchedFiles = await Promise.all(
                            data.docs.map(async (doc: any) => {
                                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
                                    headers: { Authorization: `Bearer ${oauthToken}` }
                                });
                                if (!res.ok) throw new Error("Could not download file");
                                const blob = await res.blob();
                                return new File([blob], doc.name, {
                                    type: doc.mimeType || "application/pdf",
                                });
                            })
                        );
                        onFilesSelected(fetchedFiles);
                        toast({ title: "Success", description: "Files added from Google Drive." });
                    } catch (err) {
                        toast({
                            title: "Download Failed",
                            description: "Could not fetch files from Google Drive. Ensure you have the Drive API enabled.",
                            variant: "destructive",
                        });
                    }
                }
            });

        if (multiple) {
            pickerBuilder.enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED);
        }

        const picker = pickerBuilder.build();
        picker.setVisible(true);
    };

    // ── Dropbox Integration ─────────────────────────────────────────────
    const getDropboxExtensions = (acceptStr: string) => {
        if (acceptStr.includes("image/*")) return ["images"];
        if (acceptStr.includes("video/*")) return ["video"];
        if (acceptStr.includes("audio/*")) return ["audio"];
        return acceptStr.split(",").map((ext) => ext.trim());
    };

    const handleDropbox = () => {
        const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;

        if (!appKey) {
            toast({
                title: "Integration Required",
                description: "Dropbox requires VITE_DROPBOX_APP_KEY in your .env file.",
                variant: "destructive",
            });
            return;
        }

        if (!dropboxReady || !(window as any).Dropbox) {
            toast({
                title: "Initializing",
                description: "Please reload the page (F5) so Dropbox Chooser can detect your App Key.",
            });
            return;
        }

        // Launch Dropbox Chooser synchronously to user click
        (window as any).Dropbox.choose({
            success: async (dbFiles: any[]) => {
                try {
                    toast({ title: "Downloading...", description: "Fetching files from Dropbox." });
                    const fetchedFiles = await Promise.all(
                        dbFiles.map(async (f: any) => {
                            const res = await fetch(f.link);
                            const blob = await res.blob();
                            return new File([blob], f.name, {
                                type: blob.type || "application/pdf",
                            });
                        })
                    );
                    onFilesSelected(fetchedFiles);
                    toast({ title: "Success", description: "Files added from Dropbox." });
                } catch (err) {
                    toast({
                        title: "Download Failed",
                        description: "Could not fetch files from Dropbox.",
                        variant: "destructive",
                    });
                }
            },
            cancel: () => { },
            linkType: "direct",
            multiselect: multiple,
            extensions: getDropboxExtensions(accept),
        });
    };

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple={multiple}
                className="hidden"
                accept={accept}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {trigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56 glass-panel border border-white/20 bg-slate-900/90 backdrop-blur-2xl shadow-2xl rounded-xl z-50 p-1"
                >
                    <DropdownMenuItem
                        onClick={handleLocalClick}
                        className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg focus:bg-white/10 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-200">
                            Upload from Computer
                        </span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10 my-1 mx-2" />

                    <DropdownMenuItem
                        onClick={handleGoogleDrive}
                        className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg focus:bg-white/10 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-inner relative" title={!googleDriveReady ? "Still loading..." : ""}>
                            <img
                                src="/icons/gdrive.png"
                                alt="Google Drive"
                                className="w-4 h-4 object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                }}
                            />
                            <Cloud className="w-4 h-4 text-emerald-400 hidden" />
                            {!googleDriveReady && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <span className="text-sm font-medium text-slate-200">
                            Google Drive
                        </span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={handleDropbox}
                        className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg focus:bg-white/10 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-inner relative" title={!dropboxReady ? "Still loading..." : ""}>
                            <img
                                src="/icons/dropbox.png"
                                alt="Dropbox"
                                className="w-4 h-4 object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                }}
                            />
                            <Cloud className="w-4 h-4 text-blue-400 hidden" />
                            {!dropboxReady && import.meta.env.VITE_DROPBOX_APP_KEY && (
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <span className="text-sm font-medium text-slate-200">Dropbox</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
