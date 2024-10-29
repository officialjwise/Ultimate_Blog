const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');

class SecurityUtils {
  /**
   * Get device information from user agent
   */
  static getDeviceInfo(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`,
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`,
      device: result.device.type || 'desktop',
      deviceVendor: result.device.vendor || 'Unknown',
      deviceModel: result.device.model || 'Unknown'
    };
  }

  /**
   * Get location information from IP
   */
  static getLocationInfo(ip) {
    const geo = geoip.lookup(ip);
    return geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ll: geo.ll // latitude/longitude
    } : null;
  }

  /**
   * Generate device fingerprint
   */
  static generateDeviceFingerprint(req) {
    const components = [
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.ip
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Check if location is suspicious (significant distance from usual locations)
   */
  static isSuspiciousLocation(newLocation, previousLocations) {
    if (!previousLocations || previousLocations.length === 0) return false;
    
    // Calculate distance from previous locations
    const [newLat, newLon] = newLocation.ll;
    
    return !previousLocations.some(loc => {
      const [prevLat, prevLon] = loc.ll;
      const distance = this.calculateDistance(newLat, newLon, prevLat, prevLon);
      return distance < 1000; // Less than 1000km
    });
  }

  /**
   * Calculate distance between two points in km
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static toRad(value) {
    return value * Math.PI / 180;
  }

  /**
   * Check if IP is in blocked list
   */
  static async isIpBlocked(ip) {
    const { data } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('ip', ip)
      .single();

    return !!data;
  }
}

module.exports = SecurityUtils;