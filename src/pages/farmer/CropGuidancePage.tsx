import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { getUserProfile } from "@/lib/supabase-auth";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Loader2, Sprout, Send, ExternalLink, Youtube,
    Plus, Paperclip, ChevronDown,
    Leaf, Droplets, Sun, Menu, X, MessageSquare, Globe2, Trash2
} from "lucide-react";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Storage keys ────────────────────────────────────────────────────────────
const SESSIONS_KEY = "krishimitra_sessions_v3";
const ACTIVE_KEY   = "krishimitra_active_v3";

// ─── Types ───────────────────────────────────────────────────────────────────
type FarmerCtx = { soilType: string; season: string; landType: string; farmingType: string };

interface YoutubeLink { title: string; url: string }

interface ChatImage {
    name: string;
    mimeType: string;
    dataUrl: string;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    links?: YoutubeLink[];
    marathiContent?: string;
    images?: ChatImage[];
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: ChatMessage[];
    ctx: FarmerCtx;
}

// ─── Persistence ─────────────────────────────────────────────────────────────
const loadSessions  = (): ChatSession[] => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]") ?? []; } catch { return []; } };
const saveSessions  = (s: ChatSession[]) => { try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)); } catch { /**/ } };
const loadActiveId  = (): string | null   => localStorage.getItem(ACTIVE_KEY);
const saveActiveId  = (id: string)        => localStorage.setItem(ACTIVE_KEY, id);

function newSession(ctx: FarmerCtx): ChatSession {
    const id  = Date.now().toString();
    const now = new Date().toISOString();
    return {
        id, title: "New conversation", createdAt: now, updatedAt: now, ctx,
        messages: [{
            id: "welcome-" + id, role: "assistant", timestamp: now, links: [],
            content: `Hello! I'm KrishiMitra, your AI farming assistant.\n\nI can help you with:\n- Crop selection & sowing schedules\n- Fertilizer & irrigation advice\n- Pest and disease management\n- Government schemes & subsidies\n- Post-harvest storage tips\n\n${ctx.soilType ? `Your soil: ${ctx.soilType}. ` : ""}${ctx.season ? `Season: ${ctx.season}.` : ""}\n\nUse the 🌐 translate button to switch the entire conversation to Marathi.`,
        }],
    };
}

// ─── Rich text renderer ───────────────────────────────────────────────────────
function RichText({ content, isUser }: { content: string; isUser: boolean }) {
    if (isUser) return <span className="whitespace-pre-wrap text-[13px] leading-relaxed">{content}</span>;

    const renderInline = (text: string, baseKey: number): React.ReactNode => {
        const parts: React.ReactNode[] = [];
        const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
        let last = 0, m: RegExpExecArray | null, k = 0;
        while ((m = re.exec(text)) !== null) {
            if (m.index > last) parts.push(<span key={baseKey + k++}>{text.slice(last, m.index)}</span>);
            parts.push(<strong key={baseKey + k++} className="font-semibold text-zinc-800 dark:text-zinc-200">{m[1] ?? m[2]}</strong>);
            last = m.index + m[0].length;
        }
        if (last < text.length) parts.push(<span key={baseKey + k++}>{text.slice(last)}</span>);
        return parts.length ? <>{parts}</> : <>{text}</>;
    };

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const raw = lines[i], t = raw.trim();
        if (!t) { elements.push(<div key={i} className="h-1.5" />); i++; continue; }

        // Section heading: "1. Title Words"
        const sectionMatch = t.match(/^(\d+)\.\s+([A-Z].{2,60})$/);
        if (sectionMatch) {
            elements.push(
                <div key={i} className="flex items-center gap-2 mt-3.5 mb-1 first:mt-1">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex-shrink-0">{sectionMatch[1]}</span>
                    <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">{sectionMatch[2]}</span>
                </div>
            );
            i++; continue;
        }
        // Numbered step with inline content
        const stepMatch = t.match(/^(\d+)\.\s+(.+)/);
        if (stepMatch) {
            elements.push(
                <div key={i} className="flex items-start gap-2 my-0.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex-shrink-0 mt-0.5">{stepMatch[1]}</span>
                    <span className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{renderInline(stepMatch[2], i * 100)}</span>
                </div>
            );
            i++; continue;
        }
        // Bullet
        if (/^[-•*]\s/.test(t)) {
            elements.push(
                <div key={i} className="flex items-start gap-2 my-0.5 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-[6px]" />
                    <span className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{renderInline(t.replace(/^[-•*]\s/, ""), i * 100)}</span>
                </div>
            );
            i++; continue;
        }
        // Warning / Note
        const warnMatch = t.match(/^(Warning|Caution|Note|Important)\s*[:–-]\s*(.+)/i);
        if (warnMatch) {
            elements.push(
                <div key={i} className="flex items-start gap-2 my-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex-shrink-0 mt-0.5">{warnMatch[1]}</span>
                    <span className="text-[13px] leading-relaxed text-amber-800 dark:text-amber-300">{renderInline(warnMatch[2], i * 100)}</span>
                </div>
            );
            i++; continue;
        }
        // Normal line
        elements.push(<p key={i} className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300 my-0.5">{renderInline(raw, i * 100)}</p>);
        i++;
    }
    return <div>{elements}</div>;
}

