import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

// Several modals can be open at once (or one can close while another opens).
// A simple counter makes sure the page scroll is only released when the
// LAST modal closes - otherwise the page could stay scroll-locked.
let openModalCount = 0;

const lockBodyScroll = () => {
  openModalCount += 1;
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  openModalCount = Math.max(0, openModalCount - 1);

  if (openModalCount === 0) {
    document.body.style.overflow = '';
  }
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px'
}) => {
  // Body scroll lock: only while open, always released on close/unmount.
  useEffect(() => {
    if (!isOpen) return undefined;

    lockBodyScroll();

    return unlockBodyScroll;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.modal} animate-scale-up`} 
        style={{ maxWidth }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
