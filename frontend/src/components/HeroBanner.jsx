import React from 'react';
import { Search, MapPin, Sparkles, Award, ShieldCheck, Users, HeartHandshake } from 'lucide-react';

const CATEGORIES = ['All', 'Venues', 'Photography', 'Catering', 'Music & DJ', 'Decoration'];

export default function HeroBanner({ 
  searchQuery, 
  setSearchQuery, 
  selectedCategory, 
  setSelectedCategory,
  onExploreVendors
}) {
  return (
    <section className="hero">
      {/* Eyebrow Tag */}
      <div className="hero-tag">
        <Sparkles size={14} /> Sri Lanka's Premier Event & Vendor Ecosystem
      </div>

      {/* Hero Title */}
      <h1 className="hero-title">
        Plan Extraordinary Celebrations With <span className="hero-highlight">Verified Islandwide Vendors</span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        From breathtaking beachside weddings in Galle to grand corporate galas in Colombo, 
        discover trusted venues, caterers, photographers, and entertainers with instant reservations.
      </p>

      {/* Quick Search Bar */}
      <div className="search-box">
        <div className="search-field">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search vendor name, service (e.g. Wedding Hall, DJ)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="search-divider"></div>
        <div className="search-field">
          <MapPin size={18} />
          <input 
            type="text" 
            placeholder="Location (e.g. Colombo, Kandy, Galle)..." 
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={onExploreVendors}>
          Find Vendors
        </button>
      </div>

      {/* Category Pills */}
      <div className="category-pills">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats Counter */}
      <div className="hero-stats">
        <div className="stat-card">
          <div className="stat-num">500+</div>
          <div className="stat-label">Verified LK Vendors</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">12,500+</div>
          <div className="stat-label">Events Hosted</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">99.8%</div>
          <div className="stat-label">Booking Reliability</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">4.9 ★</div>
          <div className="stat-label">Average Satisfaction</div>
        </div>
      </div>
    </section>
  );
}
