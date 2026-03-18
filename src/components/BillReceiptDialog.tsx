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
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

/** jsPDF's built-in fonts don't support ₹ — use this in PDFs instead */
const formatCurrencyPdf = (value: number, currency = "INR") => {
  const num = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(num);
  return `${currency} ${formatted}`;
};

const asNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asNonEmptyString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const v = String(value).trim();
  return v.length ? v : undefined;
};

const deriveIdToken = (value: unknown): string => {
  const source = String(value ?? "").trim();
  if (!source) return "00000000";
  const first = source.split("-")[0] || source;
  const cleaned = first.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (cleaned || source.replace(/[^A-Za-z0-9]/g, "").toUpperCase()).slice(0, 8).padEnd(8, "0");
};

const hasPartyData = (value: Record<string, unknown>) =>
  !!(value.full_name || value.name || value.email || value.phone || value.location || value.address);

const normalizeBillData = (raw: RawBillInput | BillData | null | undefined): BillData | null => {
  if (!raw) return null;

  const rawObj = asRecord(raw);
  const originalRecord = asRecord(rawObj.originalRecord);

  const rawPayment = raw.paymentStatus ?? rawObj.payment_status ?? raw.status ?? "unpaid";
  const paymentStatus: PaymentStatus = String(rawPayment).toLowerCase() === "paid" ? "paid" : "unpaid";
  const rawStatus = raw.status ?? originalRecord.status ?? "active";
  const status = ["paid", "unpaid"].includes(String(rawStatus).toLowerCase())
    ? (originalRecord.status ?? "active")
    : rawStatus;

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

  const buyerSources: Record<string, unknown>[] = [
    buyerRaw,
    originalBuyer,
    originalRenter,
    asRecord(rawObj.buyer),
  ].filter(hasPartyData);

  const sellerSources: Record<string, unknown>[] = [
    sellerRaw,
    originalFarmer,
    cropListingFarmer,
    equipmentOwner,
    asRecord(rawObj.seller),
  ].filter(hasPartyData);

  const pickPartyField = (sources: Record<string, unknown>[], keys: string[]) => {
    for (const source of sources) {
      for (const key of keys) {
        const val = asNonEmptyString(source[key]);
        if (val) return val;
      }
    }
    return undefined;
  };

  const buildAddressFromParts = (parts: Array<string | undefined>) =>
    parts.filter(Boolean).join(", ");
  
  const buyerDistrict = pickPartyField(buyerSources, ["district"]);
  const buyerTaluka = pickPartyField(buyerSources, ["taluka"]);
  const buyerVillageCity = pickPartyField(buyerSources, ["village_city", "city"]);
  const buyerState = pickPartyField(buyerSources, ["state"]);
  const buyerAddress =
    pickPartyField(buyerSources, ["address", "location"]) ??
    asNonEmptyString(rawObj.buyerAddress) ??
    buildAddressFromParts([buyerVillageCity, buyerTaluka, buyerDistrict, buyerState]);

  const sellerDistrict = pickPartyField(sellerSources, ["district"]);
  const sellerTaluka = pickPartyField(sellerSources, ["taluka"]);
  const sellerVillageCity = pickPartyField(sellerSources, ["village_city", "city"]);
  const sellerState = pickPartyField(sellerSources, ["state"]);
  const sellerAddress =
    pickPartyField(sellerSources, ["address", "location"]) ??
    asNonEmptyString(rawObj.sellerAddress) ??
    buildAddressFromParts([sellerVillageCity, sellerTaluka, sellerDistrict, sellerState]);

  const buyer: BillParty = {
    name: String(
      pickPartyField(buyerSources, ["name", "full_name"]) ??
      asNonEmptyString(rawObj.buyerName) ??
      asNonEmptyString(rawObj.buyer_name) ??
      "Buyer"
    ),
    id: pickPartyField(buyerSources, ["id"]) ?? asNonEmptyString(rawObj.buyerId),
    phone: pickPartyField(buyerSources, ["phone", "phone_number"]) ?? asNonEmptyString(rawObj.buyerPhone),
    email: pickPartyField(buyerSources, ["email", "email_address"]) ?? asNonEmptyString(rawObj.buyerEmail),
    address: buyerAddress,
    city: buyerDistrict ?? buyerVillageCity,
    state: buyerState,
    district: buyerDistrict,
    taluka: buyerTaluka,
    village_city: buyerVillageCity,
    zipCode: pickPartyField(buyerSources, ["zipCode", "zip_code", "pincode"]),
  };

  const seller: BillParty = {
    name: String(
      pickPartyField(sellerSources, ["name", "full_name"]) ??
      asNonEmptyString(rawObj.sellerName) ??
      asNonEmptyString(rawObj.seller_name) ??
      "Seller"
    ),
    id: pickPartyField(sellerSources, ["id"]) ?? asNonEmptyString(rawObj.sellerId),
    phone: pickPartyField(sellerSources, ["phone", "phone_number"]) ?? asNonEmptyString(rawObj.sellerPhone),
    email: pickPartyField(sellerSources, ["email", "email_address"]) ?? asNonEmptyString(rawObj.sellerEmail),
    address: sellerAddress,
    city: sellerDistrict ?? sellerVillageCity,
    state: sellerState,
    district: sellerDistrict,
    taluka: sellerTaluka,
    village_city: sellerVillageCity,
    zipCode: pickPartyField(sellerSources, ["zipCode", "zip_code", "pincode"]),
  };

  const lineItems: BillLineItem[] =
    Array.isArray(raw.lineItems) && raw.lineItems.length
      ? raw.lineItems.map((item: unknown) => {
          const itemRaw = asRecord(item);
          const itemQty = asNumber(itemRaw.quantity, 1);
          const itemUnitPrice = asNumber(itemRaw.unitPrice, 0);
          const itemAmount = asNumber(itemRaw.amount, itemQty * itemUnitPrice);
          return {
            description: String(itemRaw.description ?? "Item"),
            quantity: itemQty,
            unitPrice: itemUnitPrice,
            amount: itemAmount,
          };
        })
      : [
          {
            description: String(raw.title ?? rawObj.cropDetails ?? "Billing Item"),
            quantity,
            unitPrice,
            amount,
          },
        ];

  const billingId = raw.billingId ?? (rawObj.billId ? String(rawObj.billId) : (rawObj.transactionId ? String(rawObj.transactionId) : null));
  const transactionId = String(
    rawObj.transactionId
      ?? rawObj.transaction_id
      ?? rawObj.txnId
      ?? rawObj.payment_txn_id
      ?? billingId
      ?? "N/A"
  );
  const idToken = deriveIdToken(billingId ?? transactionId);
  const receiptNumber = raw.receiptNumber ?? `RCPT-${idToken}`;
  const invoiceNumber = raw.invoiceNumber ?? `INV-${idToken}`;

  return {
    billingId,
    transactionId,
    receiptNumber,
    invoiceNumber,
    transactionType: raw.transactionType ?? "Transaction",
    title: String(raw.title ?? rawObj.cropDetails ?? "Billing Item"),
    amount,
    currency,
    date: raw.date ?? new Date().toLocaleDateString("en-GB"),
    dueDate: raw.dueDate,
    paymentStatus,
    paymentMethod: raw.paymentMethod ?? "Cash / Bank Transfer",
    paymentConfirmedAt: raw.paymentConfirmedAt,
    buyer,
    seller,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    notes: raw.notes,
    partyName: raw.partyName ?? (rawObj.buyerName ? String(rawObj.buyerName) : (rawObj.sellerName ? String(rawObj.sellerName) : undefined)),
    partyRole: raw.partyRole,
    status: String(status),
    onMarkPaid: raw.onMarkPaid,
    isLoading: raw.isLoading,
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const partyAddressLine = (p: BillParty): string => {
  const rawParts = (p.address || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const structuredParts = [p.village_city, p.taluka, p.district, p.city, p.state, p.zipCode]
    .map((x) => (x ? String(x).trim() : ""))
    .filter(Boolean);

  const merged = [...rawParts, ...structuredParts];
  const deduped: string[] = [];
  const seen = new Set<string>();

  merged.forEach((part) => {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(part);
    }
  });

  return deduped.join(", ");
};

// ── PDF builder ──────────────────────────────────────────────────────────────

const buildPdf = (d: BillData) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 48;
  const MR = PW - 48;

  /* ── Colours ── */
  const GREEN_DARK: [number, number, number] = [20, 83, 45];
  const GREEN_MID: [number, number, number] = [21, 128, 61];
  const GREEN_LIGHT: [number, number, number] = [220, 252, 231];
  const ACCENT: [number, number, number] = [234, 179, 8]; // amber
  const GREY_DARK: [number, number, number] = [30, 30, 30];
  const GREY_MID: [number, number, number] = [100, 100, 100];
  const GREY_LIGHT: [number, number, number] = [245, 245, 245];
  const WHITE: [number, number, number] = [255, 255, 255];
  const RED: [number, number, number] = [220, 38, 38];

  /* ══════════ HEADER BAND ══════════ */
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, PW, 100, "F");

  // Decorative stripe
  doc.setFillColor(...GREEN_MID);
  doc.rect(0, 88, PW, 6, "F");

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("FARMER CONNECT", ML, 38);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(187, 247, 208);
  doc.text("official billing recipts", ML, 52);

  // Bill ID pill on right
  const billLabel = `BILL ID: ${d.billingId ? String(d.billingId).toUpperCase() : "N/A"}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const pillW = doc.getTextWidth(billLabel) + 20;
  doc.setFillColor(...GREEN_MID);
  doc.roundedRect(MR - pillW, 22, pillW, 16, 3, 3, "F");
  doc.setTextColor(...WHITE);
  doc.text(billLabel, MR - pillW / 2, 33, { align: "center" });

  // Status badge
  const isPaid = d.paymentStatus === "paid";
  doc.setFillColor(...(isPaid ? ACCENT : RED));
  doc.roundedRect(MR - 58, 45, 58, 16, 3, 3, "F");
  doc.setTextColor(...(isPaid ? GREEN_DARK : WHITE));
  doc.setFontSize(8.5);
  doc.text(isPaid ? "PAID" : "UNPAID", MR - 29, 56.5, { align: "center" });

  /* ══════════ META ROW ══════════ */
  let y = 120;
  doc.setFillColor(...GREY_LIGHT);
  doc.rect(ML, y, PW - ML * 2, 52, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(ML, y, PW - ML * 2, 52, "S");

  const metaItems = [
    { label: "Receipt No", value: d.receiptNumber },
    { label: "Invoice No", value: d.invoiceNumber ?? "N/A" },
    { label: "Transaction ID", value: d.transactionId !== d.billingId ? d.transactionId : "-" },
    { label: "Date", value: d.date },
    ...(d.dueDate ? [{ label: "Due Date", value: d.dueDate }] : []),
  ];

  const colW = (PW - ML * 2) / metaItems.length;
  metaItems.forEach((m, i) => {
    const cx = ML + i * colW + colW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY_MID);
    doc.text(m.label.toUpperCase(), cx, y + 16, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREY_DARK);
    doc.text(m.value, cx, y + 32, { align: "center" });
  });

  /* ══════════ PARTY SECTION ══════════ */
  y = 194;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GREEN_DARK);
  doc.text("Party Details", ML, y);

  y += 12;
  const halfW = (PW - ML * 2 - 16) / 2;

  const drawPartyBox = (party: BillParty, label: string, x: number, startY: number) => {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...GREEN_MID);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, startY, halfW, 90, 4, 4, "FD");

    // Header strip
    doc.setFillColor(...GREEN_LIGHT);
    doc.roundedRect(x, startY, halfW, 20, 4, 4, "F");
    doc.rect(x, startY + 12, halfW, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREEN_DARK);
    doc.text(label, x + 10, startY + 13);

    let py = startY + 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...GREY_DARK);
    doc.text(party.name, x + 10, py);
    py += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY_MID);

    const addrLine = partyAddressLine(party);
    if (addrLine) { doc.text(`Addr: ${addrLine}`, x + 10, py); py += 12; }
    if (party.phone) { doc.text(`Ph: ${party.phone}`, x + 10, py); py += 12; }
    if (party.email) { doc.text(`Email: ${party.email}`, x + 10, py); }
  };

  drawPartyBox(d.seller, "SELLER", ML, y);
  drawPartyBox(d.buyer, "BUYER", ML + halfW + 16, y);

  /* ══════════ TRANSACTION META ══════════ */
  y += 104;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(ML, y, PW - ML * 2, 34, 4, 4, "FD");

  const txItems = [
    { label: "Transaction Type", value: d.transactionType },
    { label: "Payment Method", value: d.paymentMethod ?? "N/A" },
    { label: "Order Status", value: String(d.status).toUpperCase() },
  ];
  const txColW = (PW - ML * 2) / txItems.length;
  txItems.forEach((t, i) => {
    const cx = ML + i * txColW + txColW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY_MID);
    doc.text(t.label.toUpperCase(), cx, y + 11, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREY_DARK);
    doc.text(t.value, cx, y + 25, { align: "center" });
  });

  /* ══════════ LINE ITEMS TABLE ══════════ */
  y += 46;

  type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 48 },
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: d.lineItems.map((item) => [
      item.description,
      String(item.quantity),
      formatCurrencyPdf(item.unitPrice, d.currency),
      formatCurrencyPdf(item.amount, d.currency),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: GREEN_DARK,
      textColor: WHITE,
      fontSize: 9,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 8,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: "auto" },
      1: { halign: "right", cellWidth: 50 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90, fontStyle: "bold" },
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 7,
      textColor: GREY_DARK,
    },
    alternateRowStyles: { fillColor: [252, 253, 252] },
    styles: { lineColor: [220, 220, 220], lineWidth: 0.3 },
  });

  const tableEndY = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y + 80;

  /* ══════════ TOTALS BLOCK ══════════ */
  let ty = tableEndY + 16;
  const totalsX = MR - 200;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(totalsX, ty, 200, 80, 4, 4, "FD");

  const drawTotalRow = (label: string, value: string, bold = false, highlight = false, rowY = 0) => {
    if (highlight) {
      doc.setFillColor(...GREEN_DARK);
      doc.rect(totalsX, rowY - 11, 200, 18, "F");
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(...(highlight ? WHITE : GREY_DARK));
    doc.text(label, totalsX + 12, rowY);
    doc.text(value, MR - 12, rowY, { align: "right" });
  };

  drawTotalRow("Subtotal", formatCurrencyPdf(d.subtotal, d.currency), false, false, ty + 16);
  drawTotalRow(`Tax (${d.taxRate}%)`, formatCurrencyPdf(d.taxAmount, d.currency), false, false, ty + 34);
  drawTotalRow("GRAND TOTAL", formatCurrencyPdf(d.total, d.currency), true, true, ty + 56);

  /* ══════════ PAYMENT STATUS ══════════ */
  ty += 92;

  if (d.paymentStatus === "paid") {
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(...GREEN_MID);
    doc.roundedRect(ML, ty, PW - ML * 2, 26, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN_DARK);
    doc.text("PAYMENT CONFIRMED", ML + 10, ty + 11);
    if (d.paymentConfirmedAt) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GREY_MID);
      doc.text(`Confirmed at: ${d.paymentConfirmedAt}`, ML + 10, ty + 21);
    }
    ty += 36;
  }

  /* ══════════ NOTES ══════════ */
  if (d.notes) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(ML, ty, PW - ML * 2, 30, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 80, 0);
    doc.text("Note:", ML + 10, ty + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GREY_DARK[0], GREY_DARK[1], GREY_DARK[2]);
    doc.text(d.notes, ML + 34, ty + 12);
    ty += 40;
  }

  /* ══════════ FOOTER ══════════ */
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, PH - 36, PW, 36, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(187, 247, 208);
  doc.text("Thank you for using FarmDirect Connect — Connecting Farmers to Markets.", PW / 2, PH - 20, { align: "center" });
  doc.setTextColor(134, 239, 172);
  doc.text("This is a system-generated document. No signature required.", PW / 2, PH - 10, { align: "center" });

  return doc;
};

const buildPdfFromElement = async (element: HTMLElement) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const availableWidth = pageWidth - margin * 2;
  const renderedHeight = (canvas.height * availableWidth) / canvas.width;

  let remainingHeight = renderedHeight;
  let positionY = margin;
  let sourceOffsetY = 0;

  // Add first page
  pdf.addImage(imgData, "PNG", margin, positionY, availableWidth, renderedHeight);
  remainingHeight -= pageHeight - margin * 2;

  // Add additional pages if content overflows
  while (remainingHeight > 0) {
    sourceOffsetY += pageHeight - margin * 2;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, margin - sourceOffsetY, availableWidth, renderedHeight);
    remainingHeight -= pageHeight - margin * 2;
  }

  return pdf;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const PartyCard = ({ party, label }: { party: BillParty; label: string }) => {
  const addressLine = partyAddressLine(party) || "N/A";
  const emailLine = party.email || "N/A";
  const phoneLine = party.phone || "N/A";
  return (
    <div className="rounded-xl border border-green-200 bg-white dark:border-green-800 dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="bg-green-50 dark:bg-green-950/40 px-4 py-3 border-b border-green-200 dark:border-green-800">
        <span className="text-xs font-bold tracking-widest text-green-700 dark:text-green-300 uppercase">{label}</span>
      </div>
      <div className="p-4 space-y-4">
        {/* NAME */}
        <div>
          <p className="text-xs font-bold tracking-widest text-green-700 dark:text-green-300 uppercase mb-1">Name</p>
          <p className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">{party.name}</p>
        </div>

        {/* ADDRESS */}
        <div>
          <p className="text-xs font-bold tracking-widest text-green-700 dark:text-green-300 uppercase mb-1">Address</p>
          <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
            <span>{addressLine}</span>
          </div>
        </div>

        {/* EMAIL */}
        <div>
          <p className="text-xs font-bold tracking-widest text-green-700 dark:text-green-300 uppercase mb-1">Email</p>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <Mail className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span className="break-all">{emailLine}</span>
          </div>
        </div>

        {/* MOBILE */}
        <div>
          <p className="text-xs font-bold tracking-widest text-green-700 dark:text-green-300 uppercase mb-1">Mobile</p>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <Phone className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            <span>{phoneLine}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetaChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
    <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const BillReceiptDialog = ({
  open,
  onOpenChange,
  data,
  isOpen,
  onClose,
  billData,
  billDetails,
  onMarkPaid,
  isLoading,
  canMarkPaid,
}: BillReceiptDialogProps) => {
  const normalizedData = useMemo(
    () => normalizeBillData(data ?? billData ?? billDetails),
    [data, billData, billDetails]
  );
  const printRef = useRef<HTMLDivElement>(null);

  // Using react-to-print for better print handling - must be called before early return
  const handlePrintWithReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: normalizedData ? `farmdirect-receipt-${(normalizedData.billingId ?? normalizedData.receiptNumber ?? "receipt").toString().replace(/\s+/g, "-")}` : "receipt",
    onBeforePrint: async () => {
      console.log("Preparing document for printing...");
    },
    onAfterPrint: async () => {
      console.log("Print dialog closed");
    },
  });

  if (!normalizedData) return null;

  const resolvedOpen = open ?? isOpen ?? false;
  const resolvedOnOpenChange = onOpenChange ?? ((nextOpen: boolean) => {
    if (!nextOpen) onClose?.();
  });
  const resolvedOnMarkPaid = onMarkPaid ?? normalizedData.onMarkPaid;
  const resolvedIsLoading = isLoading ?? normalizedData.isLoading;

  const handleDownloadPdf = () => {
    try {
      const printable = document.getElementById("printable-bill");
      const token = (normalizedData.billingId ?? normalizedData.receiptNumber ?? "receipt")
        .toString().replace(/\s+/g, "-");

      if (printable) {
        buildPdfFromElement(printable)
          .then((pdf) => pdf.save(`farmdirect-receipt-${token}.pdf`))
          .catch((err) => {
            console.warn("UI PDF generation failed, using fallback PDF builder:", err);
            const fallback = buildPdf(normalizedData);
            fallback.save(`farmdirect-receipt-${token}.pdf`);
          });
        return;
      }

      const fallback = buildPdf(normalizedData);
      fallback.save(`farmdirect-receipt-${token}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF. Check console for details.");
    }
  };

  const handlePrintPdf = () => {
    // Use react-to-print for native browser printing
    handlePrintWithReactToPrint();
  };

  const isPaid = normalizedData.paymentStatus === "paid";

  return (
    <Dialog open={resolvedOpen} onOpenChange={resolvedOnOpenChange}>
      <DialogContent className="w-[98vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50 p-0">
        {/* ── Dialog header ── */}
        <DialogHeader className="px-6 pt-5 pb-0 print:hidden">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-green-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-800 text-white">
              <FileText className="h-4 w-4" />
            </div>
            Receipt &amp; Billing
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            View, print or download your official transaction receipt.
          </DialogDescription>
        </DialogHeader>

        {/* ══════════ PRINTABLE BODY ══════════ */}
        <div ref={printRef} id="printable-bill" className="mx-4 mb-4 mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden print:mx-0 print:rounded-none print:border-none print:shadow-none">

          {/* Header band */}
          <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-700 px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="h-5 w-5 text-green-300" />
                  <h1 className="text-xl font-black text-white tracking-tight">FARMER CONNECT</h1>
                </div>
                <p className="text-green-300 text-xs font-medium tracking-wide">official billing recipts</p>
              </div>
              <div className="text-right space-y-1.5">
                <Badge
                  className={`text-xs font-bold px-3 py-1 rounded-full border-0 ${
                    isPaid
                      ? "bg-amber-400 text-green-900"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {isPaid ? "✓ PAID" : "⊘ UNPAID"}
                </Badge>
                <p className="text-green-200 text-[11px] font-mono">
                  BILL ID: {normalizedData.billingId ? String(normalizedData.billingId).toUpperCase() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
            {[
              { label: "Receipt No", value: normalizedData.receiptNumber },
              { label: "Invoice No", value: normalizedData.invoiceNumber ?? "N/A" },
              { label: "Date", value: normalizedData.date },
              ...(normalizedData.dueDate ? [{ label: "Due Date", value: normalizedData.dueDate }] : [{ label: "Transaction Type", value: normalizedData.transactionType }]),
            ].map((m) => (
              <div key={m.label} className="bg-white px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{m.label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* ── Party cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <PartyCard party={normalizedData.seller} label="Seller" />
              <PartyCard party={normalizedData.buyer} label="Buyer" />
            </div>

            {/* ── Transaction meta chips ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <MetaChip label="Transaction Type" value={normalizedData.transactionType} />
              <MetaChip label="Payment Method" value={normalizedData.paymentMethod ?? "N/A"} />
              <MetaChip label="Order Status" value={String(normalizedData.status).charAt(0).toUpperCase() + String(normalizedData.status).slice(1)} />
            </div>

            {/* ── Transaction IDs ── */}
            {normalizedData.transactionId && normalizedData.transactionId !== normalizedData.billingId && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-2.5 flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Transaction ID</span>
                <span className="ml-auto text-xs font-mono text-gray-600">{normalizedData.transactionId}</span>
              </div>
            )}

            {/* ── Line items table ── */}
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-green-900 text-white">
                    <th className="px-4 py-3 font-semibold text-xs tracking-wider uppercase text-green-200">Description</th>
                    <th className="px-4 py-3 font-semibold text-xs tracking-wider uppercase text-green-200 text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold text-xs tracking-wider uppercase text-green-200 text-right">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-xs tracking-wider uppercase text-green-200 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {normalizedData.lineItems.map((item, index) => (
                    <tr key={`${item.description}-${index}`} className="hover:bg-green-50/40 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-800">{item.description}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{formatCurrency(item.unitPrice, normalizedData.currency)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900">{formatCurrency(item.amount, normalizedData.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals ── */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 rounded-xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50">
                    <span className="text-sm text-gray-500">Subtotal</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(normalizedData.subtotal, normalizedData.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50">
                    <span className="text-sm text-gray-500">Tax ({normalizedData.taxRate}%)</span>
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(normalizedData.taxAmount, normalizedData.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-green-900">
                    <span className="text-sm font-bold text-white">Total</span>
                    <span className="text-base font-black text-amber-300">{formatCurrency(normalizedData.total, normalizedData.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Payment confirmed banner ── */}
            {normalizedData.paymentConfirmedAt && (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Payment Confirmed</p>
                  <p className="text-xs text-green-600">{normalizedData.paymentConfirmedAt}</p>
                </div>
              </div>
            )}

            {/* ── Notes ── */}
            {normalizedData.notes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-amber-900">{normalizedData.notes}</p>
              </div>
            )}

            {/* ── Unpaid warning ── */}
            {!isPaid && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                ⚠ Payment is pending. Please complete the payment as per the agreement.
              </div>
            )}

            {/* ── Footer watermark ── */}
            <div className="border-t border-dashed border-gray-200 pt-4 text-center">
              <p className="text-xs text-gray-400">Thank you for using FarmDirect Connect — Connecting Farmers to Markets</p>
              <p className="text-[10px] text-gray-300 mt-0.5">This is a system-generated document. No signature required.</p>
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 px-4 sm:px-6 pb-5 print:hidden">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="w-full sm:w-auto border-green-200 text-green-800 hover:bg-green-50">
            <Download className="mr-2 h-4 w-4" /> Download Bill PDF
          </Button>

          <Button size="sm" onClick={handlePrintPdf} className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white">
            <Printer className="mr-2 h-4 w-4" /> Print Bill
          </Button>

          {!isPaid && canMarkPaid && resolvedOnMarkPaid && (
            <Button
              size="sm"
              onClick={resolvedOnMarkPaid}
              disabled={resolvedIsLoading}
              className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {resolvedIsLoading ? "Processing…" : "Confirm Payment & Mark Paid"}
            </Button>
          )}

          {isPaid && (
            <Button disabled variant="secondary" size="sm" className="w-full sm:w-auto bg-green-50 text-green-700 border border-green-200 opacity-100 cursor-default">
              <CheckCircle className="mr-2 h-4 w-4" />
              Payment Completed
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillReceiptDialog;