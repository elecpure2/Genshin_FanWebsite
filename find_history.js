const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\elecp\\AppData\\Roaming\\Cursor\\User\\History';

function findRecentFiles() {
  const folders = fs.readdirSync(historyDir);
  const candidates = [];

  for (const folder of folders) {
    const folderPath = path.join(historyDir, folder);
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) continue;

    // Inside each folder, there is an 'entries.json' and multiple history files
    const entriesPath = path.join(folderPath, 'entries.json');
    if (!fs.existsSync(entriesPath)) continue;

    try {
      const entriesData = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
      // entries.json typically looks like: { "version": 1, "resource": "file:///path/to/app.js", "entries": [ { "id": "hash", "timestamp": 12345 } ] }
      const resource = entriesData.resource || '';
      
      // We are looking for app.js, main.css, index.html, character-data.js, terminal-ascii-experience.js
      if (resource.endsWith('app.js') || 
          resource.endsWith('main.css') || 
          resource.endsWith('index.html') || 
          resource.endsWith('character-data.js') || 
          resource.endsWith('terminal-ascii-experience.js')) {
          
          if (entriesData.entries && entriesData.entries.length > 0) {
              // Get the latest entry
              const latestEntry = entriesData.entries[entriesData.entries.length - 1];
              const entryFilePath = path.join(folderPath, latestEntry.id);
              if (fs.existsSync(entryFilePath)) {
                  candidates.push({
                      resource: resource,
                      filePath: entryFilePath,
                      timestamp: latestEntry.timestamp
                  });
              }
          }
      }
    } catch (e) {
      // ignore
    }
  }

  // Group by resource and get the latest
  const latestFiles = {};
  for (const c of candidates) {
      if (!latestFiles[c.resource] || latestFiles[c.resource].timestamp < c.timestamp) {
          latestFiles[c.resource] = c;
      }
  }

  console.log(JSON.stringify(latestFiles, null, 2));
}

findRecentFiles();
