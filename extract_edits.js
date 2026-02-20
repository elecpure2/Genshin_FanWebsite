const fs = require('fs');
const readline = require('readline');

const jsonlPath = 'C:\\Users\\elecp\\.cursor\\projects\\c-Users-elecp-Desktop-Creative-WEB-Genshin-Impact-FanWeb\\agent-transcripts\\ad869e1c-c87d-4b2e-8fe6-64b8c61df373\\ad869e1c-c87d-4b2e-8fe6-64b8c61df373.jsonl';

async function extractEdits() {
    const fileStream = fs.createReadStream(jsonlPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let writes = {};

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const parsed = JSON.parse(line);
            
            // Check for tool calls or tool results
            if (parsed.message && parsed.message.content) {
                for (const content of parsed.message.content) {
                    if (content.type === 'tool_use' && content.name === 'StrReplace') {
                        const args = content.input;
                        if (!writes[args.path]) writes[args.path] = [];
                        writes[args.path].push({ type: 'replace', old: args.old_string, new: args.new_string });
                    } else if (content.type === 'tool_use' && content.name === 'Write') {
                        const args = content.input;
                        writes[args.path] = [{ type: 'write', content: args.contents }];
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing line:', e.message);
        }
    }

    fs.writeFileSync('extracted_edits.json', JSON.stringify(writes, null, 2));
    console.log('Saved to extracted_edits.json');
}

extractEdits();
