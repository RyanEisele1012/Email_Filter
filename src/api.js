
const requestStats = (token) =>
    fetch('http://localhost:3000/get-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token)
    }).then(r => r.json());

const requestSubscription = (token) =>
    fetch('http://localhost:3000/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({token})
    }).then(r => r.json());

//Proper export format if using require())
module.exports = {
    requestStats,
    requestSubscription
};