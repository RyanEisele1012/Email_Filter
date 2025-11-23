import { useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export const useSaveAccessToken = () => {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    useEffect(() => {
        // This line guarantees: only runs when user is logged in
        if (!isAuthenticated || accounts.length === 0) return;

        const saveAccessToken = async () => {
            try {
                const tokenResponse = await instance.acquireTokenSilent({
                    account: accounts[0],
                    scopes: loginRequest.scopes
                });

                await fetch("http://localhost:8080/save-access-token", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${tokenResponse.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(tokenResponse)
                });
            } catch (error) {
                console.error("Failed to save refresh token:", error);
            }
        };

        saveAccessToken().catch(console.error);
    }, [isAuthenticated, accounts, instance]); // ← re-runs only when auth state changes
};