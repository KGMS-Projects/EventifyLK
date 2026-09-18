import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';

export default function BookingModal({ 
  vendor, 
  service, 
  onClose, 
  onConfirmBooking 
}) {
  const [bookingDate, setBookingDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const price = service?.price || vendor?.starting_price || 150000;
  const platformFee = price * 0.10; // 10% platform commission matching backend
  const deposit = price * 0.10;
  const total = price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await onConfirmBooking({
        vendor_id: vendor.id,
        service_id: service?.id,
        booking_date: bookingDate,
        notes: notes,
        total_price: total,
        deposit_amount: deposit,
        vendor_name: vendor.business_name,
        service_name: service?.name || 'Custom Package',
      });
      setConfirmedBooking(result);
    } catch (err) {
      alert('Booking error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800' }}>
              {confirmedBooking ? 'Reservation Confirmed!' : 'Reserve Vendor Service'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
              Pessimistic date locking via EventSphere Booking Engine
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {confirmedBooking ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px' }}>
              Your Booking is Locked!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              A reservation request for <strong>{vendor.business_name}</strong> on <strong>{bookingDate}</strong> has been created.
            </p>

            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'left',
              fontSize: '0.86rem',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking Reference:</span>
                <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{confirmedBooking.id || 'BK-7892'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Service Package:</span>
                <span style={{ fontWeight: '600' }}>{service?.name || 'Selected Package'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Deposit Paid:</span>
                <span style={{ fontWeight: '700', color: 'var(--success)' }}>LKR {deposit.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: 'var(--accent)', fontWeight: '700' }}>Active & Confirmed</span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Selected Summary Card */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vendor & Package
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                {vendor.business_name}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>
                {service?.name || 'Selected Service'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Event Date *</label>
              <input 
                type="date"
                required
                className="form-input"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Special Requests / Requirements</label>
              <textarea 
                rows="3"
                className="form-textarea"
                placeholder="Specify venue access times, dietary requirements, theme colors..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            {/* Financial Breakdown */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service Subtotal:</span>
                <span>LKR {price.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Eventify Platform Fee (10%):</span>
                <span>LKR {platformFee.toLocaleString()}</span>
              </div>
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '8px', 
                borderTop: '1px solid var(--border-subtle)',
                fontWeight: '700',
                fontSize: '1rem'
              }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--accent)' }}>LKR {total.toLocaleString()}</span>
              </div>
              <div style={{ 
                marginTop: '10px', 
                fontSize: '0.78rem', 
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={14} color="var(--success)" />
                Advance deposit required to lock date: <strong>LKR {deposit.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-accent" disabled={submitting}>
                <CreditCard size={16} /> {submitting ? 'Locking Date...' : `Confirm & Lock Date`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
