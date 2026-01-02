async function poll() {
    try {
        const response = await fetch("/poll");
        const data = await response.json();

        if (data.message) {
            alert(data.message);
        } else {
            const li = document.createElement("li");
            li.textContent = data.text;
            document.getElementById("notifications").appendChild(li);
        }
    } catch (error) {
        console.log("Error polling for notifications", error);
    } finally {
        // reconnect immediately
        poll();
    }
}

poll();


function sendNotification() {
    fetch("/notify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: "Notification at " + new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        })
    })
}