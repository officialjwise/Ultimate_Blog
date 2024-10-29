const { supabase } = require('../config/database');
const SecurityUtils = require('./securityUtils');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
  /**
   * Create new session
   */
  static async createSession(user, req) {
    const deviceFingerprint = SecurityUtils.generateDeviceFingerprint(req);
    const deviceInfo = SecurityUtils.getDeviceInfo(req.headers['user-agent']);
    const locationInfo = SecurityUtils.getLocationInfo(req.ip);

    // Create or update device record
    await this.updateDeviceRecord(user.id, deviceFingerprint, deviceInfo);

    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: session, error } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: user.id,
        session_token: sessionToken,
        device_fingerprint: deviceFingerprint,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip,
        ...deviceInfo,
        ...locationInfo,
        expires_at: expiresAt,
        last_activity: new Date()
      }])
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await this.logActivity(user.id, session.id, 'LOGIN', req, 'SUCCESS');

    return session;
  }

  /**
   * Update device record
   */
  static async updateDeviceRecord(userId, fingerprint, deviceInfo) {
    const { data: existingDevice } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint)
      .single();

    if (existingDevice) {
      await supabase
        .from('user_devices')
        .update({
          last_used_at: new Date(),
          ...deviceInfo
        })
        .eq('id', existingDevice.id);
    } else {
      await supabase
        .from('user_devices')
        .insert([{
          user_id: userId,
          device_fingerprint: fingerprint,
          ...deviceInfo
        }]);
    }
  }

  /**
   * Log user activity
   */
  static async logActivity(userId, sessionId, activityType, req, status, details = {}) {
    const deviceFingerprint = SecurityUtils.generateDeviceFingerprint(req);
    const deviceInfo = SecurityUtils.getDeviceInfo(req.headers['user-agent']);
    const locationInfo = SecurityUtils.getLocationInfo(req.ip);

    await supabase
      .from('user_activities')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        activity_type: activityType,
        ip_address: req.ip,
        device_fingerprint: deviceFingerprint,
        status,
        ...deviceInfo,
        ...locationInfo,
        details
      }]);
  }

  /**
   * Check if session is valid
   */
  static async validateSession(sessionToken) {
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (!session) return false;

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await this.invalidateSession(session.id);
      return false;
    }

    return session;
  }

  /**
   * Invalidate session
   */
  static async invalidateSession(sessionId) {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
  }

  /**
   * Get user's active sessions
   */
  static async getUserSessions(userId) {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    return sessions;
  }
}

module.exports = SessionManager;