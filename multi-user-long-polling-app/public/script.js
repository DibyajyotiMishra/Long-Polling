let userId;
const seen = new Set();


function startListening() {
    userId = document.getElementById("userId").value;
    document.getElementById("userId").value = "";
    if (!userId) {
        alert("Please enter a user name");
        return;
    }

    poll();
}

function showMessage(message) {
    const li = document.createElement("li");
    li.textContent = `[${userId}] ${message}`;
    document.getElementById("notifications").appendChild(li);
}


async function poll() {
    try {
        const response = await fetch(`/poll/${userId}`);
        const data = await response.json();

        console.log(data)

        /**
         * This is done to ensiure delivery gurantee for messages.
         * Meaning:
         * 1.  At-most-once : Message may be lost, but never duplicated
         * 2. At-least-once : Message may be duplicated, but never lost
         * 3. At-exactly-once : Message delivered once and only once
         * */
        if (!data.message && !seen.has(data.id)) {
            showMessage(data.text);
            seen.add(data.id);

            // send ACK to server against the received message
            fetch(`/ack/${userId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: data.id
                })
            })
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error polling for notifications", error);
    } finally {
        poll();
    }
}


function sendNotification() {
    fetch(`/notify/${userId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: "Notification at " + new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " by " + userId
        })
    })
}