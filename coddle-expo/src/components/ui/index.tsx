import { createBox, createText, createRestyleComponent, createVariant } from '@shopify/restyle';
import { Theme } from '../../theme';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

// Basic building blocks
export const Box = createBox<Theme>();
export const Text = createText<Theme>();

// Button component
type ButtonProps = TouchableOpacityProps & {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
};

const buttonVariant = createVariant<Theme, 'buttonVariants'>({ themeKey: 'buttonVariants' });

const BaseButton = createRestyleComponent<ButtonProps, Theme>(
  [buttonVariant],
  TouchableOpacity
);

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => (
  <BaseButton variant={variant} {...props}>
    {typeof children === 'string' ? (
      <Text variant="body" color="white" textAlign="center" fontWeight="600">
        {children}
      </Text>
    ) : (
      children
    )}
  </BaseButton>
);

// Card component - simplified
export const Card = Box;

// Input component
export { Input } from './Input';

// Export chart components
export { SimpleBarChart, DateRangeSelector, AreaChart, SimpleLineChart } from './Charts';
export type { DateRangeOption } from './Charts';