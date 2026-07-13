import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./Body.css";
import Header from "./Header";
import Nav from "./Nav";
import Portada from "./Portada";
import MatrizVideo from "./MatrizVideo";
import Canales from "./Canales";
import Audio from "./Audio";
import Aside from "./Aside";
import Arranger from "./Arranger";
import Soporte from "./Soporte";

function Body() {
  return (
    <Router>
      <div className="container">
        <Header />
        <Nav />
        <Aside />
        <Routes>
          <Route path="/inicio" element={<Portada />} />
          <Route path="/matrizvideo" element={<MatrizVideo />} />
          <Route path="/canales" element={<Canales />} />
          <Route path="/audio" element={<Audio />} />
          <Route path="/arranger" element={<Arranger />} />
          <Route path="/soporte" element={<Soporte />} />
          <Route path="/" element={<Portada />} />
        </Routes>
        {/* <footer>
        <div className="footer-container">footer</div>
      </footer> */}
      </div>
    </Router>
  );
}

export default Body;
