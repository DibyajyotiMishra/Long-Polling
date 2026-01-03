const express = require("express");
const crypto = require("crypto");
const { createClient } = require("redis");

const app = express();
const redis = createClient();
redis.connect();

app.use(express.json());
app.use(express.static("public"));


const users = {};

function getOrCreateUser(userId) {
    if (!users[userId]) {
        users[userId] = {
            userId,
            clients: []
        }
    }
    return users[userId];
}


app.get("/poll/:userId", async (req, res) => {
    console.log(`${req.params.userId} just started polling...`);
    const user = getOrCreateUser(req.params.userId);

    // checking for undelivered messages
    const data = await redis.lRange(
        `notifications:${user.userId}`,
        0,
        -1
    );
    const messages = data.map(JSON.parse);
    const undeliveredMessage = messages.find(message => !message.delivered);

    // deliver them instantly
    if (undeliveredMessage) {
        console.log(`Delivering undelivered message for ${user.userId}`);
        return res.json(undeliveredMessage);
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

app.post("/ack/:userId", async (req, res) => {
    const user = getOrCreateUser(req.params.userId);
    const { id } = req.body;

    const key = `notifications:${user.userId}`;
    const items = await redis.lRange(key, 0, -1);

    for (const item of items) {
        const msg = JSON.parse(item);

        // Replace message atomically
        if (msg.id === id) {
            msg.delivered = true;
            await redis.lRem(key, 1, item);
            await redis.rPush(key, JSON.stringify(msg));
            break;
        }
    }

    return res.json({
        message: "Acknowledged"
    })
})

app.post("/notify/:userId", async (req, res) => {
    const user = getOrCreateUser(req.params.userId);
    const notification = {
        id: crypto.randomUUID(),
        text: req.body.text,
        delivered: false
    };

    console.log(`New message for ${user.userId}`);

    // Pushing the message to redis for persistence 
    await redis.rPush(
        `notifications:${user.userId}`,
        JSON.stringify(notification)
    );

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
