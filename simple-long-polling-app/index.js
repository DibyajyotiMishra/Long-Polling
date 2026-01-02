const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));


let notifications = [];
let clients = [];

app.get("/poll", (req, res) => {
    // If notification already exists, send immediately
    if (notifications.length > 0) {
        return res.json(notifications.shift());
    }

    // If no notification exists, add client to the list. Keep the request open.
    clients.push(res);

    // Wait for 15 secs, and then inform that no new notifications are available.
    setTimeout(() => {
        const idx = clients.indexOf(res);

        if (idx !== -1) {
            clients.splice(idx, 1);
            res.json({
                message: "No new notifications"
            })
        }
    }, 15000)
});

app.post("/notify", (req, res) => {
    const message = req.body;

    // If clients are available, send the notification to all clients
    if (clients.length > 0) {
        clients.forEach(client => {
            client.json(message);
        })
        clients = [];
    } else {
        notifications.push(message);
    }

    res.json({
        message: "Notification sent successfully"
    })
})

app.listen(3000, () => {
    console.log("Server started on port 3000");
});