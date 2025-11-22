const { v4: uuidv4 } = require('uuid');

const SUBSCRIPTION_TRACKER = new Map();
const RENEWAL_INTERVAL = 50 * 60 * 1000; //50 minutes in miliseconds
const INITIAL_INTERVAL = 60 * 60 * 1000; //60 minutes in miliseconds
const NOTIFICATION_URI = process.env.NOTIFICATION_URI

/**
 * Creates a subscription to listen to changes in user's inbox using Graph API.
 * @param {string} accessToken - Microsoft Graph access token
 * @param {string} userId - The ID of the user (usually "me" for signed-in user)
 */
async function createSubscription(accessToken, userId) {
    //Check if subsciption already exists and if it is, return it
    if (SUBSCRIPTION_TRACKER.has(userId))
        return SUBSCRIPTION_TRACKER.get(userId);

    //Otherwise, create a new subscription
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json")

    const body = JSON.stringify({
        changeType: "created", // only new emails
        notificationUrl: NOTIFICATION_URI,
        resource: `/users/${userId}/mailFolders/inbox/messages`,
        expirationDateTime: new Date(Date.now() + INITIAL_INTERVAL).toISOString(), // 1 hour from now
        clientState: uuidv4() // optional, used to validate notifications
    });

    const options = {
        method: "POST",
        headers: headers,
        body: body
    };

    return fetch("https://graph.microsoft.com/v1.0/subscriptions", options)
        .then(response => {
            const subscriptionId = response.id
            SUBSCRIPTION_TRACKER.set(userId, subscriptionId)
            console.log(`[Subscription] Created: ${subscriptionId} for ${userId}`);
        })
        .catch(error => {
            console.log("[Webhook] Create failed:", error);
        });
}


/**
 * Renews an existing subscription using Graph API.
 * @param {string} accessToken - Microsoft Graph access token
 * @param {string} userId - The ID of the user (usually "me" for signed-in user)
 * @param {string} subscriptionId - The ID of the subscription to renew
 */
async function renewSubscription(accessToken, userId, subscriptionId) {
    //Check if there's an active subscription to renew
    if (!SUBSCRIPTION_TRACKER.has(userId))
        return;

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
        return { success: true };
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
    emailListener
};