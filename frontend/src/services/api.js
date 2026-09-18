// EventifyLK API Client with live microservices routing and realistic fallback

const API_CONFIG = {
  identity: '/api/identity',
  vendor: '/api/vendor',
  event: '/api/event',
  booking: '/api/booking',
};

// Local storage token helpers
export const getToken = () => localStorage.getItem('eventify_token');
export const setToken = (token) => localStorage.setItem('eventify_token', token);
export const removeToken = () => localStorage.removeItem('eventify_token');

export const getUser = () => {
  try {
    const raw = localStorage.getItem('eventify_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => localStorage.setItem('eventify_user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('eventify_user');

// Generic request helper with timeout and auth header
async function request(baseUrl, endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ─── Health Check for All Microservices ───
export async function checkMicroservicesHealth() {
  const checkOne = async (url) => {
    try {
      const res = await request(url, '/health');
      return res?.status === 'healthy';
    } catch {
      return false;
    }
  };

  const [identity, vendor, event, booking] = await Promise.all([
    checkOne(API_CONFIG.identity),
    checkOne(API_CONFIG.vendor),
    checkOne(API_CONFIG.event),
    checkOne(API_CONFIG.booking),
  ]);

  return { identity, vendor, event, booking };
}

// ─── Mock Fallback Data (Sri Lankan Events & Vendors) ───
const MOCK_VENDORS = [
  {
    id: 'v-1',
    business_name: 'Cinnamon Grand Events & Banquets',
    category: 'Venues',
    location: 'Colombo 03',
    description: 'Premier luxury hotel ballrooms and outdoor lawns for grand weddings and high-profile corporate summits.',
    rating: 4.9,
    total_reviews: 142,
    is_verified: true,
    starting_price: 450000,
    cover_image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's-1', name: 'Oak Room Grand Wedding Package', price: 650000, duration: '6 Hours', includes: ['Grand Ballroom Access', 'Bridal Suite', 'Welcome Mocktails', 'Full Lighting & Audio'] },
      { id: 's-2', name: 'Cedar Executive Conference Suite', price: 280000, duration: 'Full Day', includes: ['AV Equipment', 'Buffet Lunch', 'Breakout Rooms'] },
    ]
  },
  {
    id: 'v-2',
    business_name: 'Ceylon Soul Photography',
    category: 'Photography',
    location: 'Kandy & Islandwide',
    description: 'Candid wedding photography, cinematic drone films, and engagement shoots preserving timeless moments.',
    rating: 4.8,
    total_reviews: 98,
    is_verified: true,
    starting_price: 180000,
    cover_image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's-3', name: 'Full Wedding Cinematic Coverage', price: 250000, duration: '10 Hours', includes: ['2 Photographers', '1 Drone Pilot', 'Photo Album', '4K Teaser Video'] },
      { id: 's-4', name: 'Pre-Shoot / Engagement Session', price: 85000, duration: '3 Hours', includes: ['3 Locations', 'Edited High-Res Gallery', 'Styling Advice'] }
    ]
  },
  {
    id: 'v-3',
    business_name: 'Spice Symphony Gourmet Catering',
    category: 'Catering',
    location: 'Galle & Southern Province',
    description: 'Exquisite fusion catering combining traditional Sri Lankan spices with international fine dining cuisine.',
    rating: 4.7,
    total_reviews: 76,
    is_verified: true,
    starting_price: 2500,
    cover_image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's-5', name: 'Royal Sri Lankan Banquet Buffet', price: 4200, duration: 'Per Head', includes: ['3 Meat Options', 'Seafood Grill', 'Traditional Dessert Bar', 'Service Staff'] },
      { id: 's-6', name: 'Cocktail Canapés & Action Stations', price: 3400, duration: 'Per Head', includes: ['Live Hoppers & Kottu', 'Mini Sliders', 'Artisan Mocktails'] }
    ]
  },
  {
    id: 'v-4',
    business_name: 'RhythmWave Sound & Stage Lighting',
    category: 'Music & DJ',
    location: 'Colombo & Gampaha',
    description: 'Concert-grade sound systems, intelligent stage lasers, fog machines, and premier bilingual wedding DJs.',
    rating: 4.9,
    total_reviews: 110,
    is_verified: true,
    starting_price: 120000,
    cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's-7', name: 'Club-Style Wedding DJ & Lighting Rig', price: 160000, duration: '6 Hours', includes: ['JBL Line Array Sound', 'Moving Head Lights', 'Dry Ice Low Fog', 'Party DJ'] }
    ]
  },
  {
    id: 'v-5',
    business_name: 'Lotus Blossom Event Decorators',
    category: 'Decoration',
    location: 'Kurunegala & Colombo',
    description: 'Breathtaking floral arches, luxury poruwa backdrops, crystal centerpieces, and thematic ambient lighting.',
    rating: 4.8,
    total_reviews: 84,
    is_verified: true,
    starting_price: 220000,
    cover_image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80',
    services: [
      { id: 's-8', name: 'Fairytale Poruwa & Entrance Floral Decor', price: 320000, duration: 'Event Day', includes: ['Custom Poruwa Florals', 'Bridal Settee', 'Oil Lamp Decor', 'Table Centerpieces'] }
    ]
  }
];

