import React from "react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "md",
  className = "",
  text,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-border border-t-primary rounded-full animate-spin`}
      />
      {text && <p className="mt-2 text-sm text-red-700">{text}</p>}
    </div>
  );
};
