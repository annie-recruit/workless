const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Load env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const REAL_KEY = process.env.NEXTAUTH_SECRET || '';
const FALLBACK_KEY = 'fallback-secret-for-development-only';
const ALGORITHM = 'aes-256-cbc';

function decrypt(text, keyString) {
    try {
        const textParts = text.split(':');
        if (textParts.length < 2) return text;
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = crypto.createHash('sha256').update(String(keyString)).digest();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = decipher.update(encryptedText); // Resetting below
        // Actually need a new decipher instance for each attempt
        return doDecrypt(text, keyString);
    } catch (error) {
        return null;
    }
}

function doDecrypt(text, keyString) {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = crypto.createHash('sha256').update(String(keyString)).digest();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return null;
    }
}

const dbPath = path.join(process.cwd(), 'data', 'workless.db');
const db = new Database(dbPath);

const projectId = 'qW9y_e4lbcX_g1TvH0VdL';
const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

if (!project) {
    console.log('Project not found');
    process.exit(1);
}

const sourceMemoryIds = JSON.parse(project.sourceMemoryIds);
console.log('Project Title:', project.title);
console.log('Source Memory IDs:', sourceMemoryIds);

sourceMemoryIds.forEach(id => {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    if (memory) {
        console.log(`\n--- Memory ID: ${id} ---`);
        console.log('Encrypted sample:', memory.content.substring(0, 50), '...');

        const decReal = doDecrypt(memory.content, REAL_KEY);
        const decFall = doDecrypt(memory.content, FALLBACK_KEY);

        if (decReal) {
            console.log('SUCCESS with REAL_KEY. Length:', decReal.length);
            console.log('Preview:', decReal.substring(0, 300));
        } else if (decFall) {
            console.log('SUCCESS with FALLBACK_KEY. Length:', decFall.length);
            console.log('Preview:', decFall.substring(0, 300));
        } else {
            console.log('FAILED with BOTH keys.');
        }
    } else {
        console.log(`Memory ${id} not found in DB`);
    }
});
