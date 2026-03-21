import React, { useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle, FileText, Download, Leaf, MapPin, Phone, Mail } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

type PaymentStatus = "unpaid" | "paid";

export interface BillParty {
  name: string;
  id?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  district?: string;
  taluka?: string;
  village_city?: string;
  zipCode?: string;
}

export interface BillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BillData {
  billingId: string | null;
  transactionId: string;
  receiptNumber: string;
  invoiceNumber?: string;
  transactionType: string;
  title: string;
  amount: number;
  currency?: string;
  date: string;
  dueDate?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentConfirmedAt?: string;
  buyer: BillParty;
  seller: BillParty;
  lineItems: BillLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  partyName?: string;
  partyRole?: string;
  status: string;
  onMarkPaid?: () => void;
  isLoading?: boolean;
}

interface BillReceiptDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  data?: BillData | null;
  isOpen?: boolean;
  onClose?: () => void;
  billData?: RawBillInput | null;
  billDetails?: RawBillInput | null;
  onMarkPaid?: () => void;
  isLoading?: boolean;
  canMarkPaid?: boolean;
}

type RawBillInput = Partial<BillData> & Record<string, unknown>;

const formatCurrency = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  );

const formatCurrencyPdf = (value: number, currency = "INR") => {
  const num = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(num);
  return `${currency} ${formatted}`;
};

const asNumber = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
const asRecord = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
const asNonEmptyString = (value: unknown): string | undefined => { if (value === null || value === undefined) return undefined; const v = String(value).trim(); return v.length ? v : undefined; };
const deriveIdToken = (value: unknown): string => { const source = String(value ?? "").trim(); if (!source) return "00000000"; const first = source.split("-")[0] || source; const cleaned = first.replace(/[^A-Za-z0-9]/g, "").toUpperCase(); return (cleaned || source.replace(/[^A-Za-z0-9]/g, "").toUpperCase()).slice(0, 8).padEnd(8, "0"); };
const hasPartyData = (value: Record<string, unknown>) => !!(value.full_name || value.name || value.email || value.phone || value.location || value.address);

