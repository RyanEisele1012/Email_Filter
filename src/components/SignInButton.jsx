import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { useLoading } from "../context/LoadingContext";

export const SignInButton = () => {
  const { instance } = useMsal();
  const { setIsLoading } = useLoading();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = () => {
    if (isSigningIn) return;

    setIsSigningIn(true);
    setIsLoading(true); // Show full-page spinner

    // Small delay ensures spinner appears before redirect
    setTimeout(() => {
      instance.loginRedirect(loginRequest).catch((e) => {
        console.error(e);
        setIsSigningIn(false);
        setIsLoading(false);
      });
    }, 100);
  };

  return (
    <Button
      variant="primary"
      onClick={handleLogin}
      disabled={isSigningIn}
    >
      {isSigningIn ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
};