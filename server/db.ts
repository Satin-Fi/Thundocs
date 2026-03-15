import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.resolve(process.cwd(), "server/data/db.json");

export interface Account {
    id: string;
    name: string;
    tier: "free" | "business" | "enterprise";
    monthlyLimit: number;
}

export interface ApiKey {
    hashedKey: string;
    accountId: string;
    createdAt: string;
}

export interface Usage {
    [accountId: string]: {
        requests: number;
        lastReset: string;
    };
}

export interface OcrEvent {
    id: string;
    engine: "gemini" | "tesseract";
    fileType: "pdf" | "image";
    pagesProcessed: number;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
    timestamp: string;
}

export class Database {
    private static load() {
        if (!fs.existsSync(DB_PATH)) {
            const initial = { accounts: [], keys: [], usage: {}, ocrEvents: [] };
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
            fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
            return initial;
        }
        const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
        if (!data.ocrEvents) data.ocrEvents = [];
        return data;
    }

    private static save(data: any) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    }

    static hashKey(key: string): string {
        return crypto.createHash("sha256").update(key).digest("hex");
    }

    static getAccountByKey(rawKey: string): { account: Account; hashedKey: string } | null {
        const data = this.load();
        const hashed = this.hashKey(rawKey);
        const keyEntry = data.keys.find((k: ApiKey) => k.hashedKey === hashed);
        if (!keyEntry) return null;

        const account = data.accounts.find((a: Account) => a.id === keyEntry.accountId);
        return account ? { account, hashedKey: hashed } : null;
    }

    static trackUsage(accountId: string): boolean {
        const data = this.load();
        const account = data.accounts.find((a: Account) => a.id === accountId);
        if (!account) return false;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

        if (!data.usage[accountId] || data.usage[accountId].lastReset !== currentMonth) {
            data.usage[accountId] = { requests: 0, lastReset: currentMonth };
        }

        if (data.usage[accountId].requests >= account.monthlyLimit) {
            return false; // Quota exceeded
        }

        data.usage[accountId].requests++;
        this.save(data);
        return true;
    }

    static logOcrEvent(event: Omit<OcrEvent, "id" | "timestamp">) {
        const data = this.load();
        const newEvent: OcrEvent = {
            ...event,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
        data.ocrEvents.unshift(newEvent); // newest first
        // Keep last 500 events
        if (data.ocrEvents.length > 500) data.ocrEvents = data.ocrEvents.slice(0, 500);
        this.save(data);
        return newEvent;
    }

    static getOcrStats() {
        const data = this.load();
        const events: OcrEvent[] = data.ocrEvents || [];
        const total = events.length;
        const gemini = events.filter(e => e.engine === "gemini").length;
        const tesseract = events.filter(e => e.engine === "tesseract").length;
        const successful = events.filter(e => e.success).length;
        const avgDuration = total > 0
            ? Math.round(events.reduce((s, e) => s + e.durationMs, 0) / total)
            : 0;
        return {
            total,
            gemini,
            tesseract,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
            avgDurationMs: avgDuration,
            recentEvents: events.slice(0, 50),
        };
    }

    // Admin method to seed a test account
    static seedTestAccount() {
        const data = this.load();
        if (data.accounts.length > 0) return;

        const testAccount: Account = {
            id: "acc_test_123",
            name: "Thundocs Test Biz",
            tier: "business",
            monthlyLimit: 1000
        };

        const rawKey = "ph_test_key_abc_123";
        const hashedKey = this.hashKey(rawKey);

        data.accounts.push(testAccount);
        data.keys.push({
            hashedKey,
            accountId: testAccount.id,
            createdAt: new Date().toISOString()
        });

        this.save(data);
        console.log(`✅ Seeded test account. API Key: ${rawKey}`);
    }
}
