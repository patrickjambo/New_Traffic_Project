/**
 * SMS Service for Emergency Alerts
 * Sends SMS notifications to police dispatch center using Twilio
 */

const twilio = require('twilio');

class SMSService {
  constructor() {
    // Twilio credentials (set in .env file)
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.policeDispatchNumbers = process.env.POLICE_DISPATCH_NUMBERS?.split(',') || [];
    
    if (this.accountSid && this.authToken && this.fromNumber) {
      this.client = twilio(this.accountSid, this.authToken);
      console.log('✅ SMS Service initialized with Twilio');
    } else {
      console.warn('⚠️  SMS Service: Twilio credentials not configured. SMS alerts disabled.');
      this.client = null;
    }
  }

  /**
   * Send emergency SMS alert to police dispatch
   * @param {Object} emergency - Emergency object from database
   * @returns {Promise<Object>} SMS delivery status
   */
  async sendEmergencySMS(emergency) {
    if (!this.client) {
      console.log('SMS Service not configured, skipping SMS alert');
      return { success: false, error: 'SMS service not configured' };
    }

    if (this.policeDispatchNumbers.length === 0) {
      console.warn('⚠️  No police dispatch numbers configured');
      return { success: false, error: 'No dispatch numbers configured' };
    }

    try {
      // Format emergency message
      const message = this._formatEmergencyMessage(emergency);
      
      // Send SMS to all dispatch numbers
      const sendPromises = this.policeDispatchNumbers.map(phoneNumber => 
        this._sendSMS(phoneNumber.trim(), message)
      );

      const results = await Promise.allSettled(sendPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`📨 SMS Alerts sent: ${successful} successful, ${failed} failed`);
      
      return {
        success: successful > 0,
        total: this.policeDispatchNumbers.length,
        successful,
        failed,
        results
      };
    } catch (error) {
      console.error('❌ SMS Service error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS to a single phone number
   * @private
   */
  async _sendSMS(to, body) {
    try {
      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to
      });

      console.log(`✅ SMS sent to ${to}: ${message.sid}`);
      return {
        success: true,
        sid: message.sid,
        to,
        status: message.status
      };
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Format emergency data into SMS message
   * @private
   */
  _formatEmergencyMessage(emergency) {
    const {
      id,
      emergency_type,
      severity,
      location_name,
      latitude,
      longitude,
      description,
      casualties_count,
      vehicles_involved,
      services_needed,
      contact_phone,
      contact_name,
      created_at
    } = emergency;

    // Create urgency indicator
    const urgencyEmoji = severity === 'critical' ? '🚨🚨🚨' : 
                         severity === 'high' ? '🚨🚨' : 
                         severity === 'medium' ? '⚠️' : 'ℹ️';

    // Format services needed
    const services = Array.isArray(services_needed) ? services_needed.join(', ') : services_needed;

    // Build message
    let message = `${urgencyEmoji} EMERGENCY ALERT #${id}\n\n`;
    message += `TYPE: ${emergency_type.toUpperCase()}\n`;
    message += `SEVERITY: ${severity.toUpperCase()}\n`;
    message += `LOCATION: ${location_name || 'Unknown'}\n`;
    
    if (latitude && longitude) {
      message += `GPS: ${latitude}, ${longitude}\n`;
      message += `MAP: https://maps.google.com/?q=${latitude},${longitude}\n`;
    }
    
    if (description) {
      message += `\nDETAILS: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}\n`;
    }
    
    if (casualties_count && casualties_count > 0) {
      message += `CASUALTIES: ${casualties_count}\n`;
    }
    
    if (vehicles_involved && vehicles_involved > 0) {
      message += `VEHICLES: ${vehicles_involved}\n`;
    }
    
    if (services) {
      message += `SERVICES NEEDED: ${services}\n`;
    }
    
    if (contact_phone) {
      message += `\nCONTACT: ${contact_name || 'Reporter'} - ${contact_phone}\n`;
    }
    
    message += `\nREPORTED: ${new Date(created_at).toLocaleString()}\n`;
    message += `\nACT IMMEDIATELY! View full details in TrafficGuard system.`;

    return message;
  }

  /**
   * Send SMS update when emergency status changes
   * @param {Object} emergency - Emergency object
   * @param {string} newStatus - New status
   * @param {string} notes - Update notes
   */
  async sendStatusUpdateSMS(emergency, newStatus, notes) {
    if (!this.client || this.policeDispatchNumbers.length === 0) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const message = `📋 EMERGENCY UPDATE #${emergency.id}\n\n` +
                     `STATUS: ${newStatus.toUpperCase()}\n` +
                     `TYPE: ${emergency.emergency_type}\n` +
                     `LOCATION: ${emergency.location_name}\n` +
                     (notes ? `NOTES: ${notes}\n` : '') +
                     `\nUpdated: ${new Date().toLocaleString()}`;

      const sendPromises = this.policeDispatchNumbers.map(phoneNumber => 
        this._sendSMS(phoneNumber.trim(), message)
      );

      const results = await Promise.allSettled(sendPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      console.log(`📨 Status update SMS sent: ${successful}/${this.policeDispatchNumbers.length}`);
      
      return { success: successful > 0, successful, total: this.policeDispatchNumbers.length };
    } catch (error) {
      console.error('❌ Status update SMS error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if SMS service is properly configured
   */
  isConfigured() {
    return this.client !== null && this.policeDispatchNumbers.length > 0;
  }

  /**
   * Get configuration status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      hasCredentials: !!this.client,
      dispatchNumbersCount: this.policeDispatchNumbers.length,
      dispatchNumbers: this.policeDispatchNumbers.map(num => 
        num.substring(0, 3) + '****' + num.substring(num.length - 4)
      )
    };
  }
}

// Export singleton instance
module.exports = new SMSService();
