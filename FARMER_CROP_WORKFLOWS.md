# User Journeys - Farmer Crop Requests & Billing

## Journey 1: Hotel Manager Posts Crop Requirement

### Scenario
Hotel "Mumbai Palace" needs tomatoes and potatoes regularly.

### Steps
1. **Login as Hotel Manager** → Dashboard
2. **Navigate** → "My Crop Requirements"
3. **Click** → "Post New Demand"
4. **Fill Form**:
   - Crop Name: "Tomatoes"
   - Quantity Required: "100 kg"
   - Required By Date: "2026-03-25"
5. **Click** → "Post Demand"
6. ✅ Toast: "Crop requirement posted successfully!"

### Backend
- Creates row in `crop_requirements` table
- Links to hotel's profile_id
- Visible to all farmers

---

## Journey 2: Farmer Views & Proposes Contract

### Scenario
Farmer "Raj Kumar" sees tomato requirement and wants to fulfill it.

### Steps
1. **Login as Farmer** → Dashboard
2. **Navigate** → "Hotel Crop Demands"
3. **See Card**:
   - Crop: "Tomatoes"
   - Quantity: "100 kg"
   - Buyer: "Mumbai Palace"
   - Location: "Mumbai"
   - Required By: "2026-03-25"
4. **Click** → "Propose Supply Contract"
5. **Dialog Opens**:
   - Shows crop & quantity
   - Input field for price
6. **Enter Price**: "₹45.50 per kg"
7. **See Calculation**: "Total per delivery: ₹4,550"
8. **Click** → "Send Proposal"
9. ✅ Toast: "Sent supply proposal to Mumbai Palace for 100kg of Tomatoes @ ₹45.50/kg!"

### Backend
- Creates row in `supply_contracts` table:
  - farmer_id: Raj Kumar's profile_id
  - buyer_id: Mumbai Palace's profile_id
  - crop_name: "Tomatoes"
  - quantity_kg_per_delivery: 100
  - price_per_kg: 45.50 ✅
  - status: "pending"
  - payment_status: "unpaid"

---

## Journey 3: Hotel Reviews & Accepts Proposal

### Scenario
Mumbai Palace manager reviews Raj's proposal.

### Steps
1. **Login as Hotel Manager** → Dashboard
2. **Navigate** → "Supply Contracts"
3. **Tab**: "Pending Proposals" (shows 1 pending)
4. **See Proposal Card**:
   - Crop: "Tomatoes"
   - From: "Raj Kumar"
   - Quantity: "100kg / weekly" ✅
   - Price: "₹45.50/kg" ✅ (NOW VISIBLE)
   - Duration: "2026-03-15 - 2026-04-14"
5. **Options**:
   - ✅ Accept Proposal
   - ❌ Reject
6. **Click** → "Accept Proposal"
7. ✅ Toast: "Supply contract accepted and activated!"

### Backend
- Updates supply_contracts row:
  - status: "active" (was "pending")
- Both farmer and hotel receive notifications

---

## Journey 4: Farmer Views Bill & Tracks Payment

### Scenario
Raj Kumar needs to track payment for the tomato supply contract.

### Steps
1. **Login as Farmer** → Dashboard
2. **Navigate** → "My Contracts"
3. **See Active Contract**:
   - Crop: "Tomatoes"
   - Qty/delivery: "100 kg"
   - Frequency: "weekly"
   - Price: "₹45.50/kg" ✅
   - Period: "2026-03-15 → 2026-04-14"
   - Status: "active" ✅
4. **Click** → "View Bill"
5. **Bill Dialog Shows**:
   ```
   Supply Contract Delivery Bill
   Invoice ID: INV-SC-ABC12345
   
   From: Raj Kumar (Farmer)
   To: Mumbai Palace Hotel
   Date: 15 Mar 2026
   
   Items:
   - Tomatoes (100 kg/delivery @ ₹45.50/kg)
     Qty: 100
     Unit Price: ₹45.50
     Amount: ₹4,550
   
   Subtotal: ₹4,550
   Tax (0%): ₹0
   Total: ₹4,550
   
   Payment Status: UNPAID
   
   [Mark as Paid] Button
   ```
