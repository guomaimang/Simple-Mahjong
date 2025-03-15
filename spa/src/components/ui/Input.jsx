import React from 'react';
import styled from 'styled-components';

// 输入框尺寸
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

// 样式化输入框容器
const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  width: ${(props) => (props.fullWidth ? '100%' : 'auto')};
`;

// 样式化标签
const Label = styled.label`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
`;

// 样式化输入框
const StyledInput = styled.input`
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: border-color 0.3s, box-shadow 0.3s;
  
  /* 应用尺寸样式 */
  padding: ${(props) => SIZES[props.size].padding};
  font-size: ${(props) => SIZES[props.size].fontSize};
  
  /* 禁用状态 */
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'text')};
  
  /* 错误状态 */
  border-color: ${(props) => (props.hasError ? '#f44336' : '#ccc')};
  
  /* 聚焦效果 */
  &:focus {
    outline: none;
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.25);
  }
`;

// 错误消息
const ErrorMessage = styled.div`
  color: #f44336;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

// 帮助文本
const HelpText = styled.div`
  color: #666;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

// 输入框组件
const Input = ({
  id,
  label,
  type = 'text',
  size = 'medium',
  disabled = false,
  error = null,
  helpText = null,
  fullWidth = false,
  ...props
}) => {
  return (
    <InputContainer fullWidth={fullWidth}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <StyledInput
        id={id}
        type={type}
        size={size}
        disabled={disabled}
        hasError={!!error}
        {...props}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {helpText && <HelpText>{helpText}</HelpText>}
    </InputContainer>
  );
};

export default Input; 