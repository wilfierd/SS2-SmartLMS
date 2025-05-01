// src/utils/JitsiMeetManager.js
/**
 * Utility class to manage Jitsi Meet sessions and provide a consistent 
 * interface for interacting with the Jitsi Meet API
 */
class JitsiMeetManager {
    constructor() {
      this.api = null;
      this.roomName = null;
      this.displayName = null;
      this.email = null;
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      this.isModeratorRole = false;
      this.callbacks = {
        onJoin: () => {},
        onParticipantJoin: () => {},
        onParticipantLeave: () => {},
        onVideoToggle: () => {},
        onAudioToggle: () => {},
        onScreenShareToggle: () => {},
        onChatMessage: () => {},
        onLeave: () => {},
        onRecordingStatusChanged: () => {},
        onError: () => {}
      };
      this.participants = new Map();
      this.isInitialized = false;
    }
  
    /**
     * Initialize the Jitsi Meet API script
     * @returns {Promise} A promise that resolves when the API is loaded
     */
    loadApi() {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI);
          return;
        }
  
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
          if (window.JitsiMeetExternalAPI) {
            resolve(window.JitsiMeetExternalAPI);
          } else {
            reject(new Error('Failed to load Jitsi Meet API'));
          }
        };
        script.onerror = () => {
          reject(new Error('Failed to load Jitsi Meet API script'));
        };
        document.body.appendChild(script);
      });
    }
  
    /**
     * Initialize the Jitsi Meet session
     * @param {HTMLElement} container The HTML element to render the meeting in
     * @param {Object} options Configuration options
     * @returns {Promise} A promise that resolves when the meeting is initialized
     */
    async init(container, options) {
      try {
        const JitsiMeetExternalAPI = await this.loadApi();
        
        const { 
          roomName, 
          displayName, 
          email, 
          password,
          startWithAudioMuted = false,
          startWithVideoMuted = false,
          isModerator = false,
          prejoinPageEnabled = true,
          width = '100%',
          height = '100%'
        } = options;
  
        this.roomName = roomName;
        this.displayName = displayName;
        this.email = email;
        this.isModeratorRole = isModerator;
        this.isAudioMuted = startWithAudioMuted;
        this.isVideoMuted = startWithVideoMuted;
  
        // Configure domain and options
        const domain = 'meet.jit.si';
        const jitsiOptions = {
          roomName,
          width,
          height,
          parentNode: container,
          configOverwrite: {
            startWithAudioMuted,
            startWithVideoMuted,
            prejoinPageEnabled,
            disableDeepLinking: true,
            enableWelcomePage: false,
            enableClosePage: false,
            disableInviteFunctions: true,
            subject: roomName,
            analytics: { disabled: true },
            hideConferenceSubject: false,
            hideConferenceTimer: false,
            requireDisplayName: true,
            startAudioOnly: false,
            startScreenSharing: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,
            // Hide logos
            disableThirdPartyRequests: true,
            hiddenPremeetingButtons: ['microphone', 'camera'],
          },
          interfaceConfigOverwrite: {
            APP_NAME: 'Virtual Classroom',
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              'recording', 'livestreaming', 'etherpad',
              'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'feedback',
              'stats', 'shortcuts', 'tileview', 'videobackgroundblur',
              'download', 'help', 'mute-everyone', 'mute-video-everyone',
              'security'
            ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#1A1A1A',
            DEFAULT_REMOTE_DISPLAY_NAME: 'Student',
            TOOLBAR_ALWAYS_VISIBLE: false,
            INITIAL_TOOLBAR_TIMEOUT: 5000,
            ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: true,
            ACTIVE_SPEAKER_AVATAR_SIZE: 48,
            VERTICAL_FILMSTRIP: false,
            CLOSE_PAGE_GUEST_HINT: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_FOCUS_INDICATOR: false,
          },
          userInfo: {
            displayName,
            email,
            moderator: isModerator
          }
        };
  
        // Create the API instance
        this.api = new JitsiMeetExternalAPI(domain, jitsiOptions);
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Handle password if provided
        if (password) {
          this.api.addEventListener('passwordRequired', () => {
            this.api.executeCommand('password', password);
          });
          
          // Set the password directly if the user is a moderator
          if (isModerator) {
            this.api.addEventListener('participantRoleChanged', (event) => {
              if (event.role === 'moderator') {
                this.api.executeCommand('password', password);
              }
            });
          }
        }
  
        this.isInitialized = true;
        return this.api;
      } catch (error) {
        console.error('Error initializing Jitsi Meet:', error);
        this.callbacks.onError(error);
        throw error;
      }
    }
  
    /**
     * Set up event listeners for the Jitsi Meet API
     * @private
     */
    _setupEventListeners() {
      if (!this.api) return;
  
      // Connection events
      this.api.addEventListener('videoConferenceJoined', (event) => {
        this.callbacks.onJoin({
          roomName: event.roomName,
          id: event.id,
          displayName: event.displayName
        });
      });
  
      this.api.addEventListener('participantJoined', (event) => {
        this.participants.set(event.id, {
          id: event.id,
          displayName: event.displayName,
          isAudioMuted: true,
          isVideoMuted: true
        });
        
        this.callbacks.onParticipantJoin({
          id: event.id,
          displayName: event.displayName
        });
      });
  
      this.api.addEventListener('participantLeft', (event) => {
        const participant = this.participants.get(event.id);
        this.participants.delete(event.id);
        
        this.callbacks.onParticipantLeave({
          id: event.id,
          displayName: participant?.displayName
        });
      });
  
      // Media events
      this.api.addEventListener('audioMuteStatusChanged', (event) => {
        this.isAudioMuted = event.muted;
        this.callbacks.onAudioToggle(event.muted);
      });
  
      this.api.addEventListener('videoMuteStatusChanged', (event) => {
        this.isVideoMuted = event.muted;
        this.callbacks.onVideoToggle(event.muted);
      });
  
      this.api.addEventListener('screenSharingStatusChanged', (event) => {
        this.callbacks.onScreenShareToggle(event.on);
      });
  
      // Chat events
      this.api.addEventListener('incomingMessage', (event) => {
        this.callbacks.onChatMessage({
          from: event.from,
          message: event.message,
          privateMessage: event.privateMessage
        });
      });
  
      // Recording events
      this.api.addEventListener('recordingStatusChanged', (event) => {
        this.callbacks.onRecordingStatusChanged({
          on: event.on,
          mode: event.mode // 'file', 'stream', etc.
        });
      });
  
      // Leave event
      this.api.addEventListener('videoConferenceLeft', (event) => {
        this.callbacks.onLeave({
          roomName: event.roomName
        });
        this.dispose();
      });
  
      // Error events
      this.api.addEventListener('errorOccurred', (event) => {
        this.callbacks.onError({
          error: event.error,
          details: event.details
        });
      });
  
      // Track changes in participant media status
      this.api.addEventListener('participantAudioMutedChanged', (event) => {
        const participant = this.participants.get(event.id);
        if (participant) {
          participant.isAudioMuted = event.muted;
          this.participants.set(event.id, participant);
        }
      });
  
      this.api.addEventListener('participantVideoMutedChanged', (event) => {
        const participant = this.participants.get(event.id);
        if (participant) {
          participant.isVideoMuted = event.muted;
          this.participants.set(event.id, participant);
        }
      });
    }
  
    /**
     * Register callback functions for various events
     * @param {Object} callbacks Object containing callback functions
     */
    registerCallbacks(callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
  
    /**
     * Execute a command in the Jitsi Meet API
     * @param {string} command The command to execute
     * @param {any} value The value for the command (optional)
     */
    executeCommand(command, value) {
      if (!this.api) {
        console.error('Jitsi Meet API not initialized');
        return;
      }
  
      try {
        if (value !== undefined) {
          this.api.executeCommand(command, value);
        } else {
          this.api.executeCommand(command);
        }
      } catch (error) {
        console.error(`Error executing command ${command}:`, error);
        this.callbacks.onError(error);
      }
    }
  
    /**
     * Toggle audio mute status
     */
    toggleAudio() {
      this.executeCommand('toggleAudio');
    }
  
    /**
     * Toggle video mute status
     */
    toggleVideo() {
      this.executeCommand('toggleVideo');
    }
  
    /**
     * Toggle screen sharing
     */
    toggleScreenSharing() {
      this.executeCommand('toggleShareScreen');
    }
  
    /**
     * Toggle chat panel
     */
    toggleChat() {
      this.executeCommand('toggleChat');
    }
  
    /**
     * Toggle tile view
     */
    toggleTileView() {
      this.executeCommand('toggleTileView');
    }
  
    /**
     * Toggle raise hand
     */
    toggleRaiseHand() {
      this.executeCommand('toggleRaiseHand');
    }
  
    /**
     * Send a chat message
     * @param {string} message The message to send
     * @param {string} to Participant ID to send private message (optional)
     */
    sendChatMessage(message, to) {
      if (to) {
        this.executeCommand('sendEndpointTextMessage', { to, message });
      } else {
        this.executeCommand('sendChatMessage', message);
      }
    }
  
    /**
     * Start recording (moderator only)
     * @param {string} mode Recording mode ('file', 'stream')
     */
    startRecording(mode = 'file') {
      if (!this.isModeratorRole) {
        console.warn('Only moderators can start recording');
        return;
      }
      this.executeCommand('startRecording', { mode });
    }
  
    /**
     * Stop recording (moderator only)
     */
    stopRecording() {
      if (!this.isModeratorRole) {
        console.warn('Only moderators can stop recording');
        return;
      }
      this.executeCommand('stopRecording');
    }
  
    /**
     * Get a list of all participants
     * @returns {Array} Array of participant objects
     */
    getParticipants() {
      return Array.from(this.participants.values());
    }
  
    /**
     * Get the number of participants
     * @returns {number} Number of participants
     */
    getParticipantCount() {
      return this.participants.size;
    }
  
    /**
     * Kick a participant (moderator only)
     * @param {string} participantId The ID of the participant to kick
     */
    kickParticipant(participantId) {
      if (!this.isModeratorRole) {
        console.warn('Only moderators can kick participants');
        return;
      }
      this.executeCommand('kickParticipant', participantId);
    }
  
    /**
     * Mute everyone except yourself (moderator only)
     */
    muteEveryone() {
      if (!this.isModeratorRole) {
        console.warn('Only moderators can mute everyone');
        return;
      }
      this.executeCommand('muteEveryone');
    }
  
    /**
     * Toggle the visibility of the filmstrip
     */
    toggleFilmstrip() {
      this.executeCommand('toggleFilmstrip');
    }
  
    /**
     * Leave the meeting
     */
    hangup() {
      this.executeCommand('hangup');
    }
  
    /**
     * Dispose of the Jitsi Meet API instance
     */
    dispose() {
      if (this.api) {
        this.api.dispose();
        this.api = null;
        this.isInitialized = false;
        this.participants.clear();
      }
    }
  }
  
  export default JitsiMeetManager;
  
  