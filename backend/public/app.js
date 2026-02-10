function show(id) {
  ['upload', 'logs', 'charts'].forEach(i => {
    const el = document.getElementById(i);
    if (el) el.style.display = 'none';
  });
  document.getElementById(id).style.display = 'block';
}

function upload() {
  const file = document.getElementById('logfile').files[0];
  if (!file) {
    alert('Select a log file');
    return;
  }

  const fd = new FormData();
  fd.append('log', file);

  fetch('/api/analysis/upload', {
    method: 'POST',
    body: fd
  })
    .then(r => r.json())
    .then(data => {
      document.getElementById('summary').textContent =
        JSON.stringify(data.summary, null, 2);

      document.getElementById('issues').innerHTML =
        data.issues.map(i => `
          <div class="issue ${i.severity}">
            <b>${i.severity}</b> | ${i.device}<br/>
            ${i.message}<br/>
            <i>Fix:</i> ${i.suggestion}
          </div>
        `).join('');

      renderChart(data.summary);
      show('logs');
    });
}

function renderChart(summary) {
  const ctx = document.getElementById('chart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['INFO', 'WARN', 'ERROR'],
      datasets: [{
        data: [summary.INFO, summary.WARN, summary.ERROR]
      }]
    }
  });
}
