import React from "react";

type CardProps = React.PropsWithChildren<{}> & React.HTMLAttributes<HTMLDivElement>;

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={"card-custom " + (className || "")} {...props}>
      {children}
    </div>
  );
} 