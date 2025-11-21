/*
 * App shell: top navbar + content container
 */

import React from "react";
import Navbar from "react-bootstrap/Navbar";
import { useIsAuthenticated } from "@azure/msal-react";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";

export const PageLayout = (props) => {
  const isAuthenticated = useIsAuthenticated();

  return (
    <>
      <Navbar className="navbarStyle" expand="md">
        <div className="navbar-inner">
          <div className="navbar-left">
            <span className="navbar-logo">▢</span>
            <span className="navbar-brand-text">Email Filter</span>
          </div>

          <nav className="navbar-links">
            <span className="navbar-link">Home</span>
            <span className="navbar-link">How it works</span>
            <span className="navbar-link">Dashboard</span>
          </nav>

          <div className="navbar-actions">
            {isAuthenticated ? <SignOutButton /> : <SignInButton />}
          </div>
        </div>
      </Navbar>

      <main className="app-shell">{props.children}</main>
    </>
  );
};

