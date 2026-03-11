import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/clerk";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import SelectRole from "./pages/SelectRole";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import FarmerDashboard from "./pages/dashboards/FarmerDashboard";
import HotelRestaurantDashboard from "./pages/dashboards/HotelRestaurantDashboard";
import EquipmentOwnerDashboard from "./pages/dashboards/EquipmentOwnerDashboard";
// Farmer sub-pages
import CropGuidancePage from "./pages/farmer/CropGuidancePage";
import MyCropListingsPage from "./pages/farmer/MyCropListingsPage";
import BrowseEquipmentPage from "./pages/farmer/BrowseEquipmentPage";
import WeatherAlertsPage from "./pages/farmer/WeatherAlertsPage";
import FarmerGroupsPage from "./pages/farmer/FarmerGroupsPage";
import FarmerGroupChatPage from "./pages/farmer/FarmerGroupChatPage";
import PurchaseRequestsPage from "./pages/farmer/PurchaseRequestsPage";
import HotelCropRequestsPage from "./pages/farmer/HotelCropRequestsPage";
import MyContractsPage from "./pages/farmer/MyContractsPage";
import RentalHistoryPage from "./pages/farmer/RentalHistoryPage";
import FindNearbyFarmersPage from "./pages/farmer/FindNearbyFarmersPage";
// Equipment Owner sub-pages
import MyEquipmentPage from "./pages/equipment/MyEquipmentPage";
import RentalRequestsPage from "./pages/equipment/RentalRequestsPage";
import BookingCalendarPage from "./pages/equipment/BookingCalendarPage";
import BrowseProducePage from "./pages/hotel/BrowseProducePage";
import MyCropRequirementsPage from "./pages/hotel/MyCropRequirementsPage";
import DeliveryTrackingPage from "./pages/hotel/DeliveryTrackingPage";
import PurchaseHistoryPage from "./pages/hotel/PurchaseHistoryPage";
import SupplyContractsPage from "./pages/hotel/SupplyContractsPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
);

const App = () => (
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
