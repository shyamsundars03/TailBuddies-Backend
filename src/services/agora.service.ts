import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';
import crypto from 'crypto';

import { env } from '../config/env';
import logger from '../logger';

export class AgoraService {

    private static stringToUid(uid: any): number {
        if (typeof uid === 'number') return uid >>> 0;
        if (!uid || uid === '0') return 0;
        
       
        if (typeof uid === 'string' && /^\d+$/.test(uid) && uid.length < 10) {
            return parseInt(uid, 10) >>> 0;
        }

        
        let hash = 0;
        const str = String(uid);
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return (hash >>> 0);
    }

    static generateRtcToken(channelName: string, uid: string | number, role: 'publisher' | 'subscriber' = 'publisher') {
        try {
            const numericUid = this.stringToUid(uid);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const privilegeExpiredTs = currentTimestamp + 3600;
            const rtcRole = role === 'publisher' 
                ? RtcRole.PUBLISHER 
                : RtcRole.SUBSCRIBER;

            const appId = (process.env.AGORA_APP_ID || '').trim();
            const appCertificate = (process.env.AGORA_APP_CERTIFICATE || '').trim();

            console.log("Agora Credentials Check:", {
                appIdPrefix: appId.substring(0, 4) + "...",
                certPrefix: appCertificate.substring(0, 4) + "...",
                appIdLength: appId.length,
                certLength: appCertificate.length
            });

            if (!appId || !appCertificate) {
                console.error("CRITICAL: Agora App ID or Certificate is MISSING in environment variables!");
            }

            
            const token = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate, 
                channelName,
                numericUid,
                rtcRole,
                privilegeExpiredTs,
                privilegeExpiredTs
            );

            return token;
        } catch (error) {
            logger.error('Error generating RTC token:', error);
            throw error;
        }
    }

    static generateRtmToken(userId: string) {
        try {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const privilegeExpiredTs = currentTimestamp + 3600;

            const appId = env.agoraAppId.trim();
            const appCertificate = env.agoraAppCertificate.trim();

            const token = RtmTokenBuilder.buildToken(
                appId,
                appCertificate,
                userId,
                privilegeExpiredTs
            );

            return token;
        } catch (error) {
            logger.error('Error generating RTM token:', error);
            throw error;
        }
    }
}
