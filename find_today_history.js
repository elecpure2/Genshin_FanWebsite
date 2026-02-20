const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\elecp\\AppData\\Roaming\\Cursor\\User\\History';

function extractTodayHistory() {
  const folders = fs.readdirSync(historyDir);
  const candidates = {};

  const today = new Date().toISOString().split('T')[0];

  for (const folder of folders) {
    const folderPath = path.join(historyDir, folder);
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) continue;

    const entriesPath = path.join(folderPath, 'entries.json');
    if (!fs.existsSync(entriesPath)) continue;

    try {
      const entriesData = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
      const resource = entriesData.resource || '';
      
      const filename = path.basename(decodeURIComponent(resource));
      if (!['index.html', 'app.js', 'main.css', 'character-data.js', 'terminal-ascii-experience.js'].includes(filename)) continue;

      if (!candidates[filename]) candidates[filename] = [];

      for (const entry of entriesData.entries) {
        const entryPath = path.join(folderPath, entry.id);
        if (fs.existsSync(entryPath)) {
          const entryStat = fs.statSync(entryPath);
          const dateStr = new Date(entry.timestamp).toISOString();
          if (dateStr.startsWith(today)) {
             candidates[filename].push({
                timestamp: entry.timestamp,
                date: dateStr,
                path: entryPath,
                size: entryStat.size
             });
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  for (const file in candidates) {
    candidates[file].sort((a, b) => b.timestamp - a.timestamp);
    console.log(`\n=== ${file} (${candidates[file].length} entries today) ===`);
    candidates[file].slice(0, 5).forEach(c => {
      console.log(`- ${c.date} | size: ${c.size} | path: ${c.path}`);
    });
  }
}

extractTodayHistory();
