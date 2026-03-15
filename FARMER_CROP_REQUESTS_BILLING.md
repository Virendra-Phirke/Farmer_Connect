# Farmer Crop Requests & Billing System - Complete Workflow

## Overview
This document outlines the complete workflow for farmers receiving crop requests from hotel managers and the billing system integration.

## Workflow Flow

### 1. Hotel Creates Crop Requirements
**Location**: `/hotel/my-requirements`
- Hotels post crop demands (crop name, quantity needed, required date)
- These requirements are visible to all farmers

### 2. Farmer Views Hotel Crop Requests
**Location**: `/farmer/hotel-requests`
- Farmers see all open crop demands from hotels
- Shows: crop name, quantity, hotel location, required date

### 3. Farmer Proposes Supply Contract
**Enhanced Feature**:
- Farmer clicks "Propose Supply Contract"
- Dialog opens asking farmer to propose:
  - **Proposed Price Per kg** ✅ NEW - Farmers can now set initial price
  - Automatically calculates total per delivery
- Sends proposal to hotel with farmer's price

### 4. Hotel Reviews & Accepts Proposal
**Location**: `/hotel/contracts`
- Shows "Pending Proposals" tab with farmer proposals
- Displays:
  - Crop name and farmer name
  - Quantity per delivery
  - Delivery frequency
  - Contract duration (start - end date)
  - **Proposed price (now visible)** ✅
- Hotel can Accept → Contract becomes "active"
- Or Reject → Contract marked "cancelled"

### 5. Active Contract Billing
**For Farmer** - `/farmer/contracts`:
- Shows active supply contracts
- Can click "View Bill" for contract
- Bill shows:
  - Crop details
  - Quantity per delivery
  - **Price per kg** (from farmer's proposal)
  - Total amount (qty × price)
  - Payment status (unpaid/paid)
- Farmer can "Mark as Paid" when payment received

**For Hotel** - `/hotel/contracts`:
- Shows active contracts in "History" tab
- Can view delivery bill
- Tracks payment status

## Key Fields in Supply Contract

```typescript
supply_contracts {
  id: string;
  farmer_id: string;           // Farmer selling the crop
  buyer_id: string;            // Hotel buying the crop
  crop_name: string;           // e.g., "Tomatoes"
  quantity_kg_per_delivery: number;  // e.g., 50 kg/week
  delivery_frequency: string;   // "weekly" | "biweekly" | "monthly"
  start_date: string;          // Contract start
  end_date: string;            // Contract end
  price_per_kg: number;        // ✅ Farmer's proposed price
  payment_status: string;      // "unpaid" | "paid"
  billing_id: string | null;   // For invoice tracking
  status: string;              // "pending" | "active" | "completed" | "cancelled"
}
```

## Billing System Features

### 1. Bill Generation
- Automatic bill ID generation: `INV-SC-{contract_id_first_8_chars}`
- Displays:
  - Buyer & Seller information
  - Line items with quantity × price
  - Subtotal, taxes (0%), total amount
  - Payment status

### 2. Payment Tracking
- Initial status: "unpaid"
- Seller (farmer) can mark as paid
- Updates contract payment_status
- Shows confirmation date when marked paid

### 3. Notifications
- Farmers receive notifications when contracts become active
- Notifications in dashboard bell icon → "Pending" & "History" tabs
- Shows contract status changes (active, completed, etc.)

## Database Tables

### supply_contracts
- Primary table for all farmer-hotel crop agreements
- Foreign keys: farmer_id → profiles, buyer_id → profiles
- Indexes on farmer_id, buyer_id, status for fast queries
- RLS policies ensure users can only see their own contracts

### crop_requirements
- Hotels post what crops they need
- Farmers view these to create proposals
- Linked to hotel profile via hotel_id

## API Endpoints Used

### Supply Contracts
- `GET /supply_contracts` - List contracts (filtered by buyer_id or farmer_id)
- `POST /supply_contracts` - Create new contract proposal
- `PATCH /supply_contracts/{id}` - Update contract status/payment

### Crop Requirements
- `GET /crop_requirements` - List open requirements (hotels view theirs, farmers see all)
- `POST /crop_requirements` - Hotel creates new requirement
- `DELETE /crop_requirements/{id}` - Hotel removes requirement

## Price Negotiation Flow

### Current Implementation ✅
1. Farmer proposes price when creating contract
2. Hotel sees farmer's price in proposal
3. On acceptance, contract locked at proposed price
4. Billing uses this confirmed price

### Future Enhancement (Optional)
- Could add counter-offer mechanism
- Multiple price iterations before acceptance

## Security & Access Control

### Row Level Security (RLS)
- Farmers can only view contracts where farmer_id = their profile_id
- Hotels can only view contracts where buyer_id = their profile_id
- Prevents unauthorized access to business data

### Payment Marking
- Only the seller (farmer) can mark contract as paid
- Verified via `canMarkPaid` logic in UI
- Backend RLS policy enforces this

## Testing Checklist

✅ Farmers receive crop requests from hotels
✅ Farmers can propose contracts with price
✅ Price is visible in billing
✅ Hotels can accept/reject proposals
✅ Active contracts show in farmer's contracts list
✅ Bills generate correctly with price calculations
✅ Payment status tracking works
✅ Notifications appear for pending contracts
✅ RLS policies prevent unauthorized access

## Common Issues & Solutions

### Issue: Bill shows ₹0 amount
**Cause**: price_per_kg is 0 in database
**Solution**: ✅ Fixed - Farmers now enter price when proposing

### Issue: Hotel doesn't see farmer name in proposal
**Solution**: Contract includes farmer.full_name in SELECT query

### Issue: Farmer can't mark payment paid
**Cause**: Payment_status marked as "paid" already
**Solution**: Check contract payment_status in DB, only unpaid contracts show mark paid button

## Migration Status

Database migrations required:
- ✅ supply_contracts table created
- ✅ payment_status column added
- ✅ billing_id column added
- ✅ farmer_id, buyer_id foreign keys setup
- ✅ RLS policies enabled

Run: `supabase migration up` to apply all migrations.
