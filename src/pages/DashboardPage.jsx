// src/pages/DashboardPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

function DashboardPage({ onLogout }) {
  const navigate = useNavigate();

  // Dummy analytics data for now
  const totalEmails = 250;
  const numSpamEmails = 40;
  const numHamEmails = totalEmails - numSpamEmails;

  const spamPercent = Math.round((numSpamEmails / totalEmails) * 100);
  const hamPercent = 100 - spamPercent;

  const handleLogoutClick = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-header__title">Spam Filter Dashboard</h1>
          <p className="dashboard-header__subtitle">
            Session analytics for your email spam filtering.
          </p>
        </div>
        <button
          type="button"
          className="dashboard-header__logout"
          onClick={handleLogoutClick}
        >
          Log out
        </button>
      </header>

      {/* NEW wrapper to control width */}
      <main className="dashboard-main">
        {/* Summary cards */}
        <section className="dashboard-stats">
          <article className="stat-card">
            <div className="stat-card__label">Total Emails (session)</div>
            <div className="stat-card__value">{totalEmails}</div>
          </article>

          <article className="stat-card">
            <div className="stat-card__label">Spam Emails</div>
            <div className="stat-card__value">{numSpamEmails}</div>
          </article>

          <article className="stat-card">
            <div className="stat-card__label">Ham (Non-Spam) Emails</div>
            <div className="stat-card__value">{numHamEmails}</div>
          </article>
        </section>

        {/* Simple “chart” */}
        <section className="dashboard-chart">
          <div className="dashboard-chart__header">
            <span className="dashboard-chart__title">Spam vs Ham</span>
            <span className="dashboard-chart__meta">
              Spam {spamPercent}% • Ham {hamPercent}%
            </span>
          </div>

          <div className="chart-bar">
            <div
              className="chart-bar__segment chart-bar__segment--spam"
              style={{ width: `${spamPercent}%` }}
            />
            <div
              className="chart-bar__segment chart-bar__segment--ham"
              style={{ width: `${hamPercent}%` }}
            />
          </div>

          <div className="chart-legend">
            <span>⬤ Spam ({numSpamEmails})</span>
            <span>⬤ Ham ({numHamEmails})</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