// ─── Gemini API ───────────────────────────────────────────────────────────────
function getApiKeys(): string[] {
    const numberedKeys = Object.entries(import.meta.env)
        .filter(([k, v]) => /^VITE_GEMINI_API_KEY\d+$/i.test(k) && Boolean(v))
        .sort((a, b) => {
            const ai = Number(a[0].match(/(\d+)$/)?.[1] ?? 0);
            const bi = Number(b[0].match(/(\d+)$/)?.[1] ?? 0);
            return ai - bi;
        })
        .map(([, v]) => String(v));

    const raw = [
        import.meta.env.VITE_GEMINI_API_KEYS,
        import.meta.env.VITE_GEMINI_API_KEY,
        ...numberedKeys,
        import.meta.env.VITE_GOOGLE_AI_API_KEY,
        import.meta.env.VITE_GOOGLE_API_KEY,
    ]
        .filter(Boolean)
        .map((v) => String(v));

    const parsed = raw
        .flatMap((v) => v.split(/[\n,;]+/g))
        .map((v) => v.trim())
        .filter(Boolean);

    return Array.from(new Set(parsed));
}
const rate = { calls: [] as number[], lastAt: 0, blockedUntil: 0 };
function checkRate() {
    const now = Date.now();
    if (rate.blockedUntil > now) throw new Error(`Quota exhausted. Retry in ${Math.ceil((rate.blockedUntil - now) / 1000)}s.`);
    if (rate.lastAt && now - rate.lastAt < 2500) throw new Error(`Wait ${Math.ceil((2500 - (now - rate.lastAt)) / 1000)}s.`);
    rate.calls = rate.calls.filter(t => now - t < 60000);
    if (rate.calls.length >= 10) throw new Error(`Rate limit. Retry in ${Math.ceil((60000 - (now - rate.calls[0])) / 1000)}s.`);
    rate.calls.push(now); rate.lastAt = now;
}
const modelCacheByKey = new Map<string, string[]>();
async function getModels(key: string) {
    const cached = modelCacheByKey.get(key);
    if (cached) return cached;
    const found = new Set<string>();
    for (const v of ["v1", "v1beta"]) {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${key}`);
            if (!r.ok) continue;
            for (const m of (await r.json())?.models ?? []) {
                const methods: string[] = m?.supportedGenerationMethods ?? m?.supported_generation_methods ?? [];
                if (methods.some((x: string) => x.toLowerCase() === "generatecontent")) {
                    const n = String(m?.name ?? "").replace(/^models\//, "").trim();
                    if (n) found.add(n);
                }
            }
        } catch { /**/ }
    }
    const models = Array.from(found);
    modelCacheByKey.set(key, models);
    return models;
}
function parseLinks(text: string): { text: string; links: YoutubeLink[] } {
    const links: YoutubeLink[] = [];
    const re = /\[YT::([^:]+)::([^\]]+)\]/g;
    let m;
    while ((m = re.exec(text)) !== null)
        links.push({ title: m[1].trim(), url: `https://www.youtube.com/results?search_query=${encodeURIComponent(m[2].trim())}` });
    return { text: text.replace(re, "").replace(/\n{3,}/g, "\n\n").trim(), links };
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(file);
    });
}

