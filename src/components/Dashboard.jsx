// src/components/Dashboard.jsx
import React, { useState } from "react";

const SAMPLE_EMAILS = [
  {
    id: 1,
    label: "Obvious spam",
    subject: "URGENT: Claim your prize now!",
    body: "You have won $1,000,000. Send your bank details immediately to claim your prize.",
  },
  {
    id: 2,
    label: "Normal work email",
    subject: "Standup meeting tomorrow at 10am",
    body: "Hi team, just a reminder about our 10am daily standup meeting tomorrow.",
  },
  {
    id: 3,
    label: "Newsletter",
    subject: "Your weekly tech newsletter",
    body: "Here is your weekly collection of articles, tools, and tutorials from around the tech world.",
  },
];

// Try backend first, then fall back to a simple mock for demo safety
async function classifyEmail(subject, body) {
  try {
    const response = await fetch("/classifier", {
      // <-- matches app.post('/classifier', classifyEmailHandler)
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, body }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn("Falling back to mock classification:", err);

    const text = (subject + " " + body).toLowerCase();
    const looksSpam =
      text.includes("urgent") ||
      text.includes("winner") ||
      text.includes("bank details") ||
      text.includes("prize");

    return {
      is_spam: looksSpam,
      spam_probability: looksSpam ? 0.9 : 0.1,
    };
  }
}

const Dashboard = () => {
  const [selectedEmail, setSelectedEmail] = useState(SAMPLE_EMAILS[0]);
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClassifySelected = async () => {
    if (!selectedEmail) return;
    setIsLoading(true);
    setResult(null);
    const res = await classifyEmail(selectedEmail.subject, selectedEmail.body);
    setResult(res);
    setIsLoading(false);
  };

  const handleClassifyCustom = async () => {
    if (!customSubject && !customBody) return;
    setIsLoading(true);
    setResult(null);
    const res = await classifyEmail(customSubject, customBody);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "#020617",
        color: "#e5e7eb",
      }}
    >
      <h2 style={{ marginBottom: "0.5rem" }}>Email Filtering Dashboard</h2>
      <p style={{ marginBottom: "1.5rem", maxWidth: "720px" }}>
        Select one of the sample emails or paste your own subject and body
        below. The classifier returns whether it thinks the email is spam,
        along with a probability score.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr)",
          gap: "2rem",
        }}
      >
        {/* LEFT: sample + custom input */}
        <div>
          <h3 style={{ marginBottom: "0.75rem" }}>Sample Emails</h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              marginBottom: "1rem",
            }}
          >
            {SAMPLE_EMAILS.map((email) => {
              const isActive = selectedEmail?.id === email.id;
              return (
                <li
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  style={{
                    padding: "0.6rem 0.8rem",
                    marginBottom: "0.5rem",
                    borderRadius: "0.6rem",
                    border: isActive
                      ? "1px solid #f97316"
                      : "1px solid #1f2937",
                    backgroundColor: isActive ? "#0f172a" : "#020617",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  <strong>{email.label}:</strong> {email.subject}
                </li>
              );
            })}
          </ul>

          <button
            onClick={handleClassifySelected}
            disabled={isLoading || !selectedEmail}
            style={{
              padding: "0.6rem 1.3rem",
              borderRadius: "999px",
              border: "none",
              cursor: isLoading ? "default" : "pointer",
              backgroundColor: "#f97316",
              color: "#111827",
              fontWeight: 600,
              marginBottom: "2rem",
            }}
          >
            {isLoading ? "Classifying..." : "Classify Selected Email"}
          </button>

          <h3 style={{ marginBottom: "0.5rem" }}>Custom Email</h3>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.9rem" }}>Subject</label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Enter email subject..."
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #1f2937",
                backgroundColor: "#020617",
                color: "#e5e7eb",
                marginTop: "0.25rem",
              }}
            />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.9rem" }}>Body</label>
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="Enter email body..."
              rows={6}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #1f2937",
                backgroundColor: "#020617",
                color: "#e5e7eb",
                marginTop: "0.25rem",
                resize: "vertical",
              }}
            />
          </div>
          <button
            onClick={handleClassifyCustom}
            disabled={isLoading}
            style={{
              padding: "0.6rem 1.3rem",
              borderRadius: "999px",
              border: "none",
              cursor: isLoading ? "default" : "pointer",
              backgroundColor: "#22c55e",
              color: "#022c22",
              fontWeight: 600,
            }}
          >
            {isLoading ? "Classifying..." : "Classify Custom Email"}
          </button>
        </div>

        {/* RIGHT: result card */}
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid #1f2937",
            backgroundColor: "#020617",
          }}
        >
          <h3 style={{ marginBottom: "0.75rem" }}>Classification Result</h3>
          {isLoading && <p>Running classification model…</p>}
          {!isLoading && !result && (
            <p style={{ opacity: 0.75 }}>
              No result yet. Select a sample email or enter your own, then click
              &quot;Classify&quot;.
            </p>
          )}
          {!isLoading && result && (
            <div>
              <p style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color: result.is_spam ? "#f97316" : "#4ade80",
                    fontWeight: 700,
                  }}
                >
                  {result.is_spam ? "Spam" : "Not spam"}
                </span>
              </p>
              <p style={{ fontSize: "1rem" }}>
                <strong>Spam probability:</strong>{" "}
                {(result.spam_probability * 100).toFixed(1)}%
              </p>
              <p
                style={{
                  opacity: 0.7,
                  fontSize: "0.9rem",
                  marginTop: "0.75rem",
                }}
              >
                These values come from the backend <code>/classifier</code>
                endpoint. If it’s unavailable, the UI falls back to a simple
                mock so the demo still shows the full flow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
