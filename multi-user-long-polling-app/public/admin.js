async function fetchStatus() {
    try {
        const response = await fetch("/admin/stats");
        const data = await response.json();

        const tbody = document.getElementById("stats");
        tbody.innerHTML = "";

        data.forEach(user => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${user.userId}</td>
                <td>${user.clients}</td>
                <td>${user.notifications}</td>
                <td>${user.undelivered}</td>
            `;
            tbody.appendChild(tr);
        })

    } catch (error) {
        console.error("Error fetching status", error);
    }
}


setInterval(fetchStatus, 2000);

fetchStatus();
