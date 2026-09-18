import React from 'react';
import { ShieldCheck, Calendar, Clock, MapPin, DollarSign, CheckCircle2 } from 'lucide-react';

export default function BookingsView({ bookings, onExploreVendors }) {
  if (!bookings || bookings.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        maxWidth: '700px',
        margin: '40px auto'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Calendar size={28} />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>No Active Bookings Yet</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.94rem' }}>
          Explore our verified vendors and lock in dates for your upcoming celebrations!
        </p>
        <button className="btn btn-primary" onClick={onExploreVendors}>
          Explore Top Vendors
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">My Event Bookings & Reservations</h2>
          <p className="section-subtitle">
            Track confirmed vendors, deposit payments, and event schedules.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {bookings.map((b) => (
          <div
            key={b.id}
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              transition: 'var(--transition-normal)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{b.vendor_name || 'Premier Vendor'}</h3>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={12} /> {b.status || 'Confirmed'}
                </span>
              </div>
              <div style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.92rem', marginBottom: '8px' }}>
                {b.service_name || 'Standard Package'}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} color="var(--accent)" /> {b.booking_date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={14} color="var(--primary)" /> Ref: {b.id.substring(0, 8)}
                </span>
              </div>
              {b.notes && (
                <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Note: "{b.notes}"
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Package Amount</div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff' }}>
                LKR {b.total_price?.toLocaleString() || '150,000'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: '600', marginTop: '2px' }}>
                Advance Deposit Locked
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
