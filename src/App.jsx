import React, { useState } from "react";

import { PageLayout } from "./components/PageLayout";
import { loginRequest } from "./authConfig";
import { getUserData } from "./graph";
import { ProfileData } from "./components/ProfileData";

import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from "@azure/msal-react";
import "./App.css";
import Button from "react-bootstrap/Button";

/**
 * Dashboard content for authenticated users
 */
const DashboardContent = () => {
  const { instance, accounts } = useMsal();
  const [graphData, setGraphData] = useState(null);

  // Dummy analytics data for now (hook up to Azure later)
  const totalEmails = 250;
  const numSpamEmails = 40;
  const numHamEmails = totalEmails - numSpamEmails;

  const spamPercent = Math.round((numSpamEmails / totalEmails) * 100);
  const hamPercent = 100 - spamPercent;

  function RequestProfileData() {
    instance
      .acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      })
      .then((response) => {
        getUserData(response.accessToken).then((response) =>
          setGraphData(response)
        );
      });
  }

  return (
    <div className="App App--dashboard">
      {/* Dashboard header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Spam Filter Dashboard</h1>
        <p className="dashboard-subtitle">
          Live spam vs. ham analytics from your Outlook inbox.
        </p>
      </div>

      {/* Analytics cards */}
      <section className="analytics-grid">
        <article className="analytics-card">
          <div className="analytics-label">Total Emails (session)</div>
          <div className="analytics-value">{totalEmails}</div>
        </article>

        <article className="analytics-card">
          <div className="analytics-label">Spam Emails</div>
          <div className="analytics-value">{numSpamEmails}</div>
        </article>

        <article className="analytics-card">
          <div className="analytics-label">Ham Emails</div>
          <div className="analytics-value">{numHamEmails}</div>
        </article>
      </section>

      {/* Simple Spam vs Ham chart */}
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

      {/* Profile information */}
      <section className="profile-section">
        <h2 className="section-heading">
          Welcome {accounts[0].name}
        </h2>

        {graphData ? (
          <ProfileData graphData={graphData} />
        ) : (
          <Button variant="secondary" onClick={RequestProfileData}>
            Load profile from Microsoft Graph
          </Button>
        )}
      </section>
    </div>
  );
};

/**
 * Landing page (logged out) + dashboard (logged in)
 */
const MainContent = () => {
  return (
    <>
      <AuthenticatedTemplate>
        <DashboardContent />
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className="App App--landing">
          <section className="landing-hero">
            <div className="landing-hero__left">
              <span className="landing-pill">
                Azure • AI • Outlook
              </span>
              <h1 className="landing-title">Email Filter</h1>
              <p className="landing-subtitle">
                AI-powered spam filtering for Outlook, built on Microsoft Azure.
              </p>

              <ul className="landing-points">
                <li>Connect with your Microsoft account</li>
                <li>Detect spam, phishing, and malicious emails</li>
                <li>See simple spam vs. ham statistics in a dashboard</li>
              </ul>

              <p className="landing-hint">
                Click <strong>Sign in</strong> in the top-right to get started.
              </p>
            </div>

            <div className="landing-hero__right">
              <div className="landing-preview">
                <div className="landing-preview__header">
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                </div>
                <div className="landing-preview__body">
                  <div className="preview-card preview-card--primary" />
                  <div className="preview-card preview-card--secondary" />
                  <div className="preview-card preview-card--secondary" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
};

export default function App() {
  return (
    <PageLayout>
      <MainContent />
    </PageLayout>
  );
}


