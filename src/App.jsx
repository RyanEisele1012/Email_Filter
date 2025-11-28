import React, { useState, useEffect } from "react";

import { PageLayout } from "./components/PageLayout";
import { loginRequest } from "./authConfig";

import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useIsAuthenticated,
  useMsal,
} from "@azure/msal-react";
import "./App.css";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

import { getUserData } from "./graph";
import { LoadingProvider, useLoading } from "./context/LoadingContext";

/**
 * Dashboard content for authenticated users
 */
const DashboardContent = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { setIsLoading } = useLoading();

  const [stats, setStats] = useState({
    totalEmails: 0,
    numSpamEmails: 0,
    numHamEmails: 0,
  });
  const [userName, setUserName] = useState("");
  const [ranOnce, setRanOnce] = useState(false);

  // Fetch user name and control global loading
  const fetchUserName = async () => {
    if (!isAuthenticated || accounts.length === 0) return;

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        account: accounts[0],
        scopes: ["User.Read"],
      });

      const userData = await getUserData(tokenResponse.accessToken);
      const firstName =
        userData.givenName || userData.displayName?.split(" ")[0] || "User";
      setUserName(firstName);
    } catch (error) {
      console.error("Failed to fetch user name:", error);
      setUserName("User");
    } finally {
      // This is the ONLY place we turn off loading
      setIsLoading(false);
    }
  };

  async function createSubscription() {
    if (!isAuthenticated || accounts.length === 0) return;
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        account: accounts[0],
        scopes: loginRequest.scopes,
      });

      await fetch("http://localhost:8080/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenResponse.accessToken,
          uniqueId: tokenResponse.uniqueId,
        }),
      });
    } catch (error) {
      console.error("Failed to create subscription:", error);
    }
  }

  async function getStats() {
    if (!isAuthenticated || accounts.length === 0) return;
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        account: accounts[0],
        scopes: loginRequest.scopes,
      });

      const response = await fetch("http://localhost:8080/get-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueId: tokenResponse.uniqueId }),
      });

      const userData = await response.json();
      return userData.stats;
    } catch (error) {
      console.error("Failed to get stats:", error);
      return null;
    }
  }

  async function saveAccessToken() {
    if (!isAuthenticated || accounts.length === 0) return;
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        account: accounts[0],
        scopes: loginRequest.scopes,
      });

      await fetch("http://localhost:8080/save-access-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenResponse.accessToken,
          uniqueId: tokenResponse.uniqueId,
        }),
      });
    } catch (error) {
      console.error("Failed to save access token:", error);
    }
  }

  async function refresh() {
    const response = await getStats();
    if (response) setStats(response);
  }

  // Run once when authenticated
  if (!ranOnce && isAuthenticated) {
    saveAccessToken();
    createSubscription();
    fetchUserName(); // This will eventually set isLoading = false
    setRanOnce(true);
  }

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated]);

  const totalEmails = stats.totalEmails || 0;
  const numSpamEmails = stats.numSpamEmails || 0;
  const numHamEmails = stats.numHamEmails || 0;
  const spamPercent =
    totalEmails === 0 ? 0 : Math.round((numSpamEmails / totalEmails) * 100);
  const hamPercent = 100 - spamPercent;

  // BLOCK RENDER until name is loaded
  if (!userName) {
    return null;
  }

  return (
    <div className="App App--dashboard">
      <div className="dashboard-header">
        <h1
          style={{
            fontSize: "3.2rem",
            fontWeight: 800,
            margin: "0 0 1rem 0",
            color: "#1a1a1a",
          }}
        >
          Welcome, {userName}!
        </h1>
        <h2
          style={{
            fontSize: "2.2rem",
            fontWeight: 600,
            margin: "0 0 0.5rem 0",
            color: "#333",
          }}
        >
          Spam Filter Dashboard
        </h2>
        <p className="dashboard-subtitle">
          Live spam vs. ham analytics from your Outlook inbox.
        </p>
      </div>

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
          <span>Spam ({numSpamEmails})</span>
          <span>Ham ({numHamEmails})</span>
        </div>
      </section>

      <section className="refresh-button text-center">
        <Button onClick={refresh}>Refresh Statistics</Button>
      </section>

      <section>
        <div className="landing-info__title text-center mt-3">
          Disclaimer: We don't save any email data. If you wish to relinquish
          app permissions, visit&nbsp;
          <a href="https://microsoft.com/consent">
            https://microsoft.com/consent
          </a>
        </div>
      </section>
    </div>
  );
};

/**
 * Landing page (logged out) + dashboard (logged in)
 */
const MainContent = () => {
  const { isLoading } = useLoading();

  // Show spinner during: sign-in, sign-out, or loading user name
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100%",
        }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <>
      <AuthenticatedTemplate>
        <DashboardContent />
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className="App App--landing">
          <section className="landing-hero">
            <div className="landing-hero__left">
              <span className="landing-pill">Azure • AI • Outlook</span>
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

          <section className="landing-info">
            <div className="landing-info__block">
              <h2 className="landing-info__title">How it works</h2>
              <p className="landing-info__text">
                After you sign in with your Microsoft account, Email Filter uses
                Microsoft Graph API to listen for new Outlook emails. Each
                message is classified by a machine learning model hosted in
                Azure, and spam is automatically routed to your spam folder
                while legitimate mail stays in your inbox.
              </p>
            </div>

            <div className="landing-info__block">
              <h2 className="landing-info__title">About this project</h2>
              <p className="landing-info__text">
                This student project showcases how Azure cloud services, machine
                learning, and a simple web dashboard can work together to
                improve email security. Only anonymized statistics are stored;
                full email contents are processed just long enough to classify
                spam vs. ham.
              </p>
            </div>
          </section>

          <section className="landing-stats">
            <article className="landing-stat">
              <div className="landing-stat__value">100,000+</div>
              <div className="landing-stat__label">
                emails tested in simulation
              </div>
            </article>

            <article className="landing-stat">
              <div className="landing-stat__value">99%</div>
              <div className="landing-stat__label">
                spam detection accuracy (demo)
              </div>
            </article>

            <article className="landing-stat">
              <div className="landing-stat__value">Trusted</div>
              <div className="landing-stat__label">
                by employees everywhere in our test scenarios
              </div>
            </article>
          </section>

          <section>
            <div className="landing-info__title text-center mt-3">
              Disclaimer: We don't save any email data. If you wish to
              relinquish app permissions, visit&nbsp;
              <a href="https://microsoft.com/consent">
                https://microsoft.com/consent
              </a>
            </div>
          </section>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
};

export default function App() {
  return (
    <LoadingProvider>
      <PageLayout>
        <MainContent />
      </PageLayout>
    </LoadingProvider>
  );
}
