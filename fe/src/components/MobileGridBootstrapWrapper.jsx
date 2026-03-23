import React from 'react';
import styled from 'styled-components';

// Bootstrap-like styled components
const BootstrapContainer = styled.div`
  width: 100%;
  padding-right: 15px;
  padding-left: 15px;
  margin-right: auto;
  margin-left: auto;
`;

const BootstrapContainerFluid = styled.div`
  width: 100%;
  padding-right: 15px;
  padding-left: 15px;
  margin-right: auto;
  margin-left: auto;
`;

const BootstrapFlex = styled.div`
  display: flex !important;
  flex-direction: ${props => props.direction || 'row'};
  min-height: ${props => props.minHeight || 'auto'};
  width: ${props => props.width || 'auto'};
  flex-grow: ${props => props.grow || '0'};
`;

const BootstrapCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.25rem;
`;

const BootstrapCardHeader = styled.div`
  padding: 0.75rem 1.25rem;
  margin-bottom: 0;
  background-color: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.125);
`;

const BootstrapCardBody = styled.div`
  flex: 1 1 auto;
  padding: 1.25rem;
`;

const BootstrapBgLight = styled.div`
  background-color: #f8f9fa !important;
  padding: ${props => props.padding || '0'};
  border-radius: ${props => props.rounded ? '0.25rem' : '0'};
`;

const BootstrapHeading = styled.h5`
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: ${props => props.marginBottom || '0.5rem'};
`;

const BootstrapSpacing = styled.div`
  padding-top: ${props => props.py ? '1rem' : '0'};
  padding-bottom: ${props => props.py ? '1rem' : '0'};
  margin-bottom: ${props => props.mb ? '1rem' : '0'};
`;

// Wrapper component
const MobileGridBootstrapWrapper = ({ children }) => {
  return (
    <BootstrapFlex direction="column" minHeight="100vh" width="100%">
      <BootstrapContainerFluid>
        <BootstrapSpacing py>
          <BootstrapContainer>
            <div style={{ width: '100%' }}>
              <BootstrapCard style={{ width: '100%' }}>
                <BootstrapCardHeader>
                  <BootstrapHeading marginBottom="0">
                    CHỌN KHU VỰC VÀ TASK PATH
                  </BootstrapHeading>
                </BootstrapCardHeader>
                <BootstrapCardBody>
                  {children}
                </BootstrapCardBody>
              </BootstrapCard>
            </div>
          </BootstrapContainer>
        </BootstrapSpacing>
      </BootstrapContainerFluid>
    </BootstrapFlex>
  );
};

export {
  BootstrapContainer,
  BootstrapContainerFluid,
  BootstrapFlex,
  BootstrapCard,
  BootstrapCardHeader,
  BootstrapCardBody,
  BootstrapBgLight,
  BootstrapHeading,
  BootstrapSpacing,
  MobileGridBootstrapWrapper
};
