# Post-Delivery Email Spam Filter for Outlook

## Project Overview

This **Post-Delivery Email Spam Filter** is a project designed to analyze emails *after* they have arrived in a Microsoft Outlook inbox. Unlike traditional server-side spam filters that block messages before delivery, this tool operates client-side (or via Outlook add-in/API integration) to classify emails as **spam** or **ham (non-spam)** post-delivery.

Upon classification:
- Spam emails are **automatically moved** to the Junk folder or a custom "Quarantine" folder.
- Classification confidence, metadata, and decision rationale are **logged** in a local or cloud database.
- Real-time **statistics and analytics** are displayed on a **web-based dashboard** for user monitoring.

This project demonstrates concepts in:
- Email API integration (Microsoft Graph / Outlook)
- Machine learning for text classification
- Database logging and data persistence
- Full-stack web development (dashboard)
- Automation and rule-based email management

---

## Features

| Feature | Description |
|-------|-----------|
| **Post-Delivery Scanning** | Scans emails only *after* they land in the Inbox |
| **ML-Based Classification** | Uses a trained Naive Bayes / Logistic Regression model on email content and headers |
| **Automated Actions** | Moves spam to Junk/Quarantine; optionally deletes or flags |
| **Detailed Logging** | Stores classification results, timestamps, sender, subject, confidence score |
| **Interactive Dashboard** | View spam trends, accuracy metrics, top spammers, and filter performance |
| **Extensible Rules** | Combine ML with keyword/heuristic rules for hybrid filtering |

---

Created from Microsoft's React-SPA + MSAL Quick Setup template.