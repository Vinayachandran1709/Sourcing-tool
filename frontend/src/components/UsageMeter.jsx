import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

const UsageMeter = ({ 
  label, 
  used, 
  limit, 
  icon: Icon,
  color = '#3b82f6'
}) => {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === -1;
  
  const getStatusColor = () => {
    if (isUnlimited) return color;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    return color;
  };

  const statusColor = getStatusColor();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.labelSection}>
          {Icon && (
            <div style={{...styles.iconBox, background: `${statusColor}15`}}>
              <Icon size={18} color={statusColor} />
            </div>
          )}
          <span style={styles.label}>{label}</span>
        </div>
        
        <div style={styles.valueSection}>
          {isUnlimited ? (
            <span style={{...styles.unlimited, color: statusColor}}>
              Unlimited
            </span>
          ) : (
            <>
              <span style={{...styles.used, color: statusColor}}>
                {used.toLocaleString()}
              </span>
              <span style={styles.separator}>/</span>
              <span style={styles.limit}>
                {limit.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${percentage}%`,
                background: statusColor
              }}
            />
          </div>

          <div style={styles.footer}>
            <span style={styles.percentage}>
              {percentage.toFixed(0)}% used
            </span>
            {percentage >= 90 && (
              <div style={styles.warning}>
                <AlertCircle size={14} color="#ef4444" />
                <span>Limit approaching</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.25rem',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },

  labelSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },

  iconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
  },

  valueSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.375rem',
  },

  used: {
    fontSize: '1.5rem',
    fontWeight: '700',
    lineHeight: 1,
  },

  separator: {
    fontSize: '1.125rem',
    color: '#d1d5db',
    fontWeight: '400',
  },

  limit: {
    fontSize: '1.125rem',
    color: '#9ca3af',
    fontWeight: '500',
  },

  unlimited: {
    fontSize: '1.125rem',
    fontWeight: '700',
  },

  progressBar: {
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.75rem',
  },

  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  percentage: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.8125rem',
    color: '#ef4444',
    fontWeight: '600',
  },
};

export default UsageMeter;