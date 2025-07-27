import React from "react";

type CardProps = React.PropsWithChildren<unknown> & React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow ${className || ''}`} {...props}>
      {children}
    </div>
  );
} 