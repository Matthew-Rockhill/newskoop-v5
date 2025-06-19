import React from "react";

type ContainerProps = React.PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}> & React.HTMLAttributes<HTMLDivElement>;

export default function Container({ as: Component = 'div', children, className, ...props }: ContainerProps) {
  return (
    <Component className={"container-custom " + (className || "")} {...props}>
      {children}
    </Component>
  );
} 