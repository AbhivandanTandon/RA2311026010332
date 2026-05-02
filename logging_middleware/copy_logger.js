const API_BASE_URL = 'http://20.244.56.144/evaluation-service';

const CREDENTIALS = {
  email: 'at3954@srmist.edu.in',
  name: 'abhivandan tandon',
  rollNo: 'ra2311026010332',
  clientID: '5ce63b44-171b-4ea2-92bc-d7cda3142ae9',
  clientSecret: 'XNzTXdxCQNufdsHG',
};

let accessToken = null;
let expiresAt = 0;

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function extractExpiry(token) {
  const payload = token.split('.')[1];

  if (!payload) {
    return Date.now() + 30 * 60 * 1000;
  }

  try {
    const decoded = decodeBase64Url(payload);
    const expMatch = decoded.match(/"exp":(\d+)/);

    if (expMatch) {
      return Number(expMatch[1]) * 1000;
    }
  } catch {
    // Fall through to the default expiry below.
  }

  return Date.now() + 30 * 60 * 1000;
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && accessToken && expiresAt - Date.now() > 60 * 1000) {
    return accessToken;
  }

  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(CREDENTIALS),
  });

  if (!response.ok) {
    throw new Error(`Auth failed with status ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token ?? data.accessToken;

  if (!accessToken) {
    throw new Error('Auth response did not include an access token.');
  }

  expiresAt = extractExpiry(accessToken);
  return accessToken;
}

async function sendLog(token, level, pkg, message) {
  return fetch(`${API_BASE_URL}/logs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stack: 'frontend',
      level,
      package: pkg,
      message,
    }),
  });
}

async function log(level, pkg, message) {
  try {
    let token = await getAccessToken();
    let response = await sendLog(token, level, pkg, message);

    if (response.status === 401) {
      token = await getAccessToken(true);
      response = await sendLog(token, level, pkg, message);
    }

    if (!response.ok) {
      console.error('Log failed:', response.status);
    }
  } catch (error) {
    console.error('Log failed:', error.message);
  }
}

module.exports = { Log: log };

if (require.main === module) {
  log('info', 'utils', 'Sample log from copy_logger.js');
}
