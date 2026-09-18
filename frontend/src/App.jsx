import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import VendorSection from './components/VendorSection';
import EventSection from './components/EventSection';
import BookingsView from './components/BookingsView';
import BookingModal from './components/BookingModal';
import AuthModal from './components/AuthModal';

import { 
  checkMicroservicesHealth, 
  getUser, 
  apiAuth, 
  apiVendors, 
  apiEvents, 
  apiBookings 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('vendors'); // 'vendors' | 'events' | 'bookings'
  const [user, setUser] = useState(getUser());
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Microservices connectivity
  const [backendHealth, setBackendHealth] = useState({
    identity: false,
    vendor: false,
    event: false,
    booking: false,
  });

  // Data states
  const [vendors, setVendors] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Booking Modal
  const [bookingTarget, setBookingTarget] = useState(null); // { vendor, service }

  // Initial load
  useEffect(() => {
    async function init() {
      // 1. Health check
      try {
        const health = await checkMicroservicesHealth();
        setBackendHealth(health);
      } catch (err) {
        console.warn('Backend health check skipped:', err);
      }

      // 2. Load Vendors
      try {
        setLoadingVendors(true);
        const data = await apiVendors.getAll();
        setVendors(data);
      } catch (err) {
        console.error('Failed to load vendors:', err);
      } finally {
        setLoadingVendors(false);
      }

      // 3. Load Events
      try {
        const evts = await apiEvents.getAll();
        setEvents(evts);
      } catch (err) {
        console.error('Failed to load events:', err);
      }

      // 4. Load Bookings
      try {
        const bks = await apiBookings.getMyBookings();
        setBookings(bks);
      } catch (err) {
        console.error('Failed to load bookings:', err);
      }
    }

    init();
  }, []);

  // Filter vendors based on category and search
  const filteredVendors = vendors.filter((v) => {
    const matchesCategory = selectedCategory === 'All' || 
      (v.category && v.category.toLowerCase() === selectedCategory.toLowerCase());
    
    const matchesSearch = !searchQuery || 
      (v.business_name && v.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.location && v.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Handle Event Creation
  const handleCreateEvent = async (eventData) => {
    const newEvent = await apiEvents.create(eventData);
    setEvents([newEvent, ...events]);
    return newEvent;
  };

  // Handle Booking Creation
  const handleConfirmBooking = async (bookingData) => {
    const newBooking = await apiBookings.create(bookingData);
    setBookings([newBooking, ...bookings]);
    return newBooking;
  };

  const handleLogout = () => {
    apiAuth.logout();
    setUser(null);
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        backendHealth={backendHealth}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'vendors' && (
          <>
            <HeroBanner
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onExploreVendors={() => {
                const el = document.getElementById('vendors-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <div id="vendors-grid">
              <VendorSection
                vendors={filteredVendors}
                loading={loadingVendors}
                onSelectBooking={(vendor, service) => {
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    setBookingTarget({ vendor, service });
                  }
                }}
              />
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <EventSection
            events={events}
            onCreateEvent={handleCreateEvent}
            user={user}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            bookings={bookings}
            onExploreVendors={() => setActiveTab('vendors')}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        padding: '30px 20px',
        textAlign: 'center',
        fontSize: '0.86rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>EventifyLK</strong> — Sri Lanka's Distributed Event & Vendor Marketplace.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Identity (:8001)</span>
            <span>Vendor (:8002)</span>
            <span>Event (:8003)</span>
            <span>Booking (:8004)</span>
          </div>
          <div>
            Built with React & FastAPI Microservices
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(u) => setUser(u)}
          onRegister={(data) => apiAuth.register(data)}
          onLogin={(email, pass) => apiAuth.login(email, pass)}
        />
      )}

      {bookingTarget && (
        <BookingModal
          vendor={bookingTarget.vendor}
          service={bookingTarget.service}
          onClose={() => setBookingTarget(null)}
          onConfirmBooking={handleConfirmBooking}
        />
      )}
    </div>
  );
}
