import React from "react";
import './Header.css'

const Header = () => {
  return (
    <header>
      <div className="header-container">
        <img src="/logos/logoBetwarriorCompleto.PNG " alt="betwarrior" />
        <h1>Sportbar <span>Fuentes de señales AV</span> </h1>
        <img src="/logos/HipodromoPalermo.jpg" alt="" style={{ height: 90 }} />
      </div>
    </header>
  );
};

export default Header;

