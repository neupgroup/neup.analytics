import { Children, cloneElement, isValidElement, ReactElement, ReactNode } from 'react';
import { cn } from '@/core/utils';

type ActivitySetProps = {
  children: ReactNode;
  className?: string;
};

export function ActivitySet({
  children,
  className,
}: ActivitySetProps) {
  const items = Children.toArray(children);

  return (
    <div className={cn('space-y-0', className)}>
      {items.map((child, index) => {
        if (!isValidElement<{ className?: string }>(child)) {
          return child;
        }

        return cloneElement(child as ReactElement<{ className?: string }>, {
          className: cn(
            child.props.className,
            index === 0 ? 'rounded-tl-xl rounded-tr-xl' : 'rounded-none border-t-0',
            index === items.length - 1 ? 'rounded-bl-xl rounded-br-xl' : ''
          ),
        });
      })}
    </div>
  );
}
