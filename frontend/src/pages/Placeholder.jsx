import { Briefcase, Eye, HelpCircle, Settings } from 'lucide-react';

export default function Placeholder({ title, icon: Icon, description }) {
  return (
    <div className="page-content">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: 'var(--color-slate)', textAlign: 'center' }}>
        <Icon size={56} strokeWidth={1} style={{ opacity: 0.3 }} />
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>{title}</h2>
          <p style={{ fontSize: '14px', maxWidth: '360px', lineHeight: '1.6' }}>{description}</p>
        </div>
        <span className="badge badge-blue" style={{ fontSize: '12px', padding: '4px 12px' }}>Coming Soon</span>
      </div>
    </div>
  );
}
