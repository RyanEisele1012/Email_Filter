import React from "react";
import Button from "react-bootstrap/Button";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

/**
 * Single sign-in button that always uses redirect flow.
 */
export const SignInButton = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <Button variant="primary" onClick={handleLogin}>
      Sign in
    </Button>
  );
};
