const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\elecp\\AppData\\Roaming\\Cursor\\User\\History';

function findAllHistoryEntries() {
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
      const resource = entriesData.resource || '';
      
      // We are looking for app.js, main.css, index.html, character-data.js, terminal-ascii-experience.js
      if (resource.endsWith('app.js') || 
          resource.endsWith('main.css') || 
          resource.endsWith('index.html') || 
          resource.endsWith('character-data.js') || 
          resource.endsWith('terminal-ascii-experience.js')) {
          
          if (entriesData.entries && entriesData.entries.length > 0) {
              for (const entry of entriesData.entries) {
                  const entryFilePath = path.join(folderPath, entry.id);
                  if (fs.existsSync(entryFilePath)) {
                      candidates.push({
                          resource: resource,
                          filePath: entryFilePath,
                          timestamp: entry.timestamp,
                          date: new Date(entry.timestamp).toISOString()
                      });
                  }
              }
          }
      }
    } catch (e) {
      // ignore
    }
  }

  // Sort candidates by timestamp descending
  candidates.sort((a, b) => b.timestamp - a.timestamp);

  // Print top 100 entries
  console.log(JSON.stringify(candidates.slice(0, 100), null, 2));
}

findAllHistoryEntries();