const normalizeBillData = (raw: RawBillInput | BillData | null | undefined): BillData | null => {
  if (!raw) return null;
  const rawObj = asRecord(raw);
  const originalRecord = asRecord(rawObj.originalRecord);
  const rawPayment = raw.paymentStatus ?? rawObj.payment_status ?? raw.status ?? "unpaid";
  const paymentStatus: PaymentStatus = String(rawPayment).toLowerCase() === "paid" ? "paid" : "unpaid";
  const rawStatus = raw.status ?? originalRecord.status ?? "active";
  const status = ["paid", "unpaid"].includes(String(rawStatus).toLowerCase()) ? (originalRecord.status ?? "active") : rawStatus;
  const amount = asNumber(raw.amount ?? rawObj.total_amount ?? rawObj.totalPrice ?? 0, 0);
  const quantity = asNumber(rawObj.quantity ?? rawObj.quantity_kg ?? originalRecord.quantity_kg ?? 1, 1);
  const unitPrice = asNumber(rawObj.unitPrice ?? rawObj.offered_price ?? originalRecord.offered_price, quantity ? amount / quantity : amount);
  const subtotal = asNumber(raw.subtotal ?? amount, amount);
  const taxRate = asNumber(raw.taxRate ?? 0, 0);
  const taxAmount = asNumber(raw.taxAmount ?? (subtotal * taxRate) / 100, 0);
  const total = asNumber(raw.total ?? (subtotal + taxAmount), subtotal + taxAmount);
  const currency = raw.currency ?? "INR";
  const buyerRaw = asRecord(raw.buyer);
  const sellerRaw = asRecord(raw.seller);
  const originalBuyer = asRecord(originalRecord.buyer);
  const originalRenter = asRecord(originalRecord.renter);
  const originalFarmer = asRecord(originalRecord.farmer);
  const originalCropListing = asRecord(originalRecord.crop_listing);
  const cropListingFarmer = asRecord(originalCropListing.farmer);
  const originalEquipment = asRecord(originalRecord.equipment);
  const equipmentOwner = asRecord(originalEquipment.owner);
  const buyerSources = [buyerRaw, originalBuyer, originalRenter, asRecord(rawObj.buyer)].filter(hasPartyData);
  const sellerSources = [sellerRaw, originalFarmer, cropListingFarmer, equipmentOwner, asRecord(rawObj.seller)].filter(hasPartyData);
  const pickPartyField = (sources: Record<string, unknown>[], keys: string[]) => { for (const source of sources) for (const key of keys) { const val = asNonEmptyString(source[key]); if (val) return val; } return undefined; };
  const buildAddr = (parts: Array<string | undefined>) => parts.filter(Boolean).join(", ");
  const buyerDistrict = pickPartyField(buyerSources, ["district"]);
  const buyerTaluka = pickPartyField(buyerSources, ["taluka"]);
  const buyerVillageCity = pickPartyField(buyerSources, ["village_city", "city"]);
  const buyerState = pickPartyField(buyerSources, ["state"]);
  const buyerAddress = pickPartyField(buyerSources, ["address", "location"]) ?? asNonEmptyString(rawObj.buyerAddress) ?? buildAddr([buyerVillageCity, buyerTaluka, buyerDistrict, buyerState]);
  const sellerDistrict = pickPartyField(sellerSources, ["district"]);
  const sellerTaluka = pickPartyField(sellerSources, ["taluka"]);
  const sellerVillageCity = pickPartyField(sellerSources, ["village_city", "city"]);
  const sellerState = pickPartyField(sellerSources, ["state"]);
  const sellerAddress = pickPartyField(sellerSources, ["address", "location"]) ?? asNonEmptyString(rawObj.sellerAddress) ?? buildAddr([sellerVillageCity, sellerTaluka, sellerDistrict, sellerState]);
  const buyer: BillParty = { name: String(pickPartyField(buyerSources, ["name", "full_name"]) ?? asNonEmptyString(rawObj.buyerName) ?? asNonEmptyString(rawObj.buyer_name) ?? "Buyer"), id: pickPartyField(buyerSources, ["id"]) ?? asNonEmptyString(rawObj.buyerId), phone: pickPartyField(buyerSources, ["phone", "phone_number"]) ?? asNonEmptyString(rawObj.buyerPhone), email: pickPartyField(buyerSources, ["email", "email_address"]) ?? asNonEmptyString(rawObj.buyerEmail), address: buyerAddress, city: buyerDistrict ?? buyerVillageCity, state: buyerState, district: buyerDistrict, taluka: buyerTaluka, village_city: buyerVillageCity, zipCode: pickPartyField(buyerSources, ["zipCode", "zip_code", "pincode"]) };
  const seller: BillParty = { name: String(pickPartyField(sellerSources, ["name", "full_name"]) ?? asNonEmptyString(rawObj.sellerName) ?? asNonEmptyString(rawObj.seller_name) ?? "Seller"), id: pickPartyField(sellerSources, ["id"]) ?? asNonEmptyString(rawObj.sellerId), phone: pickPartyField(sellerSources, ["phone", "phone_number"]) ?? asNonEmptyString(rawObj.sellerPhone), email: pickPartyField(sellerSources, ["email", "email_address"]) ?? asNonEmptyString(rawObj.sellerEmail), address: sellerAddress, city: sellerDistrict ?? sellerVillageCity, state: sellerState, district: sellerDistrict, taluka: sellerTaluka, village_city: sellerVillageCity, zipCode: pickPartyField(sellerSources, ["zipCode", "zip_code", "pincode"]) };
  const lineItems: BillLineItem[] = Array.isArray(raw.lineItems) && raw.lineItems.length ? raw.lineItems.map((item: unknown) => { const r = asRecord(item); const q = asNumber(r.quantity, 1); const u = asNumber(r.unitPrice, 0); const a = asNumber(r.amount, q * u); return { description: String(r.description ?? "Item"), quantity: q, unitPrice: u, amount: a }; }) : [{ description: String(raw.title ?? rawObj.cropDetails ?? "Billing Item"), quantity, unitPrice, amount }];
  const billingId = raw.billingId ?? (rawObj.billId ? String(rawObj.billId) : rawObj.transactionId ? String(rawObj.transactionId) : null);
  const transactionId = String(rawObj.transactionId ?? rawObj.transaction_id ?? rawObj.txnId ?? rawObj.payment_txn_id ?? billingId ?? "N/A");
  const idToken = deriveIdToken(billingId ?? transactionId);
  return {
    billingId, transactionId,
    receiptNumber: raw.receiptNumber ?? `RCPT-${idToken}`,
    invoiceNumber: raw.invoiceNumber ?? `INV-${idToken}`,
    transactionType: raw.transactionType ?? "Transaction",
    title: String(raw.title ?? rawObj.cropDetails ?? "Billing Item"),
    amount, currency,
    date: raw.date ?? new Date().toLocaleDateString("en-GB"),
    dueDate: raw.dueDate, paymentStatus,
    paymentMethod: raw.paymentMethod ?? "Cash / Bank Transfer",
    paymentConfirmedAt: raw.paymentConfirmedAt,
    buyer, seller, lineItems, subtotal, taxRate, taxAmount, total,
    notes: raw.notes, partyName: raw.partyName ?? (rawObj.buyerName ? String(rawObj.buyerName) : rawObj.sellerName ? String(rawObj.sellerName) : undefined),
    partyRole: raw.partyRole, status: String(status),
    onMarkPaid: raw.onMarkPaid, isLoading: raw.isLoading,
  };
};

