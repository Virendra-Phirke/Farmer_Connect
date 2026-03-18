/**
 * PDF and Print Utilities for FarmDirect Connect
 * Provides enhanced printing and PDF generation capabilities
 */

/**
 * Print settings configuration for different document types
 */
export interface PrintSettings {
  paperSize: "a4" | "letter" | "a3" | "a5";
  orientation: "portrait" | "landscape";
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  scale: number;
  colorMode: "color" | "grayscale" | "blackWhite";
  includeHeaderFooter: boolean;
}

/**
 * Default print settings for bill receipts
 */
export const DEFAULT_BILL_PRINT_SETTINGS: PrintSettings = {
  paperSize: "a4",
  orientation: "portrait",
  margins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  },
  scale: 100,
  colorMode: "color",
  includeHeaderFooter: false,
};

/**
 * Open a native print dialog for the given element
 */
export const openPrintDialog = () => {
  window.print();
};

/**
 * Generate a printable PDF blob from HTML content
 */
export const generatePdfBlob = async (element: HTMLElement): Promise<Blob> => {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).jsPDF;

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

    return pdf.output("blob");
  } catch (error) {
    console.error("Failed to generate PDF blob:", error);
    throw error;
  }
};

/**
 * Download a file (PDF or other) to the user's device
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Open PDF in a new window for printing
 */
export const openPdfForPrinting = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "width=1200,height=800");

  if (printWindow) {
    printWindow.onload = () => {
      // Small delay to ensure PDF is fully rendered
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (error) {
          console.error("Print failed:", error);
        }
      }, 500);
    };

    // Cleanup after print dialog closes
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 15000);
  } else {
    console.warn("Could not open print window. Attempting to download instead.");
    downloadFile(blob, filename);
  }
};

/**
 * Generate print styles CSS for better print output
 */
export const PRINT_STYLES = `
  @media print {
    body {
      margin: 0;
      padding: 0;
      background-color: white;
    }

    .print\\:hidden {
      display: none !important;
    }

    #printable-bill {
      margin: 0 !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }

    /* Prevent page breaks in important elements */
    .party-card,
    .meta-chip,
    table,
    tr {
      page-break-inside: avoid;
    }

    /* Force new page on certain elements */
    @page {
      size: a4;
      margin: 10mm;
    }
  }
`;

/**
 * Apply print styles to the document
 */
export const applyPrintStyles = () => {
  let styleElement = document.getElementById("print-styles");

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "print-styles";
    styleElement.textContent = PRINT_STYLES;
    document.head.appendChild(styleElement);
  }

  return styleElement;
};

/**
 * Generate a filename for a receipt based on receipt number
 */
export const generateReceiptFilename = (
  billingId?: string | null,
  receiptNumber?: string,
  extension: "pdf" | "txt" = "pdf"
): string => {
  const token = (billingId ?? receiptNumber ?? "receipt").toString().replace(/\s+/g, "-").toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  return `farmdirect-receipt-${token}-${timestamp}.${extension}`;
};

/**
 * Print configuration for different printer types
 */
export const PRINTER_PRESETS = {
  thermal_58mm: {
    paperSize: "a6" as const,
    orientation: "portrait" as const,
    scale: 100,
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
  },
  thermal_80mm: {
    paperSize: "a5" as const,
    orientation: "portrait" as const,
    scale: 100,
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
  },
  standard_a4: {
    paperSize: "a4" as const,
    orientation: "portrait" as const,
    scale: 100,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  standard_letter: {
    paperSize: "letter" as const,
    orientation: "portrait" as const,
    scale: 100,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
  },
};
