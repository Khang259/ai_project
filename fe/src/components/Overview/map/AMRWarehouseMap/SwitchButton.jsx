import React, { useState } from 'react';
import '@/styles/SwitchButton.css';
import { testAi } from '@/services/ai-service';

const AIToggleButton = () => {
  const [isToggled, setIsToggled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try{
      const newEnabled = await testAi();
      setIsToggled(!isToggled);
      console.log("New enabled:", newEnabled);
    }catch(error){
      alert("Không thể thay đổi trạng thái AI. Vui lòng thử lại.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="switch-button-wrapper">
      <button 
        className={`button ${isToggled ? 'active' : ''} ${isLoading ? 'loading' : ''}`} 
        data-text="Awesome"
        onClick={handleClick}
        disabled={isLoading}
      >
        <span className="actual-text">&nbsp;AI_MODE&nbsp;</span>
        <span aria-hidden="true" className="hover-text">&nbsp;AI_MODE&nbsp;</span>
      </button>
    </div>
  );
};

export default AIToggleButton;