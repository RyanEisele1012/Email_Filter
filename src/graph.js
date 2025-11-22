import { graphConfig } from "./authConfig";


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





