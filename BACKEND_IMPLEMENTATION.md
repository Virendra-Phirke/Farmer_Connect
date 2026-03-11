# Farmer's Connect - Backend Implementation

## Authentication System

### Clerk Integration
- Clerk authentication is fully integrated with the provided API key
- Environment variable: `VITE_CLERK_PUBLISHABLE_KEY`
- Users can sign up and sign in using Clerk's authentication flow

### Supabase Integration
- User profiles are automatically synced from Clerk to Supabase
- Profile data includes: full_name, email, avatar_url
- Each user is linked via `clerk_user_id` field

## Database Schema

### Core Tables

1. **profiles**
   - Stores user information synced from Clerk
   - Fields: id, clerk_user_id, full_name, email, phone, location, land_size_acres, soil_type, avatar_url
   - RLS enabled with public read, authenticated write

2. **user_roles**
   - Stores user roles (farmer, buyer, equipment_owner)
   - Users can have multiple roles
   - RLS enabled with authenticated access

3. **farmer_groups**
   - Groups of farmers based on region and soil type
   - Fields: name, description, region, soil_type, created_by
   - RLS enabled for viewing and member management

4. **farmer_group_members**
   - Junction table for group membership
   - RLS enabled for joining/leaving groups

5. **crop_recommendations**
   - Pre-populated with 24+ crop recommendations
   - Organized by soil_type (loamy, clay, sandy, black) and season (kharif, rabi, zaid)
   - Includes seed varieties, fertilizer info, expected yields
   - Public read access

6. **crop_listings**
   - Farmers can list their produce for sale
   - Fields: crop_name, quantity_kg, price_per_kg, description, status
   - Status: available, reserved, sold
   - RLS enabled for farmers to manage their listings

7. **equipment_listings**
   - Equipment owners can list machinery for rent
   - Fields: name, category, price_per_day, location, is_available
   - RLS enabled for owners to manage listings

8. **buyer_connections**
   - Connects buyers with farmers
   - Status: pending, accepted, rejected
   - RLS enabled for both parties to manage connections

9. **weather_alerts**
   - Weather information by region
   - Severity levels: info, warning, critical
   - Public read access

## API Modules

All API functions are located in `/src/lib/api/`:

### Authentication (`supabase-auth.ts`)
- `syncClerkUserToSupabase()` - Sync user from Clerk
- `setUserRole()` - Set user role
- `getUserRole()` - Get user role
- `getUserProfile()` - Get user profile
- `updateUserProfile()` - Update user profile

### Crop Listings (`crop-listings.ts`)
- `getCropListings()` - Get all listings with filters
- `getCropListingById()` - Get single listing
- `createCropListing()` - Create new listing
- `updateCropListing()` - Update listing
- `deleteCropListing()` - Delete listing

### Equipment Listings (`equipment-listings.ts`)
- `getEquipmentListings()` - Get all equipment with filters
- `getEquipmentListingById()` - Get single equipment
- `createEquipmentListing()` - Create new listing
- `updateEquipmentListing()` - Update listing
- `deleteEquipmentListing()` - Delete listing

### Farmer Groups (`farmer-groups.ts`)
- `getFarmerGroups()` - Get all groups with filters
- `getFarmerGroupById()` - Get group details with members
- `createFarmerGroup()` - Create new group
- `updateFarmerGroup()` - Update group
- `deleteFarmerGroup()` - Delete group
- `joinFarmerGroup()` - Join a group
- `leaveFarmerGroup()` - Leave a group
- `getUserGroups()` - Get user's groups

### Crop Recommendations (`crop-recommendations.ts`)
- `getCropRecommendations()` - Get recommendations with filters
- `getCropRecommendationById()` - Get single recommendation
- `createCropRecommendation()` - Create recommendation
- `updateCropRecommendation()` - Update recommendation
- `deleteCropRecommendation()` - Delete recommendation

### Buyer Connections (`buyer-connections.ts`)
- `getBuyerConnections()` - Get connections with filters
- `getBuyerConnectionById()` - Get single connection
- `createBuyerConnection()` - Create connection request
- `updateBuyerConnection()` - Update connection status
- `deleteBuyerConnection()` - Delete connection

