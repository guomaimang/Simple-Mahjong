import React from 'react';
import styled from 'styled-components';

// 样式化卡片容器
const CardContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: ${(props) => (props.fullWidth ? '100%' : 'auto')};
`;

// 样式化卡片头部
const CardHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #eee;
  background-color: ${(props) => (props.color ? props.color : 'white')};
  color: ${(props) => (props.color ? 'white' : '#333')};
  font-weight: 500;
  font-size: 1.25rem;
`;

// 样式化卡片内容
const CardContent = styled.div`
  padding: 1rem;
`;

// 样式化卡片底部
const CardFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid #eee;
  background-color: #f9f9f9;
`;

// 卡片组件
const Card = ({
  children,
  header,
  footer,
  headerColor,
  fullWidth = false,
  ...props
}) => {
  return (
    <CardContainer fullWidth={fullWidth} {...props}>
      {header && <CardHeader color={headerColor}>{header}</CardHeader>}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </CardContainer>
  );
};

export default Card; 