import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/clerk';
import { Loader2 } from 'lucide-react';
import { initializeTheme } from '@/lib/theme';

import Index from './pages/Index';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import SelectRole from './pages/SelectRole';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';

// Lazy load larger dashboard / sub-pages
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FarmerDashboard = lazy(() => import('./pages/dashboards/FarmerDashboard'));
const HotelRestaurantDashboard = lazy(() => import('./pages/dashboards/HotelRestaurantDashboard'));
const EquipmentOwnerDashboard = lazy(() => import('./pages/dashboards/EquipmentOwnerDashboard'));

// Farmer sub-pages
const CropGuidancePage = lazy(() => import('./pages/farmer/CropGuidancePage'));
const MyCropListingsPage = lazy(() => import('./pages/farmer/MyCropListingsPage'));
const BrowseEquipmentPage = lazy(() => import('./pages/farmer/BrowseEquipmentPage'));
const WeatherAlertsPage = lazy(() => import('./pages/farmer/WeatherAlertsPage'));
const FarmerGroupsPage = lazy(() => import('./pages/farmer/FarmerGroupsPage'));
const FarmerGroupChatPage = lazy(() => import('./pages/farmer/FarmerGroupChatPage'));
const PurchaseRequestsPage = lazy(() => import('./pages/farmer/PurchaseRequestsPage'));
const HotelCropRequestsPage = lazy(() => import('./pages/farmer/HotelCropRequestsPage'));
const MyContractsPage = lazy(() => import('./pages/farmer/MyContractsPage'));
const RentalHistoryPage = lazy(() => import('./pages/farmer/RentalHistoryPage'));
const FindNearbyFarmersPage = lazy(() => import('./pages/farmer/FindNearbyFarmersPage'));

// Equipment Owner sub-pages
const MyEquipmentPage = lazy(() => import('./pages/equipment/MyEquipmentPage'));
const RentalRequestsPage = lazy(() => import('./pages/equipment/RentalRequestsPage'));
const BookingCalendarPage = lazy(() => import('./pages/equipment/BookingCalendarPage'));

// Hotel/Restaurant sub-pages
const BrowseProducePage = lazy(() => import('./pages/hotel/BrowseProducePage'));
const MyCropRequirementsPage = lazy(() => import('./pages/hotel/MyCropRequirementsPage'));
const DeliveryTrackingPage = lazy(() => import('./pages/hotel/DeliveryTrackingPage'));
const PurchaseHistoryPage = lazy(() => import('./pages/hotel/PurchaseHistoryPage'));
const SupplyContractsPage = lazy(() => import('./pages/hotel/SupplyContractsPage'));
const HotelBillingPage = lazy(() => import('./pages/hotel/BillingPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is never considered stale globally. It will never auto-refetch.
      // Real-time operations (like chat) will handle their own updates.
      // For standard data, rely on the exact manual user refresh or explicit invalidation.
      staleTime: Infinity,
      gcTime: 24 * 60 * 60 * 1000, // 24 hours cache time
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
);

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        routerPush={(to) => window.location.assign(to)}
        routerReplace={(to) => window.location.replace(to)}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/sign-in/*" element={<SignIn />} />
                  <Route path="/sign-up/*" element={<SignUp />} />
                  <Route path="/auth-callback" element={<ProtectedRoute><AuthCallback /></ProtectedRoute>} />
                  <Route path="/select-role" element={<ProtectedRoute><SelectRole /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

                  {/* Dashboard home pages */}
                  <Route path="/farmer-dashboard" element={<ProtectedRoute><FarmerDashboard /></ProtectedRoute>} />
                  <Route path="/hotel-dashboard" element={<ProtectedRoute><HotelRestaurantDashboard /></ProtectedRoute>} />
                  <Route path="/equipment-dashboard" element={<ProtectedRoute><EquipmentOwnerDashboard /></ProtectedRoute>} />

                  {/* Farmer sub-pages */}
                  <Route path="/farmer/crop-guidance" element={<ProtectedRoute><CropGuidancePage /></ProtectedRoute>} />
                  <Route path="/farmer/my-listings" element={<ProtectedRoute><MyCropListingsPage /></ProtectedRoute>} />
                  <Route path="/farmer/browse-equipment" element={<ProtectedRoute><BrowseEquipmentPage /></ProtectedRoute>} />
                  <Route path="/farmer/rental-history" element={<ProtectedRoute><RentalHistoryPage /></ProtectedRoute>} />
                  <Route path="/farmer/weather-alerts" element={<ProtectedRoute><WeatherAlertsPage /></ProtectedRoute>} />
                  <Route path="/farmer/groups" element={<ProtectedRoute><FarmerGroupsPage /></ProtectedRoute>} />
                  <Route path="/farmer/groups/:id" element={<ProtectedRoute><FarmerGroupChatPage /></ProtectedRoute>} />
                  <Route path="/farmer/purchase-requests" element={<ProtectedRoute><PurchaseRequestsPage /></ProtectedRoute>} />
                  <Route path="/farmer/hotel-requests" element={<ProtectedRoute><HotelCropRequestsPage /></ProtectedRoute>} />
                  <Route path="/farmer/contracts" element={<ProtectedRoute><MyContractsPage /></ProtectedRoute>} />
                  <Route path="/farmer/nearby" element={<ProtectedRoute><FindNearbyFarmersPage /></ProtectedRoute>} />

                  {/* Equipment Owner sub-pages */}
                  <Route path="/equipment/my-equipment" element={<ProtectedRoute><MyEquipmentPage /></ProtectedRoute>} />
                  <Route path="/equipment/rental-requests" element={<ProtectedRoute><RentalRequestsPage /></ProtectedRoute>} />
                  <Route path="/equipment/bookings" element={<ProtectedRoute><BookingCalendarPage /></ProtectedRoute>} />

                  {/* Hotel/Restaurant sub-pages */}
                  <Route path="/hotel/browse-produce" element={<ProtectedRoute><BrowseProducePage /></ProtectedRoute>} />
                  <Route path="/hotel/purchase-history" element={<ProtectedRoute><PurchaseHistoryPage /></ProtectedRoute>} />
                  <Route path="/hotel/my-requirements" element={<ProtectedRoute><MyCropRequirementsPage /></ProtectedRoute>} />
                  <Route path="/hotel/delivery-tracking" element={<ProtectedRoute><DeliveryTrackingPage /></ProtectedRoute>} />
                  <Route path="/hotel/contracts" element={<ProtectedRoute><SupplyContractsPage /></ProtectedRoute>} />
                  <Route path="/hotel/billing" element={<ProtectedRoute><HotelBillingPage /></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
};

export default App;
