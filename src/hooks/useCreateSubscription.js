import { useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export const useCreateSubscription = () => {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    useEffect(() => {
        // This line guarantees: only runs when user is logged in
        if (!isAuthenticated || accounts.length === 0) return;

        const create = async () => {
            try {
                const tokenResponse = await instance.acquireTokenSilent({
                    account: accounts[0],
                    scopes: loginRequest.scopes
                });

                await fetch("/create-subscription", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${tokenResponse.accessToken}`,
                        "Content-Type": "application/json",
                    },
                });
            } catch (error) {
                console.error("Failed to create subscription:", error);
            }
        };

        create().catch(console.error);
    }, [isAuthenticated, accounts, instance]); // ← re-runs only when auth state changes
};