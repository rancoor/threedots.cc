async function loadDocker() {
  const res = await fetch("/docker/containers");
  const containers = await res.json();
  const tbody = document.querySelector("#docker-table tbody");
  tbody.innerHTML = "";
  containers.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.Names.join(", ")}</td>
        <td>${c.State}</td>
        <td><button class="btn btn-sm btn-warning" onclick="restartDocker('${c.Id}')">Restart</button></td>
      </tr>
    `;
  });
}

async function loadPM2() {
  const res = await fetch("/pm2/list");
  const procs = await res.json();
  const tbody = document.querySelector("#pm2-table tbody");
  tbody.innerHTML = "";
  procs.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.pm2_env.status}</td>
        <td><button class="btn btn-sm btn-warning" onclick="restartPM2('${p.pm_id}')">Restart</button></td>
      </tr>
    `;
  });
}

async function restartDocker(id) {
  await fetch(`/docker/restart/${id}`, { method: "POST" });
  loadDocker();
}

async function restartPM2(id) {
  await fetch(`/pm2/restart/${id}`, { method: "POST" });
  loadPM2();
}

// Auto-refresh
setInterval(() => {
  loadDocker();
  loadPM2();
}, 5000);

loadDocker();
loadPM2();
let dockerChart, pm2Chart;

function initCharts() {
  const ctxDocker = document.getElementById("dockerChart").getContext("2d");
  const ctxPm2 = document.getElementById("pm2Chart").getContext("2d");

  dockerChart = new Chart(ctxDocker, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "CPU %", data: [], borderColor: "red", fill: false },
        { label: "Memory MB", data: [], borderColor: "blue", fill: false },
      ],
    },
    options: { responsive: true, animation: false },
  });

  pm2Chart = new Chart(ctxPm2, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "CPU %", data: [], borderColor: "green", fill: false },
        { label: "Memory MB", data: [], borderColor: "orange", fill: false },
      ],
    },
    options: { responsive: true, animation: false },
  });
}

async function updateDockerStats() {
  const res = await fetch("/docker/containers");
  const containers = await res.json();
  if (containers.length === 0) return;

  // Pick the first container for now (extend later)
  const statRes = await fetch(`/docker/stats/${containers[0].Id}`);
  const stats = await statRes.json();

  const t = new Date().toLocaleTimeString();
  dockerChart.data.labels.push(t);
  dockerChart.data.datasets[0].data.push(stats.cpu);
  dockerChart.data.datasets[1].data.push(stats.mem);

  if (dockerChart.data.labels.length > 10) {
    dockerChart.data.labels.shift();
    dockerChart.data.datasets[0].data.shift();
    dockerChart.data.datasets[1].data.shift();
  }

  dockerChart.update();
}

async function updatePm2Stats() {
  const res = await fetch("/pm2/list");
  const procs = await res.json();
  if (procs.length === 0) return;

  // Pick the first PM2 process for now (extend later)
  const statRes = await fetch(`/pm2/stats/${procs[0].pm_id}`);
  const stats = await statRes.json();

  const t = new Date().toLocaleTimeString();
  pm2Chart.data.labels.push(t);
  pm2Chart.data.datasets[0].data.push(stats.cpu);
  pm2Chart.data.datasets[1].data.push(stats.mem);

  if (pm2Chart.data.labels.length > 10) {
    pm2Chart.data.labels.shift();
    pm2Chart.data.datasets[0].data.shift();
    pm2Chart.data.datasets[1].data.shift();
  }

  pm2Chart.update();
}

initCharts();
setInterval(() => {
  loadDocker();
  loadPM2();
  updateDockerStats();
  updatePm2Stats();
}, 5000);
