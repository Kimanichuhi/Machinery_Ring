// src/components/ui/NavLink.tsx
import React, { forwardRef } from 'react';
import { NavLink as RouterNavLink, NavLinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkCompatProps extends Omit<NavLinkProps, 'className'> {
  className?: string | ((args: { isActive: boolean; isPending: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        {...props}
        className={({ isActive, isPending }) => {
          const baseClass = typeof className === 'function' 
            ? className({ isActive, isPending }) 
            : className;

          const activeClass = isActive ? activeClassName : '';
          const pendingClass = isPending ? pendingClassName : '';

          return cn(baseClass, activeClass, pendingClass);
        }}
      />
    );
  }
);

NavLink.displayName = 'NavLink';

export { NavLink };
