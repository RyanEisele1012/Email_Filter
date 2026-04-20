import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useLoading } from "../context/LoadingContext";

export const SignOutButton = () => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { setIsLoading } = useLoading();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut || !isAuthenticated) return;

    setIsLoggingOut(true);
    setIsLoading(true); // Triggers full-page spinner

    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin + "/",
    });
  };

  return (
    <Button variant="secondary" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? (
        <>
          <Spinner as="span" animation="border" size="sm" className="me-2" />
          Signing out...
        </>
      ) : (
        "Sign Out"
      )}
    </Button>
  );
};