const partyAddressLine = (p: BillParty): string => {
  const rawParts = (p.address || "").split(",").map(x => x.trim()).filter(Boolean);
  const structuredParts = [p.village_city, p.taluka, p.district, p.city, p.state, p.zipCode].map(x => x ? String(x).trim() : "").filter(Boolean);
  const merged = [...rawParts, ...structuredParts];
  const deduped: string[] = [];
  const seen = new Set<string>();
  merged.forEach(part => { const key = part.toLowerCase(); if (!seen.has(key)) { seen.add(key); deduped.push(part); } });
  return deduped.join(", ");
};

// ── PDF builder (unchanged — PDFs are always light) ───────────────────────────
const buildPdf = (d: BillData) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
  const ML = 48, MR = PW - 48;
  const GREEN_DARK: [number, number, number] = [20, 83, 45], GREEN_MID: [number, number, number] = [21, 128, 61], GREEN_LIGHT: [number, number, number] = [220, 252, 231];
  const ACCENT: [number, number, number] = [234, 179, 8], GREY_DARK: [number, number, number] = [30, 30, 30], GREY_MID: [number, number, number] = [100, 100, 100];
  const GREY_LIGHT: [number, number, number] = [245, 245, 245], WHITE: [number, number, number] = [255, 255, 255], RED: [number, number, number] = [220, 38, 38];
  doc.setFillColor(...GREEN_DARK); doc.rect(0, 0, PW, 100, "F");
  doc.setFillColor(...GREEN_MID); doc.rect(0, 88, PW, 6, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...WHITE); doc.text("FARMER CONNECT", ML, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(187, 247, 208); doc.text("official billing receipts", ML, 52);
  const billLabel = `BILL ID: ${d.billingId ? String(d.billingId).toUpperCase() : "N/A"}`;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  const pillW = doc.getTextWidth(billLabel) + 20;
  doc.setFillColor(...GREEN_MID); doc.roundedRect(MR - pillW, 22, pillW, 16, 3, 3, "F"); doc.setTextColor(...WHITE); doc.text(billLabel, MR - pillW / 2, 33, { align: "center" });
  const isPaid = d.paymentStatus === "paid";
  doc.setFillColor(...(isPaid ? ACCENT : RED)); doc.roundedRect(MR - 58, 45, 58, 16, 3, 3, "F"); doc.setTextColor(...(isPaid ? GREEN_DARK : WHITE)); doc.setFontSize(8.5); doc.text(isPaid ? "PAID" : "UNPAID", MR - 29, 56.5, { align: "center" });
  let y = 120;
  doc.setFillColor(...GREY_LIGHT); doc.rect(ML, y, PW - ML * 2, 52, "F"); doc.setDrawColor(220, 220, 220); doc.rect(ML, y, PW - ML * 2, 52, "S");
  const metaItems = [{ label: "Receipt No", value: d.receiptNumber }, { label: "Invoice No", value: d.invoiceNumber ?? "N/A" }, { label: "Transaction ID", value: d.transactionId !== d.billingId ? d.transactionId : "-" }, { label: "Date", value: d.date }, ...(d.dueDate ? [{ label: "Due Date", value: d.dueDate }] : [])];
  const colW = (PW - ML * 2) / metaItems.length;
  metaItems.forEach((m, i) => { const cx = ML + i * colW + colW / 2; doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GREY_MID); doc.text(m.label.toUpperCase(), cx, y + 16, { align: "center" }); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GREY_DARK); doc.text(m.value, cx, y + 32, { align: "center" }); });
  y = 194; doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...GREEN_DARK); doc.text("Party Details", ML, y); y += 12;
  const halfW = (PW - ML * 2 - 16) / 2;
  const drawPartyBox = (party: BillParty, label: string, x: number, startY: number) => {
    doc.setFillColor(...WHITE); doc.setDrawColor(...GREEN_MID); doc.setLineWidth(0.5); doc.roundedRect(x, startY, halfW, 90, 4, 4, "FD");
    doc.setFillColor(...GREEN_LIGHT); doc.roundedRect(x, startY, halfW, 20, 4, 4, "F"); doc.rect(x, startY + 12, halfW, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...GREEN_DARK); doc.text(label, x + 10, startY + 13);
    let py = startY + 30; doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...GREY_DARK); doc.text(party.name, x + 10, py); py += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GREY_MID);
    const addrLine = partyAddressLine(party); if (addrLine) { doc.text(`Addr: ${addrLine}`, x + 10, py); py += 12; } if (party.phone) { doc.text(`Ph: ${party.phone}`, x + 10, py); py += 12; } if (party.email) { doc.text(`Email: ${party.email}`, x + 10, py); }
  };
  drawPartyBox(d.seller, "SELLER", ML, y); drawPartyBox(d.buyer, "BUYER", ML + halfW + 16, y); y += 104;
  doc.setFillColor(248, 250, 252); doc.setDrawColor(220, 220, 220); doc.roundedRect(ML, y, PW - ML * 2, 34, 4, 4, "FD");
  const txItems = [{ label: "Transaction Type", value: d.transactionType }, { label: "Payment Method", value: d.paymentMethod ?? "N/A" }, { label: "Order Status", value: String(d.status).toUpperCase() }];
  const txColW = (PW - ML * 2) / txItems.length;
  txItems.forEach((t, i) => { const cx = ML + i * txColW + txColW / 2; doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GREY_MID); doc.text(t.label.toUpperCase(), cx, y + 11, { align: "center" }); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GREY_DARK); doc.text(t.value, cx, y + 25, { align: "center" }); });
  y += 46;
  type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
  autoTable(doc, { startY: y, margin: { left: ML, right: 48 }, head: [["Description", "Qty", "Unit Price", "Amount"]], body: d.lineItems.map(item => [item.description, String(item.quantity), formatCurrencyPdf(item.unitPrice, d.currency), formatCurrencyPdf(item.amount, d.currency)]), theme: "grid", headStyles: { fillColor: GREEN_DARK, textColor: WHITE, fontSize: 9, fontStyle: "bold", halign: "left", cellPadding: 8 }, columnStyles: { 0: { halign: "left", cellWidth: "auto" }, 1: { halign: "right", cellWidth: 50 }, 2: { halign: "right", cellWidth: 90 }, 3: { halign: "right", cellWidth: 90, fontStyle: "bold" } }, bodyStyles: { fontSize: 9, cellPadding: 7, textColor: GREY_DARK }, alternateRowStyles: { fillColor: [252, 253, 252] }, styles: { lineColor: [220, 220, 220], lineWidth: 0.3 } });
  const tableEndY = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y + 80;
  let ty = tableEndY + 16; const totalsX = MR - 200;
  doc.setFillColor(248, 250, 252); doc.setDrawColor(220, 220, 220); doc.roundedRect(totalsX, ty, 200, 80, 4, 4, "FD");
  const drawTotalRow = (label: string, value: string, bold = false, highlight = false, rowY = 0) => {
    if (highlight) { doc.setFillColor(...GREEN_DARK); doc.rect(totalsX, rowY - 11, 200, 18, "F"); }
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 10 : 9); doc.setTextColor(...(highlight ? WHITE : GREY_DARK)); doc.text(label, totalsX + 12, rowY); doc.text(value, MR - 12, rowY, { align: "right" });
  };
  drawTotalRow("Subtotal", formatCurrencyPdf(d.subtotal, d.currency), false, false, ty + 16); drawTotalRow(`Tax (${d.taxRate}%)`, formatCurrencyPdf(d.taxAmount, d.currency), false, false, ty + 34); drawTotalRow("GRAND TOTAL", formatCurrencyPdf(d.total, d.currency), true, true, ty + 56);
  ty += 92;
  if (d.paymentStatus === "paid") { doc.setFillColor(220, 252, 231); doc.setDrawColor(...GREEN_MID); doc.roundedRect(ML, ty, PW - ML * 2, 26, 4, 4, "FD"); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GREEN_DARK); doc.text("PAYMENT CONFIRMED", ML + 10, ty + 11); if (d.paymentConfirmedAt) { doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY_MID); doc.text(`Confirmed at: ${d.paymentConfirmedAt}`, ML + 10, ty + 21); } ty += 36; }
  if (d.notes) { doc.setFillColor(255, 251, 235); doc.setDrawColor(253, 224, 71); doc.roundedRect(ML, ty, PW - ML * 2, 30, 4, 4, "FD"); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(120, 80, 0); doc.text("Note:", ML + 10, ty + 12); doc.setFont("helvetica", "normal"); doc.setTextColor(GREY_DARK[0], GREY_DARK[1], GREY_DARK[2]); doc.text(d.notes, ML + 34, ty + 12); }
  doc.setFillColor(...GREEN_DARK); doc.rect(0, PH - 36, PW, 36, "F"); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(187, 247, 208); doc.text("Thank you for using FarmDirect Connect — Connecting Farmers to Markets.", PW / 2, PH - 20, { align: "center" }); doc.setTextColor(134, 239, 172); doc.text("This is a system-generated document. No signature required.", PW / 2, PH - 10, { align: "center" });
  return doc;
};