### Weather Alerts (`weather-alerts.ts`)
- `getWeatherAlerts()` - Get alerts with filters
- `getWeatherAlertById()` - Get single alert
- `createWeatherAlert()` - Create alert
- `updateWeatherAlert()` - Update alert
- `deleteWeatherAlert()` - Delete alert

## React Query Hooks

Custom hooks for data fetching (located in `/src/hooks/`):

### Crop Listings
- `useCropListings()` - Fetch listings
- `useCropListing()` - Fetch single listing
- `useCreateCropListing()` - Create listing mutation
- `useUpdateCropListing()` - Update listing mutation
- `useDeleteCropListing()` - Delete listing mutation

### Equipment Listings
- `useEquipmentListings()` - Fetch equipment
- `useEquipmentListing()` - Fetch single equipment
- `useCreateEquipmentListing()` - Create mutation
- `useUpdateEquipmentListing()` - Update mutation
- `useDeleteEquipmentListing()` - Delete mutation

### Farmer Groups
- `useFarmerGroups()` - Fetch groups
- `useFarmerGroup()` - Fetch single group
- `useUserGroups()` - Fetch user's groups
- `useCreateFarmerGroup()` - Create mutation
- `useUpdateFarmerGroup()` - Update mutation
- `useDeleteFarmerGroup()` - Delete mutation
- `useJoinFarmerGroup()` - Join mutation
- `useLeaveFarmerGroup()` - Leave mutation

## Security (RLS Policies)

All tables have Row Level Security enabled with appropriate policies:

1. **Profiles** - Public read, users can update their own
2. **User Roles** - Public read, users can manage their roles
3. **Farmer Groups** - Public read, members can manage
4. **Equipment Listings** - Public read available items, owners manage their own
5. **Crop Listings** - Public read available items, farmers manage their own
6. **Crop Recommendations** - Public read, authenticated users can manage
7. **Weather Alerts** - Public read, authenticated users can create
8. **Buyer Connections** - Users can view/manage their own connections

## Authentication Flow

1. User signs up/signs in via Clerk
2. After authentication, user is redirected to `/auth-callback`
3. System checks if user has a role in Supabase
4. If no role exists, redirect to `/select-role`
5. User selects their role (farmer, buyer, or equipment_owner)
6. Profile and role are synced to Supabase
7. User is redirected to `/dashboard`

## Environment Variables

Required environment variables in `.env`:

```
VITE_SUPABASE_URL=https://malfnaqoywdxuqyergjp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_a2Vlbi1odW1wYmFjay0yNy5jbGVyay5hY2NvdW50cy5kZXYk
```

## Sample Data

The database includes 24+ crop recommendations covering:
- **Soil Types**: Loamy, Clay, Sandy, Black
- **Seasons**: Kharif, Rabi, Zaid
- **Information**: Seed varieties, fertilizer requirements, expected yields, cultivation notes

## Testing the Backend

1. Sign up as a new user
2. Select a role (farmer, buyer, or equipment_owner)
3. Access the dashboard
4. Use browser developer tools to test API calls
5. Check Supabase dashboard for data persistence

## Next Steps for Frontend Integration

1. Create listing management pages for farmers
2. Create equipment rental pages
3. Create buyer marketplace pages
4. Implement crop recommendation viewer
5. Add weather alerts display
6. Implement group chat/messaging
7. Add notification system
8. Implement search and filtering

## API Usage Examples

```typescript
// Get crop listings for a specific farmer
const { data: listings } = useCropListings({ farmer_id: profileId });

// Create a new crop listing
const createMutation = useCreateCropListing();
createMutation.mutate({
  farmer_id: profileId,
  crop_name: "Wheat",
  quantity_kg: 1000,
  price_per_kg: 25,
  description: "Fresh organic wheat",
  status: "available"
});

// Get crop recommendations for loamy soil in kharif season
const recommendations = await getCropRecommendations({
  soil_type: "loamy",
  season: "kharif"
});

// Join a farmer group
const joinMutation = useJoinFarmerGroup();
joinMutation.mutate({ groupId, profileId });
```

## Database Queries

All queries use Supabase client with proper error handling:

```typescript
const { data, error } = await supabase
  .from("crop_listings")
  .select("*, farmer:profiles(*)")
  .eq("status", "available")
  .order("created_at", { ascending: false });
```

## Error Handling

- All API functions throw errors that can be caught by React Query
- Console logging for debugging
- User-friendly error messages via toast notifications
