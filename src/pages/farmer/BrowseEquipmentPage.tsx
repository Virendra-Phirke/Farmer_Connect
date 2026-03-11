import { useState, useEffect, useRef } from "react";
import { useEquipmentListings } from "@/hooks/useEquipmentListings";
import { useCreateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Tractor, MapPin, Calendar, StickyNote, IndianRupee, Sprout, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInDays, parseISO } from "date-fns";

/* ─── Inline keyframe styles injected once ─────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --eq-cream:   #f0f7ff;
    --eq-sand:    #e0eefa;
    --eq-amber:   #0ea5e9;
    --eq-amber-l: #e0f2fe;
    --eq-amber-d: #0369a1;
    --eq-green:   #0284c7;
    --eq-green-l: #dbeafe;
    --eq-brown:   #0c4a6e;
    --eq-stone:   #475569;
    --eq-border:  #bae6fd;
    --eq-shadow:  0 2px 12px rgba(14,165,233,0.10);
    --eq-shadow-h:0 8px 32px rgba(14,165,233,0.22);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes spinSlow {
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(14,165,233,0.35); }
    70%  { box-shadow: 0 0 0 10px rgba(14,165,233,0); }
    100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); }
  }
  @keyframes badgePop {
    0%   { transform: scale(0.7); opacity: 0; }
    60%  { transform: scale(1.12); }
    100% { transform: scale(1); opacity: 1; }
  }

  .eq-page { font-family: 'DM Sans', sans-serif; }

  .eq-heading {
    font-family: 'Lora', serif;
    color: var(--eq-brown);
    animation: fadeUp .5s ease both;
  }

  /* Card */
  .eq-card {
    background: #fff;
    border: 1.5px solid var(--eq-border);
    border-radius: 18px;
    padding: 24px;
    box-shadow: var(--eq-shadow);
    transition: transform .25s cubic-bezier(.34,1.56,.64,1),
                box-shadow .25s ease,
                border-color .25s ease;
    animation: fadeUp .5s ease both;
    will-change: transform;
    cursor: pointer;
  }
  .eq-card:hover {
    transform: translateY(-5px) scale(1.01);
    box-shadow: var(--eq-shadow-h);
    border-color: var(--eq-amber);
  }

  /* Icon bubble */
  .eq-icon-wrap {
    width: 46px; height: 46px;
    border-radius: 14px;
    background: var(--eq-amber-l);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .2s;
  }
  .eq-card:hover .eq-icon-wrap { background: var(--eq-amber); }
  .eq-card:hover .eq-icon-wrap svg { color: #fff !important; }

  /* Category badge */
  .eq-badge {
    display: inline-flex; align-items: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase;
    background: var(--eq-green-l);
    color: var(--eq-green);
    animation: badgePop .4s ease both;
  }

  /* Price chip */
  .eq-price {
    font-family: 'Lora', serif;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--eq-amber-d);
    display: flex; align-items: center; gap: 3px;
  }

  /* CTA button */
  .eq-btn {
    width: 100%;
    padding: 11px 0;
    border-radius: 12px;
    background: var(--eq-amber);
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500; font-size: 14px;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: background .2s, transform .15s, box-shadow .2s;
    position: relative; overflow: hidden;
  }
  .eq-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform .4s ease;
  }
  .eq-btn:hover::before { transform: translateX(100%); }
  .eq-btn:hover { background: var(--eq-amber-d); box-shadow: 0 4px 16px rgba(14,165,233,0.4); }
  .eq-btn:active { transform: scale(0.97); }
  .eq-btn:disabled { background: #d4cfc8; cursor: not-allowed; box-shadow: none; }

  /* Empty state */
  .eq-empty {
    background: var(--eq-sand);
    border: 2px dashed var(--eq-border);
    border-radius: 20px;
    padding: 64px 32px;
    text-align: center;
    animation: fadeIn .6s ease both;
    color: var(--eq-stone);
  }

  /* Skeleton shimmer */
  .eq-skeleton {
    border-radius: 18px;
    height: 240px;
    background: linear-gradient(90deg, #e0eefa 25%, #f0f7ff 50%, #e0eefa 75%);
    background-size: 800px 100%;
    animation: shimmer 1.4s infinite linear;
  }

  /* Loader ring */
  .eq-loader { animation: spinSlow 1s linear infinite; color: var(--eq-amber); }

  /* Section header accent line */
  .eq-section-title {
    position: relative; display: inline-block;
  }
  .eq-section-title::after {
    content: '';
    position: absolute; left: 0; bottom: -4px;
    width: 40px; height: 3px;
    border-radius: 2px;
    background: var(--eq-amber);
    animation: fadeUp .6s .2s ease both;
  }

  /* Dialog overrides (light, no blur) */
  .eq-dialog-content {
    background: #fff !important;
    border: 1.5px solid var(--eq-border) !important;
    border-radius: 22px !important;
    box-shadow: 0 24px 60px rgba(14,100,160,0.14) !important;
    animation: scaleIn .22s cubic-bezier(.34,1.56,.64,1) both !important;
    padding: 28px !important;
  }

  /* Input field */
  .eq-input {
    border: 1.5px solid var(--eq-border);
    border-radius: 10px;
    padding: 9px 13px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    background: var(--eq-cream);
    transition: border-color .2s, box-shadow .2s;
    outline: none; width: 100%;
  }
  .eq-input:focus {
    border-color: var(--eq-amber);
    box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
    background: #fff;
  }

  /* Cost summary pill */
  .eq-cost-pill {
    background: var(--eq-amber-l);
    border: 1px solid #7dd3fc;
    border-radius: 12px;
    padding: 10px 16px;
    display: flex; justify-content: space-between; align-items: center;
    animation: fadeUp .3s ease both;
  }

  /* Divider */
  .eq-divider { height: 1px; background: var(--eq-border); margin: 4px 0; }
`;

/* ─── Skeleton card placeholder ────────────────────────────────────── */
const SkeletonCard = ({ delay }: { delay: number }) => (
    <div className="eq-skeleton" style={{ animationDelay: `${delay}ms` }} />
);

/* ─── Equipment card ────────────────────────────────────────────────── */
const EquipmentCard = ({ item, index, onSelect }: { item: any; index: number; onSelect: () => void }) => (
    <div
        className="eq-card"
        style={{ animationDelay: `${80 + index * 60}ms` }}
        onClick={onSelect}
    >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div className="eq-icon-wrap">
                <Tractor style={{ width: 22, height: 22, color: "var(--eq-amber)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                    fontFamily: "'Lora', serif",
                    fontWeight: 600, fontSize: "1.05rem",
                    color: "#1c1917", margin: 0, lineHeight: 1.3,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>{item.name}</h3>
                <div style={{ marginTop: 5 }}>
                    <span className="eq-badge" style={{ animationDelay: `${120 + index * 60}ms` }}>
                        <Sprout style={{ width: 10, height: 10, marginRight: 4 }} />{item.category}
                    </span>
                </div>
            </div>
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--eq-stone)", fontSize: 13, marginBottom: 10 }}>
            <MapPin style={{ width: 13, height: 13, flexShrink: 0, color: "var(--eq-amber)" }} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.location || "Location not specified"}
            </span>
        </div>

        {/* Divider */}
        <div className="eq-divider" style={{ margin: "12px 0" }} />

        {/* Price */}
        <div className="eq-price" style={{ marginBottom: 10 }}>
            <IndianRupee style={{ width: 18, height: 18 }} />
            {item.price_per_day}
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 400, color: "var(--eq-stone)", marginLeft: 2 }}>/day</span>
        </div>

        {/* Description */}
        {item.description && (
            <p style={{
                fontSize: 13, color: "var(--eq-stone)",
                marginBottom: 16, lineHeight: 1.55,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden"
            }}>{item.description}</p>
        )}

        {/* CTA */}
        <button className="eq-btn" style={{ justifyContent: "center" }} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            Request Rental <ChevronRight style={{ width: 15, height: 15 }} />
        </button>
    </div>
);

/* ─── Main Page ─────────────────────────────────────────────────────── */
const BrowseEquipmentPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const styleRef = useRef(false);

    // Inject styles once
    useEffect(() => {
        if (styleRef.current) return;
        styleRef.current = true;
        const tag = document.createElement("style");
        tag.textContent = STYLES;
        document.head.appendChild(tag);
    }, []);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: equipment, isLoading } = useEquipmentListings({ is_available: true });
    const createBooking = useCreateEquipmentBooking();

    const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");

    const estimatedDays = startDate && endDate
        ? Math.max(0, differenceInDays(parseISO(endDate), parseISO(startDate))) + 1
        : 0;
    const estimatedCost = estimatedDays * (selectedEquipment?.price_per_day || 0);

    const handleRequest = () => {
        if (!selectedEquipment || !startDate || !endDate || !profileId) return;
        createBooking.mutate({
            equipment_id: selectedEquipment.id,
            renter_id: profileId,
            start_date: startDate,
            end_date: endDate,
            total_price: estimatedCost,
            status: "pending",
            notes,
        }, {
            onSuccess: () => {
                toast.success(`Rental request sent for ${selectedEquipment.name}`);
                setSelectedEquipment(null);
                setStartDate(""); setEndDate(""); setNotes("");
            }
        });
    };

    return (
        <DashboardLayout subtitle="Browse available agricultural equipment for rent.">
            <div className="eq-page" style={{ background: "var(--eq-cream)", minHeight: "100%", padding: "8px 0 40px" }}>

                {/* Section title */}
                <div style={{ marginBottom: 28, animation: "fadeUp .45s ease both" }}>
                    <h2 className="eq-heading eq-section-title" style={{ fontSize: "1.55rem", margin: 0 }}>
                        Available Equipment
                    </h2>
                    <p style={{ marginTop: 10, fontSize: 14, color: "var(--eq-stone)", fontFamily: "'DM Sans',sans-serif", animation: "fadeUp .5s .1s ease both" }}>
                        Find and rent quality farm equipment near you.
                    </p>
                </div>

                {/* States */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 22 }}>
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} delay={i * 80} />)}
                    </div>
                ) : !equipment?.length ? (
                    <div className="eq-empty">
                        <Tractor style={{ width: 44, height: 44, margin: "0 auto 16px", color: "var(--eq-amber)", opacity: .5 }} />
                        <p style={{ fontSize: 16, fontFamily: "'Lora',serif", fontWeight: 600, color: "var(--eq-brown)", margin: "0 0 6px" }}>
                            No equipment right now
                        </p>
                        <p style={{ fontSize: 14, margin: 0 }}>Check back later for new listings!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 22 }}>
                        {equipment.map((item: any, i: number) => (
                            <EquipmentCard key={item.id} item={item} index={i} onSelect={() => setSelectedEquipment(item)} />
                        ))}
                    </div>
                )}

                {/* ── Rental Dialog ─────────────────────────────────── */}
                <Dialog open={!!selectedEquipment} onOpenChange={(open) => !open && setSelectedEquipment(null)}>
                    <DialogContent className="eq-dialog-content" style={{ maxWidth: 480 }}>
                        <DialogHeader style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                                <div className="eq-icon-wrap" style={{ animation: "pulse-ring 1.6s infinite" }}>
                                    <Tractor style={{ width: 22, height: 22, color: "var(--eq-amber)" }} />
                                </div>
                                <div>
                                    <DialogTitle style={{ fontFamily: "'Lora',serif", color: "var(--eq-brown)", fontSize: "1.15rem", margin: 0 }}>
                                        {selectedEquipment?.name}
                                    </DialogTitle>
                                    <DialogDescription style={{ fontSize: 13, color: "var(--eq-stone)", margin: 0 }}>
                                        Fill in your rental dates below.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="eq-divider" />
                        </DialogHeader>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
                            {/* Start date */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--eq-brown)", display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                    <Calendar style={{ width: 14, height: 14, color: "var(--eq-amber)" }} /> Start Date
                                </label>
                                <input
                                    className="eq-input"
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            {/* End date */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--eq-brown)", display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                    <Calendar style={{ width: 14, height: 14, color: "var(--eq-amber)" }} /> End Date
                                </label>
                                <input
                                    className="eq-input"
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    min={startDate || new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--eq-brown)", display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                    <StickyNote style={{ width: 14, height: 14, color: "var(--eq-amber)" }} /> Notes <span style={{ fontWeight: 300, color: "var(--eq-stone)" }}>(optional)</span>
                                </label>
                                <input
                                    className="eq-input"
                                    type="text"
                                    placeholder="Any special requirements..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            {/* Cost estimate */}
                            {estimatedDays > 0 && (
                                <div className="eq-cost-pill">
                                    <span style={{ fontSize: 13, color: "var(--eq-stone)" }}>
                                        {estimatedDays} day{estimatedDays > 1 ? "s" : ""} × ₹{selectedEquipment?.price_per_day}/day
                                    </span>
                                    <span style={{ fontFamily: "'Lora',serif", fontWeight: 700, color: "var(--eq-amber-d)", fontSize: "1.05rem" }}>
                                        ₹{estimatedCost}
                                    </span>
                                </div>
                            )}
                        </div>

                        <DialogFooter style={{ gap: 10, marginTop: 8 }}>
                            <button
                                onClick={() => setSelectedEquipment(null)}
                                style={{
                                    padding: "10px 22px", borderRadius: 10, border: "1.5px solid var(--eq-border)",
                                    background: "transparent", cursor: "pointer", fontSize: 14,
                                    fontFamily: "'DM Sans',sans-serif", color: "var(--eq-stone)",
                                    transition: "background .2s, color .2s"
                                }}
                                onMouseOver={e => { (e.target as HTMLElement).style.background = "var(--eq-sand)"; }}
                                onMouseOut={e => { (e.target as HTMLElement).style.background = "transparent"; }}
                            >
                                Cancel
                            </button>
                            <button
                                className="eq-btn"
                                style={{ width: "auto", padding: "10px 28px", flex: 1 }}
                                onClick={handleRequest}
                                disabled={createBooking.isPending || !startDate || !endDate}
                            >
                                {createBooking.isPending
                                    ? <><Loader2 style={{ width: 15, height: 15, animation: "spinSlow 1s linear infinite" }} /> Submitting…</>
                                    : <>Submit Request <ChevronRight style={{ width: 15, height: 15 }} /></>
                                }
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default BrowseEquipmentPage;