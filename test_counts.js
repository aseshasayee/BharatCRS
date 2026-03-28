const http = require('http');
http.get('http://localhost:8000/api/complaints?limit=300', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const counts = {};
        JSON.parse(data).forEach(c => {
            const status = c.common_metadata?.status?.toLowerCase();
            const dept = c.governance_and_sla?.assigned_department;
            if (dept) counts[dept] = (counts[dept] || 0) + 1;
        });
        console.log("ACTUAL COUNTS FROM API:");
        console.log(counts);
    });
});