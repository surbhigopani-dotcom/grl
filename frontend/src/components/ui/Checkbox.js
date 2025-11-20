import React from 'react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      ref={ref}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };

