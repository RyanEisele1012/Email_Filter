// src/components/LandingPage.jsx
import React from "react";
import { useMsal } from "@azure/msal-react";

const LandingPage = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(); // or loginPopup() depending on your setup
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "linear-gradient(135deg, #020617, #111827)",
        color: "#f9fafb",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
        AI-Powered Post-Delivery Email Spam Filter
      </h1>

      <p
        style={{
          maxWidth: "650px",
          marginBottom: "1.5rem",
          lineHeight: 1.6,
          fontSize: "1rem",
          opacity: 0.9,
        }}
      >
        Sign in with your Microsoft account and test whether an email’s subject
        and body are likely spam or not. Our backend model returns a simple
        spam / not-spam prediction with a probability score.
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          marginBottom: "2rem",
          maxWidth: "550px",
          textAlign: "left",
          fontSize: "0.95rem",
          opacity: 0.95,
        }}
      >
        <li>• Secure Microsoft login using MSAL</li>
        <li>• Paste or select an email’s subject and body</li>
        <li>• Get an immediate spam / not spam prediction</li>
        <li>• View a probability score (0–1)</li>
      </ul>

      <button
        onClick={handleLogin}
        style={{
          padding: "0.8rem 1.8rem",
          fontSize: "1rem",
          fontWeight: 600,
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          backgroundColor: "#f97316",
          color: "#111827",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        Sign in with Microsoft
      </button>

      <p
        style={{
          marginTop: "1.5rem",
          fontSize: "0.85rem",
          opacity: 0.7,
          maxWidth: "420px",
        }}
      >
        For this course project we intentionally kept it simple: Login → Enter
        Email → Model Prediction → Display Result.
      </p>
    </div>
  );
};

export default LandingPage;