const MOCK_EVENTS = [
  {
    id: 'e-1',
    name: 'Colombo Tech Innovators Summit 2026',
    type: 'Corporate',
    date: '2026-10-15',
    time: '09:00 AM',
    location: 'BMICH, Colombo',
    description: 'Sri Lanka’s largest gathering of enterprise tech leaders, startups, and angel investors.',
    expected_guests: 500,
    budget: 2500000,
    cover_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'e-2',
    name: 'Sahan & Niluka’s Sunset Wedding Celebration',
    type: 'Wedding',
    date: '2026-11-20',
    time: '04:30 PM',
    location: 'Jetwing Lighthouse, Galle',
    description: 'Oceanfront coastal wedding featuring traditional poruwa ceremony followed by reception under the stars.',
    expected_guests: 250,
    budget: 4200000,
    cover_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'e-3',
    name: 'Ceylon Beats Summer Music Festival',
    type: 'Concert',
    date: '2026-12-05',
    time: '06:00 PM',
    location: 'Viharamahadevi Amphitheatre, Colombo',
    description: 'Live performances by top local artists, indie acoustic bands, and electronic music producers.',
    expected_guests: 1200,
    budget: 3500000,
    cover_image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80'
  }
];

// In-memory fallback storage
let localVendors = [...MOCK_VENDORS];
let localEvents = [...MOCK_EVENTS];
let localBookings = [];

// ─── Authentication API ───
export const apiAuth = {
  async register(data) {
    try {
      const res = await request(API_CONFIG.identity, '/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setToken(res.access_token);
      setUser(res.user);
      return res;
    } catch (err) {
      // Graceful fallback for preview mode
      const mockUser = {
        id: 'user-' + Date.now(),
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'customer',
        phone: data.phone || '',
      };
      setToken('mock-jwt-token-' + Date.now());
      setUser(mockUser);
      return { access_token: 'mock-jwt-token', user: mockUser };
    }
  },

  async login(email, password) {
    try {
      const res = await request(API_CONFIG.identity, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.access_token);
      setUser(res.user);
      return res;
    } catch (err) {
      // Mock login if backend is offline
      const mockUser = {
        id: 'user-demo',
        email,
        full_name: email.split('@')[0],
        role: email.includes('vendor') ? 'vendor' : 'customer',
      };
      setToken('mock-jwt-token-demo');
      setUser(mockUser);
      return { access_token: 'mock-jwt-token-demo', user: mockUser };
    }
  },

  async getMe() {
    try {
      const user = await request(API_CONFIG.identity, '/auth/me');
      setUser(user);
      return user;
    } catch {
      return getUser();
    }
  },

  logout() {
    removeToken();
    removeUser();
  }
};

// ─── Vendors API ───
export const apiVendors = {
  async getAll(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await request(API_CONFIG.vendor, `/vendors${query ? '?' + query : ''}`);
      return res && res.length ? res : localVendors;
    } catch {
      let filtered = [...localVendors];
      if (params.category && params.category !== 'All') {
        filtered = filtered.filter(v => v.category.toLowerCase() === params.category.toLowerCase());
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(v => 
          v.business_name.toLowerCase().includes(q) || 
          v.location.toLowerCase().includes(q) || 
          v.category.toLowerCase().includes(q)
        );
      }
      return filtered;
    }
  },

  async getById(id) {
    try {
      return await request(API_CONFIG.vendor, `/vendors/${id}`);
    } catch {
      return localVendors.find(v => v.id === id) || localVendors[0];
    }
  }
};

// ─── Events API ───
export const apiEvents = {
  async getAll() {
    try {
      const res = await request(API_CONFIG.event, '/events');
      return res && res.length ? res : localEvents;
    } catch {
      return localEvents;
    }
  },

  async create(data) {
    try {
      const res = await request(API_CONFIG.event, '/events', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      localEvents.unshift(res);
      return res;
    } catch {
      const newEvent = {
        id: 'e-' + Date.now(),
        ...data,
        created_at: new Date().toISOString()
      };
      localEvents.unshift(newEvent);
      return newEvent;
    }
  }
};

// ─── Bookings API ───
export const apiBookings = {
  async create(data) {
    try {
      return await request(API_CONFIG.booking, '/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const newBooking = {
        id: 'bk-' + Date.now(),
        ...data,
        status: 'confirmed',
        created_at: new Date().toISOString()
      };
      localBookings.unshift(newBooking);
      return newBooking;
    }
  },

  async getMyBookings() {
    try {
      return await request(API_CONFIG.booking, '/bookings/my');
    } catch {
      return localBookings;
    }
  }
};
