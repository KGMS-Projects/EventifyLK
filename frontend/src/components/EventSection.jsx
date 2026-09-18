import React, { useState } from 'react';
import { Calendar, Plus, MapPin, Users, DollarSign, X } from 'lucide-react';

const EVENT_TYPES = ['Wedding', 'Corporate', 'Concert', 'Birthday', 'Exhibition', 'Party'];

export default function EventSection({ 
  events, 
  onCreateEvent, 
  user, 
  onOpenAuth 
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Wedding',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '18:00',
    location: 'Colombo',
    venue: '',
    description: '',
    expected_guests: 150,
    budget: 1500000,
    privacy: 'public'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateEvent(formData);
      setShowCreateModal(false);
      setFormData({
        name: '',
        type: 'Wedding',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '18:00',
        location: 'Colombo',
        venue: '',
        description: '',
        expected_guests: 150,
        budget: 1500000,
        privacy: 'public'
      });
    } catch (err) {
      alert('Error creating event: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const parseDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      day: d.getDate() || '15',
    };
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Grand Celebrations & Gatherings</h2>
          <p className="section-subtitle">
            Plan, organize, and browse public events happening across the island.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (!user) {
              onOpenAuth();
            } else {
              setShowCreateModal(true);
            }
          }}
        >
          <Plus size={16} /> Host an Event
        </button>
      </div>

      <div className="cards-grid">
        {events.map((evt) => {
          const { month, day } = parseDate(evt.date);
          return (
            <div key={evt.id} className="event-card">
              <span className="event-type-badge">{evt.type}</span>
              
              <div className="event-date-row">
                <div className="event-calendar-box">
                  <span className="calendar-month">{month}</span>
                  <span className="calendar-day">{day}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', lineHeight: 1.3 }}>{evt.name}</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{evt.time || 'All Day Event'}</span>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '18px', flex: 1 }}>
                {evt.description}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.84rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="var(--primary)" /> {evt.location}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} color="var(--accent)" /> {evt.expected_guests} Guests
                </div>
                {evt.budget && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: '1 / -1' }}>
                    <DollarSign size={14} color="var(--success)" /> Budget: LKR {Number(evt.budget).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800' }}>Create New Event</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input 
                  type="text" 
                  required
                  className="form-input" 
                  placeholder="e.g. Ruwan & Anuki's Wedding" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select 
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Event Date *</label>
                  <input 
                    type="date" 
                    required
                    className="form-input" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City / Region</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Colombo, Kandy, Galle" 
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Venue Name (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Galle Face Hotel" 
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expected Guests</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.expected_guests}
                    onChange={(e) => setFormData({ ...formData, expected_guests: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Budget (LKR)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Short Description</label>
                <textarea 
                  rows="3"
                  className="form-textarea"
                  placeholder="Share key details about this celebration..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
