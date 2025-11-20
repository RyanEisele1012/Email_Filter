// src/pages/LoginPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    onLogin();              // tells App "user is authenticated"
    navigate("/dashboard"); // go to dashboard route
  };

  return (
    <div className="login-page">
      <div className="login-page__title">Email Filter</div>

      <div className="login-card">
        <h1 className="login-card__heading">Spam Filter Portal</h1>
        <p className="login-card__subtitle">
          Log in to view your email spam filtering analytics.
        </p>

        <div className="login-card__fields">
          <div className="login-field">
            <label className="login-field__label">Username</label>
            <input
              type="text"
              placeholder="Enter username"
              disabled
              className="login-field__input login-field__input--disabled"
            />
          </div>

          <div className="login-field">
            <label className="login-field__label">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              disabled
              className="login-field__input login-field__input--disabled"
            />
          </div>
        </div>

        <button
          type="button"
          className="login-card__button"
          onClick={handleLoginClick}
        >
          Log in
        </button>

        <p className="login-card__helper">
          For now, the log-in button automatically signs you in.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;

