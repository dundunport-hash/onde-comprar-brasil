import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  onClick,
}) => {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 shadow-sm ${
        onClick ? "cursor-pointer transition hover:shadow-md" : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
