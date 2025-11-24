import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const handleToggleAI = () => {
  console.log('Toggle AI mode');
}

const Button = () => {
  const { t } = useTranslation(); 
  return (
    <StyledWrapper>
      <button onClick={handleToggleAI} className="shadow__btn">
          {t('map.ai_mode')}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .shadow__btn {
    padding: 10px 20px;
    border: none;
    font-size: 17px;
    color: #fff;
    border-radius: 7px;
    letter-spacing: 4px;
    font-weight: 700;
    text-transform: uppercase;
    transition: 0.5s;
    transition-property: box-shadow;
  }

  .shadow__btn {
    background: rgb(138, 43, 226);
    box-shadow: 0 0 25px rgb(138, 43, 226);
  }

  .shadow__btn:hover {
    box-shadow: 0 0 5px rgb(138, 43, 226),
                0 0 25px rgb(138, 43, 226),
                0 0 50px rgb(138, 43, 226),
                0 0 100px rgb(138, 43, 226);
  }`;

export default Button;
