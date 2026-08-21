import React from 'react';
import styles from './Card.module.css';

const Card = ({ 
  children, 
  title, 
  subtitle,
  actions,
  className = '', 
  hoverable = false 
}) => {
  return (
    <div className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`}>
      {(title || subtitle || actions) && (
        <div className={styles.cardHeader}>
          <div>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.cardBody}>
        {children}
      </div>
    </div>
  );
};

export default Card;
