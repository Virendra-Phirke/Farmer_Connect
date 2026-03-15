import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle, FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PaymentStatus = "unpaid" | "paid";

export interface BillParty {
  name: string;
  id?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
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

const asNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

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

  const buyer: BillParty = {
    name: String(buyerRaw.name ?? buyerRaw.full_name ?? rawObj.buyerName ?? "Buyer"),
    id: buyerRaw.id ? String(buyerRaw.id) : (rawObj.buyerId ? String(rawObj.buyerId) : undefined),
    phone: buyerRaw.phone ? String(buyerRaw.phone) : undefined,
    email: buyerRaw.email ? String(buyerRaw.email) : undefined,
    address: buyerRaw.address ? String(buyerRaw.address) : (buyerRaw.location ? String(buyerRaw.location) : undefined),
    city: buyerRaw.city ? String(buyerRaw.city) : undefined,
    state: buyerRaw.state ? String(buyerRaw.state) : undefined,
    zipCode: buyerRaw.zipCode ? String(buyerRaw.zipCode) : undefined,
  };

  const seller: BillParty = {
    name: String(sellerRaw.name ?? sellerRaw.full_name ?? rawObj.sellerName ?? "Seller"),
    id: sellerRaw.id ? String(sellerRaw.id) : (rawObj.sellerId ? String(rawObj.sellerId) : undefined),
    phone: sellerRaw.phone ? String(sellerRaw.phone) : undefined,
    email: sellerRaw.email ? String(sellerRaw.email) : undefined,
    address: sellerRaw.address ? String(sellerRaw.address) : (sellerRaw.location ? String(sellerRaw.location) : undefined),
    city: sellerRaw.city ? String(sellerRaw.city) : undefined,
    state: sellerRaw.state ? String(sellerRaw.state) : undefined,
    zipCode: sellerRaw.zipCode ? String(sellerRaw.zipCode) : undefined,
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

  const billingId = raw.billingId ?? (rawObj.billId ? String(rawObj.billId) : null);
  const transactionId = String(
    rawObj.transactionId
      ?? rawObj.transaction_id
      ?? rawObj.txnId
      ?? rawObj.payment_txn_id
      ?? billingId
      ?? "N/A"
  );
  const receiptNumber = raw.receiptNumber ?? (billingId ? `RCPT-${String(billingId).slice(0, 8).toUpperCase()}` : `RCPT-${Date.now().toString().slice(-8)}`);
  const invoiceNumber = raw.invoiceNumber ?? (billingId ? `INV-${String(billingId).slice(0, 8).toUpperCase()}` : undefined);

  return {
    billingId,
    transactionId,
    receiptNumber,
    invoiceNumber,
    transactionType: raw.transactionType ?? "Transaction",
    title: String(raw.title ?? rawObj.cropDetails ?? "Billing Item"),
    amount,
    currency,
    date: raw.date ?? new Date().toLocaleDateString(),
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
  const normalizedData = normalizeBillData(data ?? billData ?? billDetails);
  if (!normalizedData) return null;

  const resolvedOpen = open ?? isOpen ?? false;
  const resolvedOnOpenChange = onOpenChange ?? ((nextOpen: boolean) => {
    if (!nextOpen) onClose?.();
  });
  const resolvedOnMarkPaid = onMarkPaid ?? normalizedData.onMarkPaid;
  const resolvedIsLoading = isLoading ?? normalizedData.isLoading;

  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 48;

    doc.setFillColor(22, 101, 52);
    doc.rect(0, 0, pageWidth, 88, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("FarmDirect Connect - Billing Receipt", 36, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Receipt No: ${normalizedData.receiptNumber}`, 36, 62);
    doc.text(`Invoice No: ${normalizedData.invoiceNumber ?? "N/A"}`, 36, 76);
    doc.text(`Transaction ID: ${normalizedData.transactionId}`, 220, 76);
    doc.text(`Date: ${normalizedData.date}`, pageWidth - 180, 62);
    doc.text(`Status: ${normalizedData.paymentStatus.toUpperCase()}`, pageWidth - 180, 76);

    y = 118;
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Seller Details", 36, y);
    doc.text("Buyer Details", pageWidth / 2 + 12, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const sellerDetails = [
      normalizedData.seller.name,
      normalizedData.seller.id ? `ID: ${normalizedData.seller.id}` : "",
      `Mobile: ${normalizedData.seller.phone ?? "N/A"}`,
      normalizedData.seller.email ? `Email: ${normalizedData.seller.email}` : "",
      `Address: ${normalizedData.seller.address ?? "N/A"}`,
    ].filter(Boolean);

    const buyerDetails = [
      normalizedData.buyer.name,
      normalizedData.buyer.id ? `ID: ${normalizedData.buyer.id}` : "",
      normalizedData.buyer.phone ? `Phone: ${normalizedData.buyer.phone}` : "",
      normalizedData.buyer.email ? `Email: ${normalizedData.buyer.email}` : "",
      normalizedData.buyer.address ? `Address: ${normalizedData.buyer.address}` : "",
    ].filter(Boolean);

    sellerDetails.forEach((line, index) => doc.text(line, 36, y + 18 + index * 14));
    buyerDetails.forEach((line, index) => doc.text(line, pageWidth / 2 + 12, y + 18 + index * 14));

    y += Math.max(sellerDetails.length, buyerDetails.length) * 14 + 34;
    doc.setFont("helvetica", "bold");
    doc.text(`Transaction: ${normalizedData.transactionType}`, 36, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.text(`Billing ID: ${normalizedData.billingId ?? "N/A"}`, 36, y + 10);
    doc.text(`Transaction ID: ${normalizedData.transactionId}`, 36, y + 24);
    doc.text(`Payment Method: ${normalizedData.paymentMethod ?? "N/A"}`, pageWidth / 2 + 12, y + 10);

    autoTable(doc, {
      startY: y + 24,
      head: [["Description", "Qty", "Unit Price", "Amount"]],
      body: normalizedData.lineItems.map((item) => [
        item.description,
        String(item.quantity),
        formatCurrency(item.unitPrice, normalizedData.currency),
        formatCurrency(item.amount, normalizedData.currency),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [22, 101, 52],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
      },
    });

    type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
    const finalY = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y + 90;
    const summaryStartX = pageWidth - 210;

    doc.setFontSize(10);
    doc.text("Subtotal:", summaryStartX, finalY + 20);
    doc.text(formatCurrency(normalizedData.subtotal, normalizedData.currency), pageWidth - 36, finalY + 20, { align: "right" });

    doc.text(`Tax (${normalizedData.taxRate}%):`, summaryStartX, finalY + 36);
    doc.text(formatCurrency(normalizedData.taxAmount, normalizedData.currency), pageWidth - 36, finalY + 36, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", summaryStartX, finalY + 56);
    doc.text(formatCurrency(normalizedData.total, normalizedData.currency), pageWidth - 36, finalY + 56, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text(`Payment Status: ${normalizedData.paymentStatus.toUpperCase()}`, 36, finalY + 56);
    if (normalizedData.paymentConfirmedAt) {
      doc.text(`Payment Confirmed At: ${normalizedData.paymentConfirmedAt}`, 36, finalY + 72);
    }
    if (normalizedData.notes) {
      doc.text(`Notes: ${normalizedData.notes}`, 36, finalY + 88);
    }

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("This is a system-generated receipt from FarmDirect Connect.", 36, doc.internal.pageSize.getHeight() - 24);

    return doc;
  };

  const handleDownloadPdf = () => {
    const pdf = buildPdf();
    const fileToken = (normalizedData.billingId ?? normalizedData.receiptNumber ?? "receipt").toString().replace(/\s+/g, "-");
    pdf.save(`receipt-${fileToken}.pdf`);
  };

  const handlePrintPdf = () => {
    const pdf = buildPdf();
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, "_blank", "width=800,height=600");
    
    if (printWindow && typeof printWindow.print === 'function') {
      // Add a small delay to ensure PDF is loaded before printing
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (error) {
          console.warn("Print failed, user may need to print manually", error);
        }
      }, 500);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } else {
      // Fallback: Download if print window is blocked (Brave private mode)
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `receipt-${(normalizedData.billingId ?? normalizedData.receiptNumber ?? "receipt").toString().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={resolvedOnOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6" /> Receipt & Billing
          </DialogTitle>
          <DialogDescription>
            View and print your transaction details.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 border rounded-lg bg-gray-50/40 print:border-none print:p-0 print:bg-white" id="printable-bill">
          <div className="flex justify-between items-start mb-8 border-b pb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary">FarmDirect Connect</h1>
              <p className="text-muted-foreground mt-1">Official Billing Receipt</p>
            </div>
            <div className="text-right">
              <Badge variant={normalizedData.paymentStatus === "paid" ? "default" : "destructive"} className="mb-2 text-sm px-3 py-1 print:border print:text-black">
                {normalizedData.paymentStatus === "paid" ? "PAID" : "UNPAID"}
              </Badge>
              <p className="text-sm font-medium">Receipt No: {normalizedData.receiptNumber}</p>
              <p className="text-sm text-muted-foreground">Invoice No: {normalizedData.invoiceNumber ?? "N/A"}</p>
              <p className="text-sm text-muted-foreground">Transaction ID: {normalizedData.transactionId}</p>
              <p className="text-sm text-muted-foreground">Bill ID: {normalizedData.billingId?.toString().substring(0, 8).toUpperCase() || "N/A"}</p>
              <p className="text-sm text-muted-foreground">Date: {normalizedData.date}</p>
              {normalizedData.dueDate && <p className="text-sm text-muted-foreground">Due Date: {normalizedData.dueDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border rounded-lg p-4 bg-white">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Seller Details</p>
              <p className="font-semibold text-lg">{normalizedData.seller.name}</p>
              <p className="text-sm text-muted-foreground">ID: {normalizedData.seller.id || "N/A"}</p>
              <p className="text-sm text-muted-foreground">Mobile Number: {normalizedData.seller.phone || "N/A"}</p>
              <p className="text-sm text-muted-foreground">Email: {normalizedData.seller.email || "N/A"}</p>
              <p className="text-sm text-muted-foreground">Address: {normalizedData.seller.address || "N/A"}</p>
            </div>

            <div className="border rounded-lg p-4 bg-white md:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Buyer Details</p>
              <p className="font-semibold text-lg">{normalizedData.buyer.name}</p>
              {normalizedData.buyer.id && <p className="text-sm text-muted-foreground">ID: {normalizedData.buyer.id}</p>}
              {normalizedData.buyer.phone && <p className="text-sm text-muted-foreground">Phone: {normalizedData.buyer.phone}</p>}
              {normalizedData.buyer.email && <p className="text-sm text-muted-foreground">Email: {normalizedData.buyer.email}</p>}
              {normalizedData.buyer.address && <p className="text-sm text-muted-foreground">Address: {normalizedData.buyer.address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border rounded-lg p-3 bg-white">
              <p className="text-xs text-muted-foreground">Transaction Type</p>
              <p className="font-semibold">{normalizedData.transactionType}</p>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <p className="text-xs text-muted-foreground">Payment Method</p>
              <p className="font-semibold">{normalizedData.paymentMethod ?? "N/A"}</p>
            </div>
            <div className="border rounded-lg p-3 bg-white">
              <p className="text-xs text-muted-foreground">Order Status</p>
              <p className="font-semibold capitalize">{normalizedData.status}</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 border-b font-medium text-sm text-muted-foreground">Description</th>
                  <th className="p-4 border-b font-medium text-sm text-muted-foreground text-right">Qty</th>
                  <th className="p-4 border-b font-medium text-sm text-muted-foreground text-right">Unit Price</th>
                  <th className="p-4 border-b font-medium text-sm text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {normalizedData.lineItems.map((item, index) => (
                  <tr key={`${item.description}-${index}`}>
                    <td className="p-4 font-medium">{item.description}</td>
                    <td className="p-4 text-right">{item.quantity}</td>
                    <td className="p-4 text-right">{formatCurrency(item.unitPrice, normalizedData.currency)}</td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(item.amount, normalizedData.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full md:w-[320px] space-y-2 mb-8">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(normalizedData.subtotal, normalizedData.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({normalizedData.taxRate}%)</span><span>{formatCurrency(normalizedData.taxAmount, normalizedData.currency)}</span></div>
            <div className="flex justify-between text-base font-bold border-t pt-2"><span>Total</span><span>{formatCurrency(normalizedData.total, normalizedData.currency)}</span></div>
          </div>

          {normalizedData.paymentConfirmedAt && (
            <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Payment confirmed on: {normalizedData.paymentConfirmedAt}
            </div>
          )}

          {normalizedData.notes && (
            <div className="mb-6 rounded-md border bg-white px-4 py-3 text-sm">
              <p className="text-muted-foreground">Notes</p>
              <p>{normalizedData.notes}</p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground mt-12 pt-8 border-t print:mt-4 print:pt-4">
            <p>Thank you for using FarmDirect Connect.</p>
            {normalizedData.paymentStatus === "unpaid" && <p className="mt-1 text-destructive">Please ensure payment is completed as per the agreement.</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 print:hidden">
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>

          <Button variant="outline" onClick={handlePrintPdf}>
            <Printer className="mr-2 h-4 w-4" /> Print PDF
          </Button>

          {normalizedData.paymentStatus === "unpaid" && canMarkPaid && resolvedOnMarkPaid && (
            <Button onClick={resolvedOnMarkPaid} disabled={resolvedIsLoading} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Payment & Mark Paid
            </Button>
          )}

          {normalizedData.paymentStatus === "paid" && (
            <Button disabled variant="secondary" className="bg-green-50 text-green-700 border-green-200 opacity-100">
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