function imageToInlinePart(img: ChatImage) {
    const base64 = img.dataUrl.split(",")[1] ?? "";
    return {
        inlineData: {
            mimeType: img.mimeType,
            data: base64,
        },
    };
}

async function callGemini(contents: any[], key: string, cfg?: any): Promise<string> {
    const pref = (import.meta.env.VITE_GEMINI_MODEL ?? "").replace(/^models\//, "").trim();
    const disc = await getModels(key);
    const candidates = [...new Set([pref, ...disc, "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash-latest", "gemini-1.5-flash"].filter(Boolean))];
    let lastErr = "";
    for (const model of candidates) {
        for (const v of ["v1", "v1beta"]) {
            const url = new URL(`https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent`);
            url.searchParams.set("key", key);
            const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, generationConfig: { temperature: 0.65, maxOutputTokens: 2048, ...cfg } }) });
            if (res.ok) { const d = await res.json(); return (d?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("\n").trim() || "No response."; }
            const err = await res.json().catch(() => ({}));
            const msg = err?.error?.message ?? `Error ${res.status}`; lastErr = msg;
            const lower = msg.toLowerCase();
            if (res.status === 429 || lower.includes("quota") || lower.includes("rate")) { const mt = msg.match(/retry\s+in\s+([\d.]+)s?/i); if (mt) rate.blockedUntil = Date.now() + Number(mt[1]) * 1000; continue; }
            if (res.status !== 404 && !(lower.includes("model") && lower.includes("not"))) throw new Error(msg);
        }
    }
    throw new Error(lastErr || "No compatible Gemini model.");
}
async function askGemini(messages: ChatMessage[], ctx: FarmerCtx): Promise<{ text: string; links: YoutubeLink[] }> {
    checkRate();
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error("Gemini API key missing. Set VITE_GEMINI_API_KEYS, or VITE_GEMINI_API_KEY, or VITE_GEMINI_API_KEY1..VITE_GEMINI_API_KEYN in .env");
    const system = `You are KrishiMitra, an expert AI farming assistant. ONLY answer about farming, crops, soil, irrigation, fertilizers, pests, post-harvest, agri schemes, weather on crops, organic farming. Politely decline unrelated questions.
Farmer context: Soil: ${ctx.soilType || "Unknown"} | Season: ${ctx.season || "Unknown"} | Land: ${ctx.landType || "Unknown"} | Farming: ${ctx.farmingType || "Unknown"}
Format rules: Use "1. Section Title" for section headings. Use "- item" for bullets. Use **term** for key terms. Use "Warning: text" for cautions. NEVER use ##. Keep quantities explicit. End with 1 follow-up question if info missing.
Video: [YT::title::youtube search query] — add 1–3 inline. English only.`;
    const history = messages.slice(-10).map((m) => {
        const parts: any[] = [];
        if (m.content?.trim()) parts.push({ text: m.content });
        if (m.role === "user" && Array.isArray(m.images) && m.images.length > 0) {
            parts.push(...m.images.map(imageToInlinePart));
        }
        if (parts.length === 0) parts.push({ text: "No text content." });
        return { role: m.role === "user" ? "user" : "model", parts };
    });

    let lastErr = "";
    for (const key of keys) {
        try {
            const raw = await callGemini([{ role: "user", parts: [{ text: system }] }, ...history], key);
            return parseLinks(raw);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");
            lastErr = msg;
            const lower = msg.toLowerCase();

            const shouldTryNextKey =
                lower.includes("api key") ||
                lower.includes("invalid") ||
                lower.includes("permission") ||
                lower.includes("forbidden") ||
                lower.includes("unauthenticated") ||
                lower.includes("quota") ||
                lower.includes("rate") ||
                lower.includes("exceed") ||
                lower.includes("429") ||
                lower.includes("401") ||
                lower.includes("403");

            if (!shouldTryNextKey) {
                throw err;
            }
        }
    }

    throw new Error(`All Gemini API keys failed. Last error: ${lastErr || "Unknown error"}`);
}

// Translate a single string line-by-line via Google Translate free endpoint
async function translateText(text: string): Promise<string> {
    const lines = text.split("\n");
    const results = await Promise.all(lines.map(async (line) => {
        if (!line.trim()) return "";
        try {
            const url = new URL("https://translate.googleapis.com/translate_a/single");
            url.searchParams.set("client", "gtx"); url.searchParams.set("sl", "en");
            url.searchParams.set("tl", "mr"); url.searchParams.set("dt", "t"); url.searchParams.set("q", line);
            const res = await fetch(url.toString());
            if (!res.ok) return line;
            const data = await res.json();
            return Array.isArray(data?.[0]) ? data[0].map((c: any) => c?.[0] ?? "").join("") : line;
        } catch { return line; }
    }));
    return results.join("\n");
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, showMarathi }: { msg: ChatMessage; showMarathi: boolean }) {
    const isUser = msg.role === "user";
    const display = showMarathi && msg.marathiContent ? msg.marathiContent : msg.content;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isUser) {
        return (
            <div className="flex justify-end mb-3 px-3 sm:px-5">
                <div className="max-w-[75%] sm:max-w-[65%]">
                    <div className="bg-emerald-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
                        <span className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</span>
                        {Array.isArray(msg.images) && msg.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {msg.images.map((img, idx) => (
                                    <img
                                        key={`${msg.id}-img-${idx}`}
                                        src={img.dataUrl}
                                        alt={img.name || `uploaded-${idx + 1}`}
                                        className="w-full h-20 object-cover rounded-lg border border-white/20"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-zinc-400 text-right mt-1 pr-1">{time}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-2.5 mb-4 px-3 sm:px-5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Sprout className="w-4 h-4 text-white" />   
            </div>
            <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                    <RichText content={display} isUser={false} />
                </div>
                {/* YouTube links — emerald themed */}
                {msg.links && msg.links.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                        {msg.links.map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3 py-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group">
                                <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Youtube className="w-3 h-3 text-white" />
                                </div>
                                <p className="flex-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">{link.title}</p>
                                <ExternalLink className="w-3 h-3 text-emerald-500 flex-shrink-0 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors" />
                            </a>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-zinc-400 mt-1.5 pl-0.5">{time}</p>
            </div>
        </div>
    );
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ icon, label, value, onChange, placeholder, options }: {
    icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void;
    placeholder: string; options: { value: string; label: string }[];
}) {
    const selected = options.find(o => o.value === value);
    return (
        <div className="flex-1 min-w-0">
            <Select value={value || "all"} onValueChange={v => onChange(v === "all" ? "" : v)}>
                <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 w-full">
                    <div className="flex items-center gap-2 w-full">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            {icon}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-0.5 hidden sm:block">{label}</p>
                            <div className="flex items-center gap-1">
                                <span className="text-[12px] sm:text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 truncate capitalize">
                                    {selected?.label ?? <span className="text-zinc-400 font-normal text-xs">{placeholder}</span>}
                                </span>
                                <ChevronDown className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                            </div>
                        </div>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{placeholder}</SelectItem>
                    {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarContent({ sessions, activeId, onSelect, onNewChat, onClose, onSessionsUpdate }: {
    sessions: ChatSession[]; activeId: string;
    onSelect: (id: string) => void; onNewChat: () => void;
    onSessionsUpdate: (sessions: ChatSession[]) => void;
    onClose?: () => void;
}) {
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const sorted = [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    const handleDeleteChat = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        saveSessions(updatedSessions);
        onSessionsUpdate(updatedSessions);
        
        // Clear deletion confirmation immediately
        setDeleteConfirm(null);
        
        // If deleted session was active, switch to first remaining session
        if (activeId === sessionId && updatedSessions.length > 0) {
            onSelect(updatedSessions[0].id);
        } else if (updatedSessions.length === 0) {
            // If no sessions left, create a new one
            onNewChat();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 sm:py-5 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                        <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-zinc-900 dark:text-white font-bold text-[15px] tracking-tight">KrishiMitra</span>
                </div>
                {onClose && (
                    <button type="button" title="Close sidebar" aria-label="Close sidebar" onClick={onClose} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* New chat */}
            <div className="px-3 py-3 flex-shrink-0">
                <button type="button" onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition-all">
                    <Plus className="w-3.5 h-3.5" /> New Chat
                </button>
            </div>

            {/* Recent chats */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.12em] px-1.5 mb-2">Recent chats</p>
                <div className="space-y-1">
                    {sorted.map(s => {
                        const preview = s.messages.find(m => m.role === "user")?.content ?? "New conversation";
                        const time = new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const isActive = s.id === activeId;
                        return (
                            <div key={s.id} className="group flex items-start gap-2 rounded-xl px-3 py-3 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{backgroundColor: isActive ? 'var(--emerald-100)' : 'transparent'}}>
                                <button type="button" onClick={() => { onSelect(s.id); onClose?.(); }}
                                    className="flex-1 flex items-start gap-2.5 text-left min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-emerald-200 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Sprout className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className="text-[13px] font-semibold text-zinc-900 dark:text-white flex-shrink-0">KrishiMitra</span>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">{time}</span>
                                        </div>
                                        <p className="text-[12px] text-zinc-600 dark:text-zinc-400 line-clamp-2 break-words">{preview.slice(0, 50)}{preview.length > 50 ? "…" : ""}</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s.id); }}
                                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                    {sorted.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">No conversations yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl p-6 mx-4 max-w-md border-2 border-emerald-500 dark:border-emerald-600" onClick={(e) => e.stopPropagation()}>
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-white mb-3">Delete conversation?</p>
                        <p className="text-base text-zinc-600 dark:text-zinc-400 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteChat(deleteConfirm)}
                                className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CropGuidancePage = () => {
    const { user } = useUser();

    // Filters
    const [soilFilter,    setSoilFilter]    = useState("");
    const [seasonFilter,  setSeasonFilter]  = useState("");
    const [landFilter,    setLandFilter]    = useState("");
    const [farmingFilter, setFarmingFilter] = useState("");

    // Sessions
    const [sessions,  setSessions]  = useState<ChatSession[]>([]);
    const [activeId,  setActiveId]  = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

    // Chat
    const [input,       setInput]       = useState("");
    const [loading,     setLoading]     = useState(false);
    const [showMarathi, setShowMarathi] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
    const [imageError, setImageError] = useState("");

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);

    const MAX_IMAGES_PER_MESSAGE = 2;

    const ctx: FarmerCtx = useMemo(() => ({
        soilType:    soilFilter    || "",
        season:      seasonFilter  || "",
        landType:    landFilter    || "",
        farmingType: farmingFilter || "",
    }), [soilFilter, seasonFilter, landFilter, farmingFilter]);

    // Init
    useEffect(() => {
        const stored = loadSessions();
        const aid    = loadActiveId();
        if (stored.length > 0) {
            setSessions(stored);
            const target = (aid && stored.find(s => s.id === aid)) ? aid : stored[stored.length - 1].id;
            setActiveId(target);
            const s = stored.find(s => s.id === target);
            if (s) { setSoilFilter(s.ctx.soilType); setSeasonFilter(s.ctx.season); setLandFilter(s.ctx.landType); setFarmingFilter(s.ctx.farmingType); }
        } else {
            const s = newSession(ctx);
            setSessions([s]); setActiveId(s.id); saveSessions([s]);
        }
    }, []);

    // Load profile soil
    useEffect(() => {
        if (!user?.id || soilFilter) return;
        getUserProfile(user.id).then(p => { if (p?.soil_type) setSoilFilter(p.soil_type); }).catch(() => {});
    }, [user?.id]);

    // Scroll on message change
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, activeId, loading]);

    const activeSession = sessions.find(s => s.id === activeId);
    const messages = activeSession?.messages ?? [];
    const activeFilters = [soilFilter, seasonFilter, landFilter, farmingFilter].filter(Boolean).length;

    const updateSession = useCallback((id: string, fn: (s: ChatSession) => ChatSession) => {
        setSessions(prev => { const next = prev.map(s => s.id === id ? fn(s) : s); saveSessions(next); return next; });
    }, []);

    const handleNewChat = useCallback(() => {
        const s = newSession(ctx);
        setSessions(prev => { const next = [...prev, s]; saveSessions(next); return next; });
        setActiveId(s.id); saveActiveId(s.id);
        setShowMarathi(false);
        setSidebarOpen(false);
    }, [ctx]);

    const handleSelectSession = useCallback((id: string) => {
        setActiveId(id); saveActiveId(id);
        const s = sessions.find(s => s.id === id);
        if (s) { setSoilFilter(s.ctx.soilType); setSeasonFilter(s.ctx.season); setLandFilter(s.ctx.landType); setFarmingFilter(s.ctx.farmingType); }
        setShowMarathi(false);
    }, [sessions]);

    // ── Translate entire conversation ──────────────────────────────────────────
    const handleTranslateAll = useCallback(async () => {
        if (translating || !activeSession) return;

        // If already translated, just toggle display
        const allTranslated = activeSession.messages
            .filter(m => m.role === "assistant")
            .every(m => Boolean(m.marathiContent));

        if (allTranslated) { setShowMarathi(v => !v); return; }

        setTranslating(true);
        setShowMarathi(true);

        const toTranslate = activeSession.messages.filter(m => m.role === "assistant" && !m.marathiContent);

        await Promise.all(toTranslate.map(async (msg) => {
            try {
                const translated = await translateText(msg.content);
                updateSession(activeId, s => ({
                    ...s,
                    messages: s.messages.map(m => m.id === msg.id ? { ...m, marathiContent: translated } : m),
                }));
            } catch { /* ignore individual failures */ }
        }));

        setTranslating(false);
    }, [translating, activeSession, activeId, updateSession]);

    // ── Send message ───────────────────────────────────────────────────────────
    const handleSend = useCallback(async (text: string) => {
        const t = text.trim();
        if ((!t && pendingImages.length === 0) || loading || !activeId) return;
        setInput("");
        const imagesToSend = pendingImages;
        setPendingImages([]);
        setImageError("");
        if (fileInputRef.current) fileInputRef.current.value = "";

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: t || "Please analyze these images.",
            timestamp: new Date().toISOString(),
            images: imagesToSend.length ? imagesToSend : undefined,
        };
        const isFirst = !messages.some(m => m.role === "user");

        updateSession(activeId, s => ({
            ...s,
            title: isFirst ? t.slice(0, 50) : s.title,
            updatedAt: new Date().toISOString(),
            ctx,
            messages: [...s.messages, userMsg],
        }));

        setLoading(true);
        try {
            const { text: reply, links } = await askGemini([...messages, userMsg], ctx);
            const aiMsg: ChatMessage = { id: Date.now() + "r", role: "assistant", content: reply, timestamp: new Date().toISOString(), links };

            // Auto-translate new message if in Marathi mode
            let marathiContent: string | undefined;
            if (showMarathi) {
                try { marathiContent = await translateText(reply); } catch { /**/ }
            }

            updateSession(activeId, s => ({
                ...s, updatedAt: new Date().toISOString(),
                messages: [...s.messages, { ...aiMsg, marathiContent }],
            }));
        } catch (err: any) {
            updateSession(activeId, s => ({ ...s, messages: [...s.messages, { id: Date.now() + "e", role: "assistant", content: `Error: ${err?.message ?? "Something went wrong."}`, timestamp: new Date().toISOString() }] }));
        } finally {
            setLoading(false);
        }
    }, [loading, activeId, messages, ctx, updateSession, showMarathi, pendingImages]);

    const handlePickImages = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"));
        if (!files.length) return;

        const remainingSlots = Math.max(0, MAX_IMAGES_PER_MESSAGE - pendingImages.length);
        if (remainingSlots <= 0) {
            setImageError(`Only ${MAX_IMAGES_PER_MESSAGE} images allowed.`);
            e.target.value = "";
            return;
        }

        const accepted = files.slice(0, remainingSlots);
        if (files.length > accepted.length) setImageError(`Only ${MAX_IMAGES_PER_MESSAGE} images allowed.`);
        else setImageError("");

        try {
            const converted = await Promise.all(accepted.map(async (file) => ({
                name: file.name,
                mimeType: file.type,
                dataUrl: await fileToDataUrl(file),
            })));
            setPendingImages(prev => [...prev, ...converted].slice(0, MAX_IMAGES_PER_MESSAGE));
        } catch {
            setImageError("Failed to process selected image.");
        } finally {
            e.target.value = "";
        }
    }, [pendingImages.length]);

    const handleRemovePendingImage = useCallback((index: number) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index));
        setImageError("");
    }, []);

    const quickPrompts = ["Which crops suit my soil?", "Fertilizer schedule", "Pest control", "Water-saving irrigation", "Govt subsidies"];

    return (
        <DashboardLayout subtitle="">
            {/* ── Full-height shell ── */}
            <div
                className="flex rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950"
                style={{ height: "calc(100dvh - 7rem)", maxHeight: "920px", minHeight: "500px" }}
            >
                {/* ══ DESKTOP SIDEBAR ══ */}
                <div className="hidden lg:flex w-[250px] xl:w-[270px] flex-shrink-0 border-r border-white/10">
                    <div className="w-full">
                        <SidebarContent sessions={sessions} activeId={activeId} onSelect={handleSelectSession} onNewChat={handleNewChat} onSessionsUpdate={setSessions} />
                    </div>
                </div>

                {/* ══ MOBILE SIDEBAR DRAWER ══ */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 flex lg:hidden">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                        {/* Drawer */}
                        <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
                            <SidebarContent
                                sessions={sessions} activeId={activeId}
                                onSelect={handleSelectSession} onNewChat={handleNewChat}
                                onSessionsUpdate={setSessions}
                                onClose={() => setSidebarOpen(false)}
                            />
                        </div>
                    </div>
                )}

                {/* ══ MAIN CONTENT ══ */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#f4f6f4] dark:bg-zinc-950">

                    {/* ── Filter Bar ── */}
                    <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-5 py-3 flex-shrink-0">
                        {/* Mobile top row — hamburger + title */}
                        <div className="flex items-center gap-2.5 lg:hidden mb-2.5">
                            <button type="button" title="Open sidebar" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}
                                className="w-8 h-8 rounded-lg bg-[#183527] flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Menu className="w-4 h-4 text-white" />
                            </button>
                            <span className="font-bold text-sm text-foreground">Crop Guidance</span>
                            <span className="ml-auto text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />KrishiMitra
                            </span>
                        </div>

                        {/* Header row */}
                        <div className="hidden lg:flex items-center justify-between mb-2.5">
                            <h2 className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">Filter Context</h2>
                            {activeFilters > 0 && (
                                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                                    <span className="w-3.5 h-3.5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">{activeFilters}</span>
                                    {activeFilters} active
                                </span>
                            )}
                        </div>

                        {/* 4 filter cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {[
                                { icon: <span className="text-sm">🪱</span>,   label: "Soil Type", value: soilFilter,    onChange: setSoilFilter,    placeholder: "Select soil",   options: [{ value: "loamy", label: "Loamy" }, { value: "clay", label: "Clay" }, { value: "sandy", label: "Sandy" }, { value: "black", label: "Black Soil" }, { value: "red", label: "Red Soil" }] },
                                { icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,    label: "Season",    value: seasonFilter,  onChange: setSeasonFilter,  placeholder: "Select season", options: [{ value: "kharif", label: "Kharif (Jun–Oct)" }, { value: "rabi", label: "Rabi (Nov–Mar)" }, { value: "zaid", label: "Zaid (Apr–Jun)" }] },
                                { icon: <Droplets className="w-3.5 h-3.5 text-sky-500" />, label: "Land Type", value: landFilter,    onChange: setLandFilter,    placeholder: "Select land",   options: [{ value: "irrigated", label: "Irrigated" }, { value: "rain-fed", label: "Rain-fed" }, { value: "dryland", label: "Dryland" }, { value: "waterlogged", label: "Waterlogged" }, { value: "hilly", label: "Hilly / Terrace" }, { value: "alluvial", label: "Alluvial Plains" }] },
                                { icon: <Leaf className="w-3.5 h-3.5 text-emerald-500" />, label: "Farming",   value: farmingFilter, onChange: setFarmingFilter, placeholder: "Select type",   options: [{ value: "organic", label: "Organic" }, { value: "conventional", label: "Conventional" }, { value: "mixed", label: "Mixed / Intercrop" }, { value: "integrated", label: "Integrated (IPM)" }, { value: "precision", label: "Precision" }, { value: "subsistence", label: "Subsistence" }] },
                            ].map((f, i) => (
                                <div key={i} className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 px-2.5 sm:px-3 py-2">
                                    <FilterDropdown {...f} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Chat header banner ── */}
                    <div className="bg-emerald-700 dark:bg-emerald-800 px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
                                <Sprout className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-[13px] sm:text-[14px] leading-none">KrishiMitra</p>
                                <p className="text-white/55 text-[10px] sm:text-[11px] mt-0.5">AI Farming Assistant · Gemini Powered</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                            <span className="text-white/80 text-[11px] sm:text-[12px] font-medium">Online</span>
                        </div>
                    </div>

                    {/* ── Messages ── */}
                    <div ref={messagesRef} className="flex-1 overflow-y-auto py-4 min-h-0 scroll-smooth">
                        {messages.map(msg => (
                            <Bubble key={msg.id} msg={msg} showMarathi={showMarathi} />
                        ))}

                        {/* Typing indicator */}
                        {loading && (
                            <div className="flex gap-2.5 px-3 sm:px-5 mb-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Sprout className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1.5 items-center">
                                        {[0, 120, 240].map(d => (
                                            <span key={d} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick prompts on fresh session */}
                        {messages.length <= 1 && !loading && (
                            <div className="px-3 sm:px-5 mt-2">
                                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Suggested questions</p>
                                <div className="flex flex-wrap gap-2">
                                    {quickPrompts.map(p => (
                                        <button key={p} type="button" onClick={() => handleSend(p)}
                                            className="text-[12px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-full px-3 py-1.5 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-sm">
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* ── Input bar ── */}
                    <div className="px-3 sm:px-5 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            title="Upload images"
                            aria-label="Upload images"
                            className="hidden"
                            onChange={handleFilesSelected}
                        />

                        {pendingImages.length > 0 && (
                            <div className="mb-2.5 flex flex-wrap gap-2">
                                {pendingImages.map((img, idx) => (
                                    <div key={`pending-${idx}`} className="relative">
                                        <img
                                            src={img.dataUrl}
                                            alt={img.name || `pending-${idx + 1}`}
                                            className="w-16 h-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePendingImage(idx)}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center"
                                            title="Remove image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 px-3 sm:px-4 py-2.5 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/20 transition-all shadow-sm">
                            {/* Text input */}
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                                placeholder="Ask about your crops... (Enter to send)"
                                rows={1}
                                disabled={loading}
                                className="flex-1 bg-transparent text-[13px] resize-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 max-h-24 min-h-[1.25rem] py-0.5 leading-relaxed text-zinc-800 dark:text-zinc-200"
                            />

                            {/* Translate button — globe icon, toggles entire chat */}
                            <button
                                type="button"
                                onClick={handleTranslateAll}
                                disabled={translating}
                                title={showMarathi ? "Switch to English" : "Translate all to Marathi"}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border ${
                                    showMarathi
                                        ? "bg-amber-500 border-amber-400 text-white shadow-sm shadow-amber-200 dark:shadow-amber-900/30"
                                        : "bg-zinc-100 dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                }`}
                            >
                                {translating
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Globe2 className="w-3.5 h-3.5" />
                                }
                            </button>

                            {/* Attachment button */}
                            <button type="button"
                                onClick={handlePickImages}
                                title="Attach images (max 2)"
                                aria-label="Attach images (max 2)"
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors flex-shrink-0">
                                <Paperclip className="w-3.5 h-3.5" />
                            </button>

                            {/* Send button — arrow icon */}
                            <button type="button" onClick={() => handleSend(input)}
                                disabled={(!input.trim() && pendingImages.length === 0) || loading}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white flex-shrink-0 transition-colors shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* Status hint */}
                        <div className="flex items-center justify-between mt-1.5 px-1">
                            <p className="text-[9px] text-zinc-400/70 dark:text-zinc-500/70">Farming questions only · Max 2 images · Shift+Enter for new line</p>
                            <p className={`text-[9px] font-semibold transition-colors ${showMarathi ? "text-amber-500" : "text-zinc-400/60"}`}>
                                {showMarathi ? "🌐 मराठी mode ON" : "EN mode"}
                            </p>
                        </div>
                        {imageError && <p className="text-[10px] text-rose-500 mt-1 px-1">{imageError}</p>}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CropGuidancePage;