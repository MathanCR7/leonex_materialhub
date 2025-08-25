import React from "react";

const StatCard = ({
  title,
  value,
  icon,
  bgColorClass = "bg-primary",
  size = "default", // 'default' or 'compact'
  onClick,
}) => (
  <div
    className={`stat-card ${bgColorClass} ${size} ${onClick ? 'is-clickable' : ''}`}
    onClick={onClick}
  >
    {icon && <div className="stat-card-icon">{icon}</div>}
    <div className="stat-card-content">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value">{value}</p>
    </div>
  </div>
);

export default StatCard;