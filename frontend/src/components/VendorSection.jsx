import React, { useState } from 'react';
import { Star, MapPin, CheckCircle2, ChevronRight, X, Clock, Check } from 'lucide-react';

export default function VendorSection({ 
  vendors, 
  loading, 
  onSelectBooking 
}) {
  const [activeVendorModal, setActiveVendorModal] = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
        <div className="pulse-dot online" style={{ margin: '0 auto 16px', width: '16px', height: '16px' }}></div>
        <p>Loading premier vendors across Sri Lanka...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Verified Vendors & Event Specialists</h2>
          <p className="section-subtitle">
            Curated venues, top photographers, gourmet caterers, and entertainers ready for your date.
          </p>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)'
        }}>
          <h3>No vendors found</h3>
          <p style={{ marginTop: '8px' }}>Try adjusting your search criteria or category filter.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="vendor-card">
              {/* Media */}
              <div 
                className="card-media" 
                style={{ backgroundImage: `url(${vendor.cover_image || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'})` }}
              >
                <div className="card-media-overlay"></div>
                {vendor.is_verified && (
                  <div className="card-badge verified">
                    <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Verified LK
                  </div>
                )}
                <div className="card-rating">
                  <Star size={13} fill="#fbbf24" stroke="none" />
                  <span>{vendor.rating ? vendor.rating.toFixed(1) : '5.0'}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="card-body">
                <h3 className="card-title">{vendor.business_name}</h3>
                <div className="card-meta">
                  <div className="card-meta-item">
                    <span style={{ 
                      padding: '2px 8px', 
                      background: 'rgba(99, 102, 241, 0.15)', 
                      color: '#a5b4fc', 
                      borderRadius: '4px', 
                      fontSize: '0.78rem',
                      fontWeight: '700'
                    }}>
                      {vendor.category}
                    </span>
                  </div>
                  <div className="card-meta-item">
                    <MapPin size={14} /> {vendor.location}
                  </div>
                </div>

                <p className="card-desc">{vendor.description}</p>

                <div className="card-footer">
                  <div className="card-price">
                    Starting from
                    <strong>LKR {vendor.starting_price?.toLocaleString() || '150,000'}</strong>
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveVendorModal(vendor)}
                  >
                    View Packages <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor Details & Packages Modal */}
      {activeVendorModal && (
        <div className="modal-overlay" onClick={() => setActiveVendorModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: '800' }}>{activeVendorModal.business_name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: '700' }}>★ {activeVendorModal.rating?.toFixed(1) || '5.0'} ({activeVendorModal.total_reviews || 45} reviews)</span>
                  <span>•</span>
                  <span><MapPin size={13} style={{ display: 'inline' }} /> {activeVendorModal.location}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setActiveVendorModal(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.92rem' }}>
              {activeVendorModal.description}
            </p>

            <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Available Services & Packages
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(activeVendorModal.services || [
                { id: 's-def-1', name: 'Standard Full Package', price: activeVendorModal.starting_price || 150000, duration: 'Event Day', includes: ['Dedicated Event Coordinator', 'Full Setup & Teardown', 'Standard Equipment'] }
              ]).map((service) => (
                <div 
                  key={service.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h5 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{service.name}</h5>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <Clock size={12} /> {service.duration}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)' }}>
                        LKR {service.price.toLocaleString()}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>10% advance deposit</span>
                    </div>
                  </div>

                  {service.includes && service.includes.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                      {service.includes.map((inc, idx) => (
                        <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={13} color="var(--success)" /> {inc}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const vendor = activeVendorModal;
                        setActiveVendorModal(null);
                        onSelectBooking(vendor, service);
                      }}
                    >
                      Book This Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
