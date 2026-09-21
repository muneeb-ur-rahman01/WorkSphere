import axios from 'axios'
import {
    getToken,
    getEncKey,
    clearSession,
    isEncryptionAvailable,
    encryptJson,
    decryptJson
} from '../utils/secureSession';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 15000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Bodies we must not wrap in the JSON envelope (file uploads etc.).
const isBinaryBody = (data) =>
    (typeof FormData !== 'undefined' && data instanceof FormData) ||
    (typeof Blob !== 'undefined' && data instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer);

api.interceptors.request.use(async (config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Encrypted transport for authenticated calls (see
    // backend/gateway/payloadCrypto.js). Silently skipped when the browser
    // has no WebCrypto, the session has no key, or the body is a file.
    const encKey = getEncKey();

    if (token && encKey && isEncryptionAvailable() && !isBinaryBody(config.data)) {
        let body = config.data;

        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch { return config; }
        }

        if (body !== undefined && body !== null) {
            config.data = { d: await encryptJson(body, encKey) };
        }

        config.headers['X-WS-Enc'] = '1';
    }

    return config;
});

const decryptResponseData = async (res) => {
    const encKey = getEncKey();

    if (
        res &&
        encKey &&
        res.headers?.['x-ws-enc'] === '1' &&
        res.data &&
        typeof res.data.d === 'string'
    ) {
        try {
            res.data = await decryptJson(res.data.d, encKey);
        } catch (err) {
            console.error('Could not decrypt server response.');
        }
    }

    return res;
};

api.interceptors.response.use(
    (response) => decryptResponseData(response),
    async (error) => {
        if (error.response) {
            await decryptResponseData(error.response);
        }

        if (error.response?.status === 401) {
            clearSession();
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login/org';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
