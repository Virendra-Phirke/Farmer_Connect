# PDF Printing Enhancement for FarmDirect Connect

## Overview

This document outlines the PDF printing enhancements implemented in the FarmDirect Connect application using the `react-to-print` library.

## What's New

### 1. **react-to-print Integration**
- **Library**: `react-to-print` - A React component for printing documents
- **Installation**: Added to `package.json` dependencies
- **Benefits**:
  - Native browser printing dialog support
  - Better print preview
  - Better control over print layout
  - Cross-browser compatibility

### 2. **Enhanced BillReceiptDialog Component**
The `BillReceiptDialog.tsx` component has been updated with:

#### New Imports
```typescript
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
```

#### New Hook Usage
```typescript
const printRef = useRef<HTMLDivElement>(null);

const handlePrintWithReactToPrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: `farmdirect-receipt-${receiptId}`,
  onBeforePrint: async () => { /* logging */ },
  onAfterPrint: async () => { /* logging */ },
});
```

#### Updated JSX
The printable bill container now includes the `ref`:
```tsx
<div ref={printRef} id="printable-bill" className="...">
  {/* Bill content */}
</div>
```

### 3. **PDF Print Utilities Library**
New file: `src/lib/pdf-print-utils.ts`

This utility module provides:

#### Functions
- `openPrintDialog()` - Opens native browser print dialog
- `generatePdfBlob(element)` - Generates PDF blob from HTML element
- `downloadFile(blob, filename)` - Downloads file to user's device
- `openPdfForPrinting(blob, filename)` - Opens PDF in new window for printing
- `applyPrintStyles()` - Applies CSS print styles to document
- `generateReceiptFilename(billingId, receiptNumber)` - Generates standardized filename

#### Configurations
- `DEFAULT_BILL_PRINT_SETTINGS` - Default print settings for bills
- `PRINTER_PRESETS` - Presets for different printer types (thermal, A4, letter)
- `PRINT_STYLES` - CSS rules for print-friendly output

## Usage Examples

### Basic Printing
```typescript
// In your component
const handlePrint = () => {
  handlePrintWithReactToPrint(); // Uses react-to-print hook
};
```

### Advanced PDF Generation
```typescript
import { generatePdfBlob, downloadFile } from "@/lib/pdf-print-utils";

const handleDownload = async () => {
  const element = document.getElementById("printable-content");
  try {
    const blob = await generatePdfBlob(element);
    downloadFile(blob, "my-document.pdf");
  } catch (error) {
    console.error("PDF generation failed:", error);
  }
};
```

### Custom Printer Settings
```typescript
import { PRINTER_PRESETS } from "@/lib/pdf-print-utils";

// Use thermal printer preset
const thermalSettings = PRINTER_PRESETS.thermal_80mm;

// Use standard A4 preset
const a4Settings = PRINTER_PRESETS.standard_a4;
```

## Features

### ✅ Multiple Print/Download Options
- Native browser print dialog
- Download as PDF
- Open in new window for printing
- Print preview support

### ✅ Bill Receipt Features
- Professional formatted receipts
- Party details with contact information
- Line items table
- Totals calculation with tax breakdown
- Payment status display
- Transaction ID tracking
- Custom notes support

### ✅ Print Optimization
- Page break handling
- Margin control
- Color and grayscale modes
- Multiple paper size support
- Printer-specific presets

## File Structure

```
src/
├── components/
│   └── BillReceiptDialog.tsx          (Enhanced with react-to-print)
├── lib/
│   └── pdf-print-utils.ts             (New utility module)
└── pages/
    ├── hotel/
    │   └── SupplyContractsPage.tsx    (Uses BillReceiptDialog)
    └── [other billing pages]
```

## Installation & Setup

The dependencies have already been installed. To use in a fresh environment:

```bash
npm install react-to-print
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ⚠️ Limited support (depends on browser)

## Print Quality Tips

1. **For Best Results**:
   - Use Chrome or Edge browser
   - Ensure "Background graphics" is enabled in print dialog
   - Use A4 paper size for standard documents
   - Set margins to 10mm minimum

2. **Thermal Printer Settings**:
   - Use 80mm or 58mm presets
   - Disable margins for thermal printers
   - Use grayscale mode for better thermal quality

3. **Color vs Grayscale**:
   - Color mode: Better visual appeal
   - Grayscale mode: Better for black & white thermal printers

## API Reference

### BillReceiptDialog Props
```typescript
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
```

### Print Utilities API
See `src/lib/pdf-print-utils.ts` for complete API documentation.

## Future Enhancements

Potential improvements:
- [ ] Server-side PDF generation
- [ ] Email PDF delivery
- [ ] Batch printing
- [ ] Print templates customization
- [ ] Cloud storage integration (Google Drive, OneDrive)
- [ ] Print queue management
- [ ] Digital signature support

## Troubleshooting

### Print Dialog Not Opening
- Check browser pop-up settings
- Ensure JavaScript is enabled
- Try using a different browser

### PDF Generation Failing
- Verify HTML element exists in DOM
- Check browser console for errors
- Ensure images are CORS-enabled

### Layout Issues in Print
- Check print CSS rules in `pdf-print-utils.ts`
- Verify page breaks are set correctly
- Test with print preview first

## Support

For issues or questions:
1. Check browser console for error messages
2. Review the component's error handling
3. Test in different browsers
4. Contact the development team

## Version History

### v1.0.0 (2026-03-16)
- Initial implementation with react-to-print
- Bill receipt printing support
- PDF utilities library
- Print presets for common printer types