const buildPdfFromElement = async (element: HTMLElement) => {
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: element.scrollWidth });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18, availableWidth = pageWidth - margin * 2;
  const renderedHeight = (canvas.height * availableWidth) / canvas.width;
  let remainingHeight = renderedHeight, sourceOffsetY = 0;
  pdf.addImage(imgData, "PNG", margin, margin, availableWidth, renderedHeight);
  remainingHeight -= pageHeight - margin * 2;
  while (remainingHeight > 0) { sourceOffsetY += pageHeight - margin * 2; pdf.addPage(); pdf.addImage(imgData, "PNG", margin, margin - sourceOffsetY, availableWidth, renderedHeight); remainingHeight -= pageHeight - margin * 2; }
  return pdf;
};

// ── PartyCard ─────────────────────────────────────────────────────────────────
const PartyCard = ({ party, label }: { party: BillParty; label: string }) => {
  const addressLine = partyAddressLine(party) || "N/A";
  return (
    <div className="rounded-xl border border-green-200 dark:border-green-800/60 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      {/* Label header */}
      <div className="bg-green-50 dark:bg-green-950/40 px-4 py-2.5 border-b border-green-200 dark:border-green-800/60">
        <span className="text-[10px] font-bold tracking-widest text-green-700 dark:text-green-400 uppercase">{label}</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[9px] font-bold tracking-widest text-green-700 dark:text-green-500 uppercase mb-0.5">Name</p>
          <p className="font-bold text-slate-900 dark:text-white text-[15px]">{party.name}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold tracking-widest text-green-700 dark:text-green-500 uppercase mb-0.5">Address</p>
          <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600 dark:text-green-500" />
            <span>{addressLine}</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold tracking-widest text-green-700 dark:text-green-500 uppercase mb-0.5">Email</p>
          <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
            <Mail className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-500" />
            <span className="break-all">{party.email || "N/A"}</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-bold tracking-widest text-green-700 dark:text-green-500 uppercase mb-0.5">Mobile</p>
          <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
            <Phone className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-500" />
            <span>{party.phone || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MetaChip ──────────────────────────────────────────────────────────────────
const MetaChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
    <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const BillReceiptDialog = ({
  open, onOpenChange, data, isOpen, onClose,
  billData, billDetails, onMarkPaid, isLoading, canMarkPaid,
}: BillReceiptDialogProps) => {
  const normalizedData = useMemo(() => normalizeBillData(data ?? billData ?? billDetails), [data, billData, billDetails]);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintWithReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: normalizedData
      ? `farmdirect-receipt-${(normalizedData.billingId ?? normalizedData.receiptNumber ?? "receipt").toString().replace(/\s+/g, "-")}`
      : "receipt",
  });

  if (!normalizedData) return null;

  const resolvedOpen = open ?? isOpen ?? false;
  const resolvedOnOpenChange = onOpenChange ?? ((nextOpen: boolean) => { if (!nextOpen) onClose?.(); });
  const resolvedOnMarkPaid = onMarkPaid ?? normalizedData.onMarkPaid;
  const resolvedIsLoading = isLoading ?? normalizedData.isLoading;
  const isPaid = normalizedData.paymentStatus === "paid";

  const handleDownloadPdf = () => {
    try {
      const printable = document.getElementById("printable-bill");
      const token = (normalizedData.billingId ?? normalizedData.receiptNumber ?? "receipt").toString().replace(/\s+/g, "-");
      if (printable) {
        buildPdfFromElement(printable).then(pdf => pdf.save(`farmdirect-receipt-${token}.pdf`)).catch(err => { console.warn("UI PDF failed, using fallback:", err); buildPdf(normalizedData).save(`farmdirect-receipt-${token}.pdf`); });
        return;
      }
      buildPdf(normalizedData).save(`farmdirect-receipt-${token}.pdf`);
    } catch (err) { console.error("PDF generation failed:", err); alert("Could not generate PDF."); }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={resolvedOnOpenChange}>
      <DialogContent className="w-[98vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0">

        {/* ── Dialog header ── */}
        <DialogHeader className="px-5 pt-5 pb-0 print:hidden">
          <DialogTitle className="flex items-center gap-2.5 text-[18px] font-bold text-green-900 dark:text-green-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            Receipt &amp; Billing
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-[13px]">
            View, print or download your official transaction receipt.
          </DialogDescription>
        </DialogHeader>

        {/* ══════════ PRINTABLE BODY ══════════ */}
        <div
          ref={printRef}
          id="printable-bill"
          className="mx-4 mb-4 mt-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm overflow-hidden print:mx-0 print:rounded-none print:border-none print:shadow-none"
        >
          {/* ── Header band ── */}
          <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-700 px-5 sm:px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="h-5 w-5 text-green-300" />
                  <h1 className="text-[18px] font-black text-white tracking-tight">FARMER CONNECT</h1>
                </div>
                <p className="text-green-300 text-[11px] font-medium tracking-wide">official billing receipts</p>
              </div>
              <div className="text-right space-y-1.5 flex-shrink-0">
                <Badge className={`text-[11px] font-bold px-3 py-1 rounded-full border-0 ${isPaid ? "bg-amber-400 text-green-900" : "bg-red-500 text-white"}`}>
                  {isPaid ? "✓ PAID" : "⊘ UNPAID"}
                </Badge>
                <p className="text-green-200 text-[11px] font-mono">
                  BILL ID: {normalizedData.billingId ? String(normalizedData.billingId).toUpperCase() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Meta strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
            {[
              { label: "Receipt No",  value: normalizedData.receiptNumber },
              { label: "Invoice No",  value: normalizedData.invoiceNumber ?? "N/A" },
              { label: "Date",        value: normalizedData.date },
              normalizedData.dueDate
                ? { label: "Due Date",         value: normalizedData.dueDate }
                : { label: "Transaction Type", value: normalizedData.transactionType },
            ].map(m => (
              <div key={m.label} className="bg-white dark:bg-slate-800 px-4 py-3">
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">{m.label}</p>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{m.value}</p>
              </div>
            ))}
          </div>

          {/* ── Body ── */}
          <div className="p-4 sm:p-6 space-y-5">

            {/* Party cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <PartyCard party={normalizedData.seller} label="Seller" />
              <PartyCard party={normalizedData.buyer}  label="Buyer"  />
            </div>

            {/* Transaction meta chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <MetaChip label="Transaction Type" value={normalizedData.transactionType} />
              <MetaChip label="Payment Method"   value={normalizedData.paymentMethod ?? "N/A"} />
              <MetaChip label="Order Status"     value={String(normalizedData.status).charAt(0).toUpperCase() + String(normalizedData.status).slice(1)} />
            </div>

            {/* Transaction ID */}
            {normalizedData.transactionId && normalizedData.transactionId !== normalizedData.billingId && (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 flex items-center gap-2">
                <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">Transaction ID</span>
                <span className="ml-auto text-[12px] font-mono text-slate-600 dark:text-slate-300">{normalizedData.transactionId}</span>
              </div>
            )}

            {/* Line items table */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="bg-green-900 dark:bg-green-950">
                    <th className="px-4 py-3 font-semibold text-[10px] tracking-wider uppercase text-green-200">Description</th>
                    <th className="px-4 py-3 font-semibold text-[10px] tracking-wider uppercase text-green-200 text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold text-[10px] tracking-wider uppercase text-green-200 text-right">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-[10px] tracking-wider uppercase text-green-200 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {normalizedData.lineItems.map((item, i) => (
                    <tr key={`${item.description}-${i}`}
                        className="bg-white dark:bg-slate-900 hover:bg-green-50/40 dark:hover:bg-green-950/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.unitPrice, normalizedData.currency)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount, normalizedData.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[13px] text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(normalizedData.subtotal, normalizedData.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[13px] text-slate-500 dark:text-slate-400">Tax ({normalizedData.taxRate}%)</span>
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(normalizedData.taxAmount, normalizedData.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-green-900 dark:bg-green-950">
                    <span className="text-[13px] font-bold text-white">Grand Total</span>
                    <span className="text-[15px] font-black text-amber-300">{formatCurrency(normalizedData.total, normalizedData.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment confirmed banner */}
            {normalizedData.paymentConfirmedAt && (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-green-800 dark:text-green-300">Payment Confirmed</p>
                  <p className="text-[11px] text-green-600 dark:text-green-500">{normalizedData.paymentConfirmedAt}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {normalizedData.notes && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">Notes</p>
                <p className="text-[13px] text-amber-900 dark:text-amber-300">{normalizedData.notes}</p>
              </div>
            )}

            {/* Unpaid warning */}
            {!isPaid && (
              <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-[13px] text-red-700 dark:text-red-400">
                ⚠ Payment is pending. Please complete the payment as per the agreement.
              </div>
            )}

            {/* Footer watermark */}
            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Thank you for using FarmDirect Connect — Connecting Farmers to Markets</p>
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">This is a system-generated document. No signature required.</p>
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 px-4 sm:px-5 pb-5 print:hidden">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}
            className="w-full sm:w-auto border-green-200 dark:border-green-800/60 text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 bg-white dark:bg-transparent">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>

          <Button size="sm" onClick={() => handlePrintWithReactToPrint()}
            className="w-full sm:w-auto bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 hover:from-green-800 hover:to-green-950 text-white shadow-sm">
            <Printer className="mr-2 h-4 w-4" /> Print Bill
          </Button>

          {!isPaid && canMarkPaid && resolvedOnMarkPaid && (
            <Button size="sm" onClick={resolvedOnMarkPaid} disabled={resolvedIsLoading}
              className="w-full sm:w-auto bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 hover:from-green-800 hover:to-green-950 text-white shadow-sm disabled:opacity-50">
              <CheckCircle className="mr-2 h-4 w-4" />
              {resolvedIsLoading ? "Processing…" : "Confirm Payment & Mark Paid"}
            </Button>
          )}

          {isPaid && (
            <Button disabled variant="secondary" size="sm"
              className="w-full sm:w-auto bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/60 opacity-100 cursor-default">
              <CheckCircle className="mr-2 h-4 w-4" /> Payment Completed
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillReceiptDialog;