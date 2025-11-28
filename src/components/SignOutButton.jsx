import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { useLoading } from "../context/LoadingContext";

export const SignOutButton = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { setIsLoading } = useLoading();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const deleteSubscription = async () => {
    if (!isAuthenticated || accounts.length === 0) return false;

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        account: accounts[0],
        scopes: loginRequest.scopes,
      });

      await fetch("/delete-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenResponse.accessToken,
          uniqueId: tokenResponse.uniqueId,
        }),
      });
      return true;
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      return false;
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut || !isAuthenticated) return;

    setIsLoggingOut(true);
    setIsLoading(true); // Triggers full-page spinner

    try {
      await deleteSubscription();
    } catch (error) {
      console.error("Cleanup failed, proceeding to logout:", error);
    } finally {
      instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + "/",
      });
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
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