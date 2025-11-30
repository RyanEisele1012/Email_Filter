// subscriptions.js

const RENEWAL_INTERVAL = 50 * 60 * 1000; // 50 minutes
const INITIAL_INTERVAL = 60 * 60 * 1000; // 60 minutes
const NOTIFICATION_URI = `${process.env.BACKEND_URL}/listen`;

/**
 * Creates a subscription and returns both ID and expiration
 */
async function createSubscription(accessToken) {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const expirationDateTime = new Date(Date.now() + INITIAL_INTERVAL);

    const body = JSON.stringify({
        changeType: "created",
        notificationUrl: NOTIFICATION_URI,
        resource: `/me/mailFolders/inbox/messages`,
        expirationDateTime: expirationDateTime.toISOString(),
        // clientState: uuidv4() // optional for verification
    });

    const options = { method: "POST", headers, body };

    try {
        const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", options);

        console.log("[Webhook] Create Response Status:", response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create subscription: ${response.status} ${errorText}`);
        }

        const subscription = await response.json();
        console.log("[Subscription] Created:", subscription.id, "Expires:", subscription.expirationDateTime);

        return {
            subscriptionId: subscription.id,
            expirationDateTime: subscription.expirationDateTime // ISO string from Microsoft
        };
    } catch (error) {
        console.error("[Webhook] Create failed:", error.message);
        return null;
    }
}

/**
 * Renews subscription by extending expiration
 */
async function renewSubscription(accessToken, subscriptionId) {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const newExpiration = new Date(Date.now() + RENEWAL_INTERVAL);

    const body = JSON.stringify({
        expirationDateTime: newExpiration.toISOString()
    });

    const options = { method: "PATCH", headers, body };

    try {
        const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Renew failed: ${JSON.stringify(errorData)}`);
        }

        const updatedSub = await response.json();
        console.log("[Subscription] Renewed:", subscriptionId, "New expiry:", updatedSub.expirationDateTime);

        return {
            subscriptionId: updatedSub.id,
            expirationDateTime: updatedSub.expirationDateTime
        };
    } catch (error) {
        console.error("[Subscription] Renew error:", error.message);
        throw error;
    }
}

/**
 * Deletes subscription using Graph API
 */
async function deleteSubscription(accessToken, subscriptionId) {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);

    const options = { method: "DELETE", headers };

    try {
        const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, options);

        if (!response.ok && response.status !== 404) { // 404 means already gone
            const errorData = await response.json();
            throw new Error(`Delete failed: ${JSON.stringify(errorData)}`);
        }

        console.log("[Subscription] Deleted successfully:", subscriptionId);
        return { success: true };
    } catch (error) {
        console.error("[Subscription] Delete error:", error.message);
        throw error;
    }
}

module.exports = {
    createSubscription,
    renewSubscription,
    deleteSubscription,
    RENEWAL_INTERVAL
};