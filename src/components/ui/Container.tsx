import React from "react";

type ContainerProps = React.PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
  backgroundless?: boolean;
}> & React.HTMLAttributes<HTMLDivElement>;

export function Container({ as: Component = 'div', children, className, backgroundless = false, ...props }: ContainerProps) {
  return (
    <Component className={`mx-auto max-w-7xl sm:px-6 lg:px-8 ${className || ''}`} {...props}>
      <div className={`px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${backgroundless ? '' : 'bg-white'}`}>
        {children}
      </div>
    </Component>
  );
} 