import React from "react";
import Button from "react-bootstrap/Button";
import { useMsal } from "@azure/msal-react";

/**
 * Single sign-out button that always uses redirect flow.
 */
export const SignOutButton = () => {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <Button variant="primary" onClick={handleLogout}>
      Sign out
    </Button>
  );
};
