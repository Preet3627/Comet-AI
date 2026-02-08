const { google } = require('googleapis');
const { app, ipcMain } = require('electron'); // Import app and ipcMain for Electron-specific functionality
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'gmail-credentials.json');
const TOKEN_PATH = path.join(app.getPath('userData'), 'gmail-token.json');

let oAuth2Client = null;

const getOAuth2Client = () => {
  if (oAuth2Client) return oAuth2Client;

  let credentials = {};
  if (fs.existsSync(CREDENTIALS_PATH)) {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  } else {
    // Fallback or user prompt to provide credentials
    console.warn('Gmail API credentials not found. Please provide client_secret.json');
    return null;
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Load token if it exists
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
  }
  return oAuth2Client;
};

const authorize = async () => {
  const client = getOAuth2Client();
  if (!client) throw new Error('OAuth2 client not initialized. Missing credentials.');

  if (client.credentials.access_token) {
    console.log('Using existing Gmail token.');
    return client;
  }

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.labels'],
  });

  // Open authUrl in browser (or in a new Electron window)
  console.log('Authorize this app by visiting this URL:', authUrl);
  // In Electron, you'd typically open this in a new BrowserWindow
  ipcMain.emit('open-auth-window', authUrl); // This needs to be handled in main.js

  return new Promise((resolve, reject) => {
    ipcMain.once('gmail-oauth-code', async (event, code) => {
      try {
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Gmail token stored to', TOKEN_PATH);
        resolve(client);
      } catch (error) {
        reject(new Error('Error retrieving access token: ' + error.message));
      }
    });
  });
};

const getGmailService = async () => {
  const client = await authorize();
  return google.gmail({ version: 'v1', auth: client });
};

async function listMessages(query = 'in:inbox', maxResults = 10) {
  try {
    const gmail = await getGmailService();
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults,
    });
    return res.data.messages || [];
  } catch (error) {
    console.error('Failed to list Gmail messages:', error);
    throw error;
  }
}

async function getMessage(messageId) {
  try {
    const gmail = await getGmailService();
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full', // 'full', 'metadata', 'raw'
    });
    return res.data;
  } catch (error) {
    console.error(`Failed to get Gmail message ${messageId}:`, error);
    throw error;
  }
}

async function sendMessage(to, subject, body, threadId = null) {
  try {
    const gmail = await getGmailService();
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const message = {
      raw: encodedEmail,
      threadId: threadId
    };

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: message,
    });
    return res.data;
  } catch (error) {
    console.error('Failed to send Gmail message:', error);
    throw error;
  }
}

async function addLabelToMessage(messageId, labelName) {
  try {
    const gmail = await getGmailService();
    // Ensure the label exists, create if not
    let labelId = null;
    const labelsRes = await gmail.users.labels.list({ userId: 'me' });
    const existingLabel = labelsRes.data.labels.find(label => label.name === labelName);

    if (existingLabel) {
      labelId = existingLabel.id;
    } else {
      const createLabelRes = await gmail.users.labels.create({
        userId: 'me',
        requestBody: { name: labelName },
      });
      labelId = createLabelRes.data.id;
    }

    const res = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
    return res.data;
  } catch (error) {
    console.error(`Failed to add label to message ${messageId}:`, error);
    throw error;
  }
}

module.exports = {
  authorize,
  listMessages,
  getMessage,
  sendMessage,
  addLabelToMessage,
};