6. **When payment received**:
   - Click → "Mark as Paid"
   - ✅ Toast: "Payment marked as complete"
   - Status changes to: "PAID"
   - Farmer receives notification

### Backend
- Displays contract data with:
  - price_per_kg: 45.50
  - quantity_kg_per_delivery: 100
  - Calculates: 45.50 × 100 = 4,550
  - payment_status field shown
  - Update query sets payment_status: "paid"

---

## Journey 5: Hotel Tracks Contract in History

### Scenario
Mumbai Palace manager tracks which contracts are active.

### Steps
1. **Login as Hotel Manager** → Dashboard
2. **Navigate** → "Supply Contracts"
3. **Tab**: "History" (1 active contract)
4. **See Contract**:
   - Crop: "Tomatoes"
   - From: "Raj Kumar"
   - Quantity: "100kg / weekly"
   - Duration: "2026-03-15 - 2026-04-14"
   - Status: "Active" (green badge) ✅
5. **Click** → "View Delivery Bill"
6. **Bill Shows** (read-only):
   - Same as farmer's bill
   - 100 kg × ₹45.50/kg = ₹4,550
   - Payment Status: UNPAID
   - Cannot mark paid (farmer marks it)

---

## Journey 6: Farmer Receives Notification

### Scenario
Farmer gets notified about contract acceptance.

### Steps
1. **Anywhere in app** → See Dashboard
2. **See bell icon** with red dot (if pending activities)
3. **Click** → Bell Icon
4. **Notification Panel Opens**:
   - Tab: "Pending" 
     - Shows new contracts awaiting action
   - Tab: "History"
     - Shows completed contracts
5. **See Contract Update**:
   - "Tomatoes Supply Contract activated!"
   - Status: "Active"
   - Qty: "100 kg/week"
   - Price: "₹45.50/kg"

### Notification Toast
- Toast appears: "A supply contract was activated. Billing is available in My Contracts."

---

## Journey 7: Complete Payment Cycle

### Timeline
1. **Mar 15**: Contract activated
   - Status: "active"
   - Payment: "unpaid"
   - Farmer notified

2. **Mar 15-22**: Delivery occurs
   - 100 kg of tomatoes delivered
   - Hotel receives goods

3. **Mar 23**: Hotel pays farmer
   - Hotel makes bank transfer

4. **Mar 24**: Farmer marks payment received
   - Login → My Contracts
   - View Bill → Mark as Paid
   - Payment Status: "paid" ✅

5. **Mar 24**: Both parties see payment confirmed
   - Farmer: Contract shows "paid"
   - Hotel: Same contract shows "paid"
   - Notification: "Supply contract payment marked as paid"

---

## Data Integrity

### Price is Locked at Acceptance
- Initial proposal: Farmer sets price
- Hotel accepts: Price is locked
- Cannot be changed after acceptance
- Ensures both parties agreed on exact terms

### Payment Verification
- Only farmer (seller) can mark as paid
- Hotel (buyer) cannot mark paid
- Prevents false payment claims
- RLS policies enforce this at database level

### Audit Trail
- created_at: When proposal first sent
- updated_at: When last status change occurred
- payment_status change logged
- Can track complete contract lifecycle

---

## Error Handling

### Farmer Props 0 Price
- ❌ Not allowed anymore
- Farmer must enter price > 0
- Dialog validates before submission

### Hotel Tries to Mark Paid
- ❌ Not allowed
- Button not shown in hotel view
- Backend RLS prevents update

### Farmer Deletes Crop Requirement
- Cannot delete once contract proposed
- Can only mark as "fulfilled" or reject proposal

---

## Summary

| Role | Can See | Can Do |
|------|---------|--------|
| **Hotel** | Own crop requirements | Post, edit, delete requirements |
| **Hotel** | Received proposals | View, accept, reject proposals |
| **Hotel** | Active contracts | View bills, track deliveries |
| **Farmer** | All requirements | Browse, propose contracts |
| **Farmer** | Sent proposals | Track status (pending→active) |
| **Farmer** | Active contracts | View bills, mark as paid |
| **Farmer** | Payment tracking | See payment status per contract |

All transactions tracked with prices, quantities, dates, and payment status!
