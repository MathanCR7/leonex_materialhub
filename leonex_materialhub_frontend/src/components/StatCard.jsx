import React from "react";

const StatCard = ({
  title,
  value,
  icon,
  unit,
  bgColorClass = "bg-primary", // Default class if none provided
}) => (
  <div className={`stat-card ${bgColorClass}`}>
    {" "}
    {/* Main card class and specific bg color class */}
    {icon && <div className="stat-card-icon">{icon}</div>}
    <div className="stat-card-content">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value">
        {value} {unit && <span className="stat-card-unit">{unit}</span>}
      </p>
    </div>
  </div>
);

export default StatCard;
