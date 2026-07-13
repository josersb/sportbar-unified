import React from "react";
import {NavLink} from 'react-router-dom'
import './Nav.css'

const Nav = () => {
  return (
    <nav>
      <div className="nav-container">
        <ul className="ul-container">
          <NavLink to='/inicio' className='li-item'>Inicio</NavLink>
          <NavLink to='/matrizvideo' className='li-item'>Matriz Video</NavLink>
          <NavLink to='/audio' className='li-item'>Audio</NavLink>
          <NavLink to='/canales' className='li-item'>Canales</NavLink>
          <NavLink to='/arranger' className='li-item'>Links-Arranger</NavLink>
        </ul>
        <div className="ul-container">
        <NavLink to='/soporte' className='li-item'>Soporte</NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
