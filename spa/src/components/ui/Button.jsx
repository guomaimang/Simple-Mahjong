import React from 'react';
import styled from 'styled-components';

// 按钮类型
const VARIANTS = {
  primary: {
    background: '#4CAF50',
    color: 'white',
    hoverBackground: '#45a049',
  },
  secondary: {
    background: '#2196F3',
    color: 'white',
    hoverBackground: '#0b7dda',
  },
  danger: {
    background: '#f44336',
    color: 'white',
    hoverBackground: '#d32f2f',
  },
  success: {
    background: '#4CAF50',
    color: 'white',
    hoverBackground: '#45a049',
  },
  warning: {
    background: '#ff9800',
    color: 'white',
    hoverBackground: '#e68a00',
  },
  info: {
    background: '#2196F3',
    color: 'white',
    hoverBackground: '#0b7dda',
  },
  light: {
    background: '#f1f1f1',
    color: '#333',
    hoverBackground: '#ddd',
  },
  dark: {
    background: '#333',
    color: 'white',
    hoverBackground: '#222',
  },
};

// 按钮尺寸
const SIZES = {
  small: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.875rem',
  },
  medium: {
    padding: '0.5rem 1rem',
    fontSize: '1rem',
  },
  large: {
    padding: '0.75rem 1.5rem',
    fontSize: '1.25rem',
  },
};

// 样式化按钮组件
const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s, box-shadow 0.3s;
  
  /* 应用变体样式 */
  background-color: ${(props) => VARIANTS[props.variant].background};
  color: ${(props) => VARIANTS[props.variant].color};
  
  /* 应用尺寸样式 */
  padding: ${(props) => SIZES[props.size].padding};
  font-size: ${(props) => SIZES[props.size].fontSize};
  
  /* 禁用状态 */
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  
  /* 全宽按钮 */
  width: ${(props) => (props.fullWidth ? '100%' : 'auto')};
  
  /* 悬停效果 */
  &:hover:not(:disabled) {
    background-color: ${(props) => VARIANTS[props.variant].hoverBackground};
  }
  
  /* 点击效果 */
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  
  /* 聚焦效果 */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
`;

// 按钮组件
const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  fullWidth = false,
  onClick,
  ...props
}) => {
  return (
    <StyledButton
      type={type}
      variant={variant}
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default Button;