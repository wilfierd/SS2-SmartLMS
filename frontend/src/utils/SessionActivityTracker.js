// src/utils/SessionActivityTracker.js
  /**
   * Utility class to track and report user activity in a virtual classroom session
   */
  class SessionActivityTracker {
    constructor(sessionId, userId, apiClient) {
      this.sessionId = sessionId;
      this.userId = userId;
      this.apiClient = apiClient;
      this.deviceInfo = this._getDeviceInfo();
      this.isActive = false;
      this.heartbeatInterval = null;
      this.activityQueue = [];
      this.isProcessing = false;
      this.lastHeartbeat = null;
    }
  
    /**
     * Get device and browser information
     * @private
     * @returns {string} Device and browser information
     */
    _getDeviceInfo() {
      const userAgent = navigator.userAgent;
      const browserInfo = this._getBrowserInfo(userAgent);
      const osInfo = this._getOSInfo(userAgent);
      const deviceType = this._getDeviceType();
      
      return `${browserInfo} on ${osInfo} (${deviceType})`;
    }
  
    /**
     * Get browser name and version
     * @private
     * @param {string} userAgent Navigator user agent string
     * @returns {string} Browser information
     */
    _getBrowserInfo(userAgent) {
      // Extract browser info from user agent
      let browser = 'Unknown Browser';
      let version = '';
      
      if (userAgent.indexOf('Firefox') > -1) {
        browser = 'Firefox';
        version = userAgent.match(/Firefox\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('Edg') > -1) {
        browser = 'Edge';
        version = userAgent.match(/Edg\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('Chrome') > -1) {
        browser = 'Chrome';
        version = userAgent.match(/Chrome\/([0-9.]+)/)[1];
      } else if (userAgent.indexOf('Safari') > -1) {
        browser = 'Safari';
        version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || '';
      } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
        browser = 'Internet Explorer';
        version = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/)[1];
      }
      
      return `${browser} ${version}`;
    }
  
    /**
     * Get operating system information
     * @private
     * @param {string} userAgent Navigator user agent string
     * @returns {string} OS information
     */
    _getOSInfo(userAgent) {
      let os = 'Unknown OS';
      
      if (userAgent.indexOf('Win') > -1) {
        os = 'Windows';
      } else if (userAgent.indexOf('Mac') > -1) {
        os = 'macOS';
      } else if (userAgent.indexOf('Linux') > -1) {
        os = 'Linux';
      } else if (userAgent.indexOf('Android') > -1) {
        os = 'Android';
      } else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
        os = 'iOS';
      }
      
      return os;
    }
  
    /**
     * Get device type (desktop, tablet, mobile)
     * @private
     * @returns {string} Device type
     */
    _getDeviceType() {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
      }
      if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated/.test(ua)) {
        return 'mobile';
      }
      return 'desktop';
    }
  
    /**
     * Start tracking session activity
     */
    startTracking() {
      if (this.isActive) return;
      
      this.isActive = true;
      this._recordActivity('join');
      
      // Set up heartbeat to periodically check on the session
      this.heartbeatInterval = setInterval(() => {
        this._heartbeat();
      }, 60000); // Every minute
      
      // Listen for window/tab close events
      window.addEventListener('beforeunload', this._handleBeforeUnload);
      
      // Process any queued activities
      this._processQueue();
    }
  
    /**
     * Stop tracking session activity
     */
    stopTracking() {
      if (!this.isActive) return;
      
      this._recordActivity('leave');
      this.isActive = false;
      
      // Clear heartbeat interval
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Remove event listener
      window.removeEventListener('beforeunload', this._handleBeforeUnload);
      
      // Process the leave activity immediately
      this._processQueue(true);
    }
  
    /**
     * Handle window/tab close event
     * @private
     */
    _handleBeforeUnload = () => {
      // Attempt to send a synchronous leave activity before the page unloads
      if (this.isActive) {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${this.apiClient.baseURL}/virtual-sessions/${this.sessionId}/activity`, false); // Synchronous
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${this.apiClient.getToken()}`);
          xhr.send(JSON.stringify({
            action: 'leave',
            deviceInfo: this.deviceInfo
          }));
        } catch (error) {
          console.error('Error sending leave activity on page unload:', error);
        }
      }
    };
  
    /**
     * Record a session activity
     * @param {string} action The activity action (join, leave, etc.)
     * @param {boolean} [actionValue=null] Optional value for the action
     */
    _recordActivity(action, actionValue = null) {
      this.activityQueue.push({
        action,
        actionValue,
        timestamp: new Date().toISOString()
      });
      
      this._processQueue();
    }
  
    /**
     * Send a heartbeat to the server
     * @private
     */
    _heartbeat() {
      const now = new Date();
      this.lastHeartbeat = now;
      
      // Record as a special activity that doesn't get logged in the UI
      this.apiClient.post(`/virtual-sessions/${this.sessionId}/heartbeat`, {
        timestamp: now.toISOString()
      }).catch(error => {
        console.error('Error sending session heartbeat:', error);
      });
    }
  
    /**
     * Process the activity queue
     * @private
     * @param {boolean} [immediate=false] Whether to process immediately
     */
    _processQueue(immediate = false) {
      if (this.isProcessing && !immediate) return;
      
      if (this.activityQueue.length === 0) return;
      
      this.isProcessing = true;
      
      const activity = this.activityQueue.shift();
      
      this.apiClient.post(`/virtual-sessions/${this.sessionId}/activity`, {
        action: activity.action,
        actionValue: activity.actionValue,
        deviceInfo: this.deviceInfo
      }).then(() => {
        // Process next item in queue
        this.isProcessing = false;
        if (this.activityQueue.length > 0) {
          this._processQueue();
        }
      }).catch(error => {
        console.error('Error recording session activity:', error);
        
        // Put the activity back in the queue if it's a leave activity or if the queue is empty
        if (activity.action === 'leave' || this.activityQueue.length === 0) {
          this.activityQueue.unshift(activity);
        }
        
        // Try again after a delay
        this.isProcessing = false;
        setTimeout(() => this._processQueue(), 5000);
      });
    }
  
    /**
     * Record media state changes
     * @param {string} mediaType 'microphone' or 'camera'
     * @param {boolean} isEnabled Whether the media is enabled
     */
    recordMediaChange(mediaType, isEnabled) {
      const action = mediaType === 'camera' ? 'camera' : 'microphone';
      this._recordActivity(action, isEnabled);
    }
  
    /**
     * Record screen sharing state
     * @param {boolean} isSharing Whether screen is being shared
     */
    recordScreenShare(isSharing) {
      this._recordActivity('screenShare', isSharing);
    }
  
    /**
     * Record hand raise state
     * @param {boolean} isRaised Whether hand is raised
     */
    recordHandRaise(isRaised) {
      this._recordActivity('hand_raise', isRaised);
    }
  }
  
  export default SessionActivityTracker;
  
  