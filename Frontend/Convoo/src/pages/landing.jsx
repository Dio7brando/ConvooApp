import React from "react";
import "../App.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";


export default function LandingPage() {
  const router = useNavigate();

  return (
    <div className="landingPageContainer">
      <nav>
        <div className="navHeader">
          <h1>Convoo</h1>
        </div>
        <div className="navList">
          <p onClick={ () => {
            router("/fuga3")
          }}>Join as Guest</p>

          <p onClick={ () => {
            router("/auth")
          }}>Register</p>

          <p onClick={ () => {
            router("/auth") 
          }}>Login</p>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your Loved
            Ones
          </h1>
          <p>Cover a distance by Convoo</p>
          <div role="button">
            <Link to={"/auth"}>Get Started</Link>
          </div>
        </div>
        <div>
          <img src="/mobile.png" alt="" />
        </div>
      </div>
    </div>
  );
}
