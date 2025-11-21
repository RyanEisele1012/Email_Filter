import { graphConfig } from "./authConfig";
const { v4: uuidv4 } = require('uuid');

/**
 * Retrieves information about the User using Graph API.
 * @param {string} accessToken 
 */
export async function getUserData(accessToken) {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);

    const options = {
        method: "GET",
        headers: headers
    };

    return fetch(graphConfig.graphMeEndpoint, options)
        .then(response => response.json())
        .catch(error => console.log(error));
}

/**
 * Retrieves a specific email by ID using Graph API.
 * @param {string} accessToken 
 * @param {string} emailId
 */
export async function getEmailById(accessToken, emailId) {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);
    headers.append("Prefer", "outlook.body-content-type=text")

    const options = {
        method: "GET",
        headers: headers
    };

    return fetch(`${graphConfig.graphMeMessagesEndpoint}/${emailId}`, options)
        .then(response => response.json())
        .catch(error => console.log(error));
}


//====================================================================
//                        Subscription Section
//====================================================================

const SUBSCRIPTION_TRACKER = new Map();
const RENEWAL_INTERVAL = 50 * 60 * 1000; //50 minutes in miliseconds
const INITIAL_INTERVAL = 60 * 60 * 1000; //60 minutes in miliseconds

/**
 * Creates a subscription to listen to changes in user's inbox using Graph API.
 * @param {string} accessToken - Microsoft Graph access token
 * @param {string} userId - The ID of the user (usually "me" for signed-in user)
 * @param {string} notificationURI - Your backend webhook endpoint that will receive notifications
 */
export async function createSubscription(accessToken, userId, notificationURI) {
    //Check if subsciption already exists and if it is, return it
    if (SUBSCRIPTION_TRACKER.has(userId))
        return SUBSCRIPTION_TRACKER.get(userId);

    //Otherwise, create a new subscription
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json")

    const body = JSON.stringify({
        changeType: "created", // only new emails
        notificationUrl: notificationURI,
        resource: `/users/${userId}/mailFolders/inbox/messages`,
        expirationDateTime: new Date(Date.now() + INITIAL_INTERVAL).toISOString(), // 1 hour from now
        clientState: uuidv4() // optional, used to validate notifications
    });

    const options = {
        method: "POST",
        headers: headers,
        body: body
    };

    return fetch(graphConfig.graphSubscriptionsEndpoint, options)
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
export async function renewSubscription(accessToken, userId, subscriptionId) {
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
        const response = await fetch(`${graphConfig.graphSubscriptionsEndpoint}/${subscriptionId}`, options);
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
export async function deleteSubscription(accessToken, subscriptionId) {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);

    const options = {
        method: "DELETE",
        headers: headers
    };

    try {
        const response = await fetch(`${graphConfig.graphSubscriptionsEndpoint}/${subscriptionId}`, options);
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
export async function emailListener(req, res) {
    const notificationList = req.body?.value || [];
    console.log(JSON.stringify(notificationList))

    res.status(202).send();
}



