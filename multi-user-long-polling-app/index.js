const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const users = {};

function getOrCreateUser(userId) {
    if (!users[userId]) {
        users[userId] = {
            userId,
            notifications: [],
            clients: []
        }
    }
    return users[userId];
}

app.get("/poll/:userId", (req, res) => {
    const user = getOrCreateUser(req.params.userId);
    console.log(`${user.userId} just started polling...`);

    // checking for undelivered messages
    const undeliveredMessage = user.notifications.find(message => !message.delivered);

    // deliver them instantly
    if (undeliveredMessage) {
        console.log(`Delivering undelivered message for ${user.userId}`);
        return res.json(undeliveredMessage);
    }

    // if user has notifications, send them right away
    if (user.notifications.length > 0) {
        console.log(`${user.userId} has notifications. Sending them to the client right away!`);
        // To close the connection immediately, we returnd the response.
        return res.json(user.notifications.shift());
    }

    // if user has no notifications, wait for them
    user.clients.push(res);

    setTimeout(() => {
        /**
         * Why res? 
         * Because, res holds the connection of the client and it will be removed from the array
         * So basically each item in the client array is an active subscriber waiting for notifications.
         */
        const idx = user.clients.indexOf(res);

        /**
         * What does index !== -1 mean?
         * This response (res) is still present in the clients array.
         * Remove this res from the waiting list, because the client has timed out and is no longer valid.
         */
        if (idx !== -1) {
            console.log(`Polling for ${user.userId} timed out.`);
            user.clients.splice(idx, 1);
            res.json({
                message: `No new notifications for ${user.userId}`
            });
        }
    }, 30000)
})

app.post("/ack/:userId", (req, res) => {
    const user = getOrCreateUser(req.params.userId);
    const { id } = req.body;
    const message = user.notifications.find(message => message.id === id);

    if (message) {
        message.delivered = true;
    }

    return res.json({
        message: "Acknowledged"
    })
})

app.post("/notify/:userId", (req, res) => {
    const user = getOrCreateUser(req.params.userId);
    const notification = {
        id: crypto.randomUUID(),
        text: req.body.text,
        delivered: false
    };

    console.log(`New message for ${user.userId}`);

    // If there are waiting clients, deliver the notification instantly
    if (user.clients.length > 0) {
        console.log("Delivering notifications instantly...");
        user.clients.forEach(client => {
            client.json({
                id: notification.id,
                text: notification.text,
            });
        })

        user.clients = [];
    }
    // If there are no waiting clients, add the notification to the queue and send them once they are available
    else {
        console.log("No clients waiting for notifications. Adding to the queue...");
        user.notifications.push(notification);
    }

    res.json({
        message: "Notification sent successfully"
    })
})

app.get("/admin/stats", (req, res) => {
    const data = Object
        .entries(users)
        .map(([userId, user]) => {
            return {
                userId,
                notifications: user.notifications.length,
                clients: user.clients.length,
                undelivered: user.notifications.filter(message => !message.delivered).length
            }
        })

    res.json(data);
})


app.listen(3000, () => {
    console.log(`Server running on port 3000`);
});
