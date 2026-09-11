import { CorsOptions } from 'cors';
import { env } from './env';

const staticAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://tailbuddiesfrontend.vercel.app',
  'https://www.tailbuddies.online',
  'https://tailbuddies.online',
];

export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow non-browser agents, Postman, mobile apps

  const cleanOrigin = origin.replace(/\/$/, '');

  const dynamicAllowed = [...staticAllowedOrigins];
  if (env.frontendUrl) {
    dynamicAllowed.push(env.frontendUrl);
  }

  // Check explicit matches
  if (dynamicAllowed.some((allowed) => allowed.replace(/\/$/, '') === cleanOrigin)) {
    return true;
  }

  // Allow all Vercel deployment preview / production subdomains
  if (/^https:\/\/.*\.vercel\.app$/.test(cleanOrigin)) {
    return true;
  }

  return false;
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocked access for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
  ],
  optionsSuccessStatus: 200,
};
