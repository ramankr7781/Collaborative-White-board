const { createClient } = require("redis");

// In-memory fallback cache with TTL support
const memoryStore = new Map();

const memoryCache = {
  get(key) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  set(key, value, options) {
    let expiresAt = null;
    if (options && options.EX) {
      expiresAt = Date.now() + options.EX * 1000;
    } else if (options && options.PX) {
      expiresAt = Date.now() + options.PX;
    }
    memoryStore.set(key, { value: String(value), expiresAt });
    return "OK";
  },
  del(key) {
    memoryStore.delete(key);
    return 1;
  },
};

let client = null;
let isRedisConnected = false;
const redisUrl = process.env.REDIS_URL;

let hasLoggedError = false;

if (redisUrl && redisUrl.trim()) {
  try {
    client = createClient({
      url: redisUrl.trim(),
      socket: {
        connectTimeout: 2500,
        reconnectStrategy: (retries) => {
          if (retries >= 1) {
            return false; // Stop reconnecting immediately on dead endpoint
          }
          return 500;
        },
      },
    });

    client.on("connect", () => {
      console.log("[Redis] Connecting...");
    });

    client.on("ready", () => {
      isRedisConnected = true;
      console.log("[Redis] Connected and ready.");
    });

    client.on("error", (err) => {
      isRedisConnected = false;
      if (!hasLoggedError) {
        hasLoggedError = true;
        console.warn(
          `[Redis] Connection failed (${err.message}). Using in-memory cache fallback.`
        );
      }
    });

    client.on("end", () => {
      isRedisConnected = false;
    });

    client.connect().catch(() => {
      isRedisConnected = false;
    });
  } catch (err) {
    console.warn("[Redis] Client creation failed:", err.message);
  }
} else {
  console.log("[Redis] No REDIS_URL provided; using in-memory store.");
}

const safeRedisClient = {
  get isReady() {
    return isRedisConnected;
  },
  get isOpen() {
    return isRedisConnected;
  },
  async get(key) {
    if (isRedisConnected && client) {
      try {
        return await client.get(key);
      } catch (err) {
        console.warn("[Redis] get error, using fallback:", err.message);
      }
    }
    return memoryCache.get(key);
  },
  async set(key, value, options) {
    memoryCache.set(key, value, options);
    if (isRedisConnected && client) {
      try {
        return await client.set(key, value, options);
      } catch (err) {
        console.warn("[Redis] set error:", err.message);
      }
    }
    return "OK";
  },
  async del(key) {
    memoryCache.del(key);
    if (isRedisConnected && client) {
      try {
        return await client.del(key);
      } catch (err) {
        console.warn("[Redis] del error:", err.message);
      }
    }
    return 1;
  },
  on(event, cb) {
    if (client) {
      client.on(event, cb);
    }
  },
};

module.exports = safeRedisClient;