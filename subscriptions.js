const { v4: uuidv4 } = require('uuid');

const RENEWAL_INTERVAL = 50 * 60 * 1000; //50 minutes in miliseconds
const INITIAL_INTERVAL = 60 * 60 * 1000; //60 minutes in miliseconds
const NOTIFICATION_URI = process.env.NOTIFICATION_URI

/**
 * Creates a subscription to listen to changes in user's inbox using Graph API.
 * @param {string} accessToken - Microsoft Graph access token
 * @param {string} uniqueId - The ID of the user (usually "me" for signed-in user)
 * 
 * @returns {string} subscriptionId - The ID of the subscription created for the user's inbox
 */
async function createSubscription(accessToken, uniqueId) {
    // This should only be ran after checking Mongo for existing subId
    // Otherwise, create a new subscription
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const body = JSON.stringify({
        changeType: "created", // Only new emails
        notificationUrl: NOTIFICATION_URI,
        resource: `/me/mailFolders/inbox/messages`,
        expirationDateTime: new Date(Date.now() + INITIAL_INTERVAL).toISOString(), // 1 hour from now
        clientState: uuidv4() // Optional, used to validate notifications
    });

    const options = {
        method: "POST",
        headers: headers,
        body: body
    };

    try {
        // Make the request to the Microsoft Graph API
        const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", options);

        // Log status code and status text for debugging
        console.log("[Webhook] Response Status:", response.status, response.statusText);

        // Check if the response status is not OK
        if (!response.ok) {
            // If response is not OK, log the response and throw an error
            const errorText = await response.text();  // Read response text to inspect the error message
            throw new Error(`Error creating subscription: ${response.status} ${response.statusText}, ${errorText}`);
        }

        // Parse the JSON response from the Microsoft Graph API
        const subscription = await response.json();

        // Debugging: Log the full response to understand the structure
        console.log("[Webhook] Create Subscription Response:", subscription);

        // Check if 'id' exists in the subscription response
        if (subscription && subscription.id) {
            const subscriptionId = subscription.id; // Extract subscriptionId
            console.log(`[Subscription] Created: ${subscriptionId} for User ${uniqueId}`);
            return subscriptionId; // Return the subscriptionId for further use
        } else {
            throw new Error("Subscription creation failed: No subscription id in response");
        }

    } catch (error) {
        // Log error details
        console.log("[Webhook] Create failed:", error);
        // Handle or rethrow the error if necessary
        return null; // Ensure we return null if the subscription creation fails
    }
}



/**
 * Renews an existing subscription using Graph API.
 * @param {string} accessToken - Microsoft Graph access token
 * @param {string} uniqueId - The ID of the user (usually "me" for signed-in user)
 * @param {string} subscriptionId - The ID of the subscription to renew
 */
async function renewSubscription(accessToken, uniqueId, subscriptionId) {
    //If there is, renew the subscription
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    // Set a new expiration time (max 4230 minutes for mail subscriptions)
    const body = JSON.stringify({
        expirationDateTime: new Date(Date.now() + RENEWAL_INTERVAL).toISOString() // renew for 1 more hour
    });

    const options = {
        method: "PATCH",
        headers: headers,
        body: body
    };

    try {
        const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }
        return response.json();
    } catch (error) {
        console.error("Error renewing subscription:", error);
        throw error;
    }
}


/**
 * Deletes an existing subscription using Graph API.
 * @param {string} accessToken - Microsoft Graph access token
 * @param {string} subscriptionId - The ID of the subscription to delete
 * @returns {string} confirmation - Can either be succesful object or null.
 */
async function deleteSubscription(accessToken, subscriptionId) {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);

    const options = {
        method: "DELETE",
        headers: headers
    };

    try {
        const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }
        let confirmation = { success: true }
        return confirmation;
    } catch (error) {
        console.error("Error deleting subscription:", error);
        throw error;
    }
}


// Webhook handler - This is where notifications for new emails will be picked up
async function emailListener(req, res) {
    const notificationList = req.body?.value || [];
    console.log(JSON.stringify(notificationList))

    res.status(202).send();
}

//Proper export format if using require())
module.exports = {
    createSubscription,
    renewSubscription,
    deleteSubscription,
    emailListener,
};