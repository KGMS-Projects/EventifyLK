import React, { useState } from 'react';
import { Calendar, User, ShieldCheck, LogOut, Sparkles, Activity, Layers } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  user, 
  onOpenAuth, 
  onLogout,
  backendHealth 
}) {
  const [showHealthTooltip, setShowHealthTooltip] = useState(false);

  const isAnyLive = Object.values(backendHealth).some(v => v);
  const liveCount = Object.values(backendHealth).filter(v => v).length;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand-logo" onClick={() => setActiveTab('vendors')}>
          <div className="logo-badge">
            <Sparkles size={20} />
          </div>
          <span className="brand-text">Eventify<span className="brand-suffix">LK</span></span>
        </div>

        {/* Nav Links */}
        <nav>
          <ul className="nav-links">
            <li 
              className={`nav-link ${activeTab === 'vendors' ? 'active' : ''}`}
              onClick={() => setActiveTab('vendors')}
            >
              <Layers size={16} /> Vendors & Services
            </li>
            <li 
              className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              <Calendar size={16} /> Events
            </li>
            {user && (
              <li 
                className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                <ShieldCheck size={16} /> My Bookings
              </li>
            )}
          </ul>
        </nav>

        {/* Right side actions */}
        <div className="nav-actions">
          {/* Microservices Status Indicator */}
          <div 
            className="services-indicator"
            onMouseEnter={() => setShowHealthTooltip(true)}
            onMouseLeave={() => setShowHealthTooltip(false)}
            onClick={() => setShowHealthTooltip(!showHealthTooltip)}
            style={{ position: 'relative' }}
          >
            <span className={`pulse-dot ${isAnyLive ? 'online' : 'demo'}`}></span>
            <span>{isAnyLive ? `${liveCount}/4 Services Live` : 'Demo / Local Preview'}</span>

            {showHealthTooltip && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '230px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-glow)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
                fontSize: '0.8rem',
                color: 'var(--text-primary)'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={14} color="var(--primary)" /> Microservices Status
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Identity (:8001)</span>
                    <span style={{ color: backendHealth.identity ? 'var(--success)' : 'var(--accent)' }}>
                      {backendHealth.identity ? 'Online' : 'Mock'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vendor (:8002)</span>
                    <span style={{ color: backendHealth.vendor ? 'var(--success)' : 'var(--accent)' }}>
                      {backendHealth.vendor ? 'Online' : 'Mock'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Event (:8003)</span>
                    <span style={{ color: backendHealth.event ? 'var(--success)' : 'var(--accent)' }}>
                      {backendHealth.event ? 'Online' : 'Mock'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Booking (:8004)</span>
                    <span style={{ color: backendHealth.booking ? 'var(--success)' : 'var(--accent)' }}>
                      {backendHealth.booking ? 'Online' : 'Mock'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Auth Button */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.88rem'
              }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span style={{ fontWeight: '600' }}>{user.full_name}</span>
                <span style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: user.role === 'vendor' ? 'var(--accent-light)' : 'var(--primary-light)',
                  color: user.role === 'vendor' ? 'var(--accent)' : '#a5b4fc',
                  fontWeight: '700'
                }}>
                  {user.role}
                </span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={onLogout}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
              <User size={15} /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
