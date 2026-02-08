import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

const FloatingHelpButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...styles.button,
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          boxShadow: isHovered
            ? '0 6px 20px rgba(255, 107, 53, 0.4)'
            : '0 4px 12px rgba(255, 107, 53, 0.3)',
        }}
        title="Help & Feedback"
        aria-label="Help & Feedback"
      >
        <HelpCircle size={24} color="#ffffff" />
      </button>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

const styles = {
  button: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#FF6B35',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9990,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
};

export default FloatingHelpButton;
