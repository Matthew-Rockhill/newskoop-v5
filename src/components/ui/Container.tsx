import React from "react";

type ContainerProps = React.PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}> & React.HTMLAttributes<HTMLDivElement>;

export function Container({ as: Component = 'div', children, className, ...props }: ContainerProps) {
  return (
    <Component className={`mx-auto max-w-7xl sm:px-6 lg:px-8 ${className || ''}`} {...props}>
      <div className="bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </Component>
  );
} 