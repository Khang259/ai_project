import React from 'react';
import styled from 'styled-components';

const AGVCard = () => {
  return (
    <StyledWrapper>
      <div className="cardm">
        <div className="card">
          <div className="main">AGV1</div>
          <div className="mainsub">IP: 127.0.0.1</div>
          <div className="mainsub">Device Serial No:CM15364AAK00002</div>
          <div className="mainsub">Device Model: HAIFLEXK600A-E2</div>
        </div>
        <div className="card2">
          <div className="lower">
            <div className="battery">
              <div className="batterytext">Battery<br />100%</div>
            </div>
            <div className="speed">
              <div className="speedtext">Speed<br />100 mm/s</div>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .cardm {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 200px;
    overflow: visible
  }

  .card {
    position: absolute;
    width: 250px;
    height: 130px;
    border-radius: 25px;
    background: #f0f0f0;
    color: #000;
    z-index: 2;
    transition: .4s ease-in-out;
    padding:16px
  }

  .main {
    font-size: 2em;
    position: relative;
    top: 0;
    left: 0;
  }

  .mainsub {
    position: relative;
    top: 0;
    left: 0;
    font-size: 0.8em;
  }

  .card2 {
    position: absolute;
    display: flex;
    flex-direction: row;
    width: 240px;
    height: 90px;
    border-radius: 35px;
    background: blue;
    z-index: 1;
    transition: .4s ease-in-out;
    top: 40px; 
  }

  .card:hover {
    background-color: #FFE87C;
    cursor: pointer;
  }

  .card:hover + .card2 {
    height: 200px;
    border-bottom-left-radius: 35px;
    border-bottom-right-radius: 35px;
  }

  .card:hover + .card2 .lower {
    top: 13em;
    z-index:3;
  }

  .deviceiptext {
    position: relative;
    left: 3.6em;
    top: 2.7em;
    font-size: 0.6em;
  }

  .devicestatetext {
    position: relative;
    left: 3.8em;
    top: 2.7em;
    font-size: 0.6em;
  }

  .lower {
    display: flex;
    flex-direction: row;
    position: absolute;
    text-align: center;
    color: white;
    left: 3em;
    top: 1em;
    z-index: 0;
    margin-top: 0.7em;
    font-size: 0.7em;
    transition: .4s ease-in-out;
  }

  .batterytext {
    margin-right: 3.25em;
  }

  .speedtext {
    margin-right: 1.8em;
  }
`;

export default AGVCard;
