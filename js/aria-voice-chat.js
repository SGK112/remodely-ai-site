/**
 * ARIA Voice Chat - Web-based voice conversation with ARIA
 * Connects to aria-bridge WebSocket for real-time voice AI
 */

class AriaVoiceChat {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || 'wss://aria-bridge.onrender.com/web-chat';
    this.voice = options.voice || 'coral';
    this.companySlug = options.companySlug || 'remodely';
    this.greeting = options.greeting || "Hey! I'm Aria from Remodely AI. How can I help you today?";

    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isConnected = false;
    this.isListening = false;
    this.isSpeaking = false;

    // Audio playback queue
    this.audioQueue = [];
    this.isPlaying = false;

    // Blob URL for cleanup
    this.processorBlobUrl = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onTranscript = options.onTranscript || (() => {});
    this.onResponse = options.onResponse || (() => {});
    this.onError = options.onError || (() => {});
  }

  async start() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });

      // Create audio context for recording and playback
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

      // Resume audio context immediately (required for mobile)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Connect to aria-bridge
      await this.connect();

    } catch (error) {
      console.error('[ARIA] Start failed:', error);
      this.onError(error.message || 'Failed to start voice chat');
      throw error;
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[ARIA] Connected to server');

        // Send configuration
        this.ws.send(JSON.stringify({
          type: 'config',
          voice: this.voice,
          companySlug: this.companySlug,
          systemInstructions: this.buildInstructions()
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);

          if (msg.type === 'connected') {
            this.isConnected = true;
            this.onStateChange('connected');
            resolve();

            // Trigger greeting after connection
            setTimeout(() => {
              this.triggerGreeting();
            }, 500);
          }
        } catch (error) {
          console.error('[ARIA] Message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[ARIA] WebSocket error:', error);
        this.onError('Connection error');
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[ARIA] Disconnected');
        this.isConnected = false;
        this.stopListening();
        this.onStateChange('disconnected');
      };
    });
  }

  buildInstructions() {
    return `# ARIA - REMODELY AI SOLUTIONS EXPERT

You are Aria, the AI voice assistant for Remodely AI. You're warm, knowledgeable, and genuinely excited to help contractors and small business owners grow with AI.

## CRITICAL RULES
1. **ALWAYS SPEAK ENGLISH** - Respond in English at all times
2. **KEEP IT SHORT** - 15-25 words max per response
3. **ONE QUESTION AT A TIME** - Never ask multiple questions
4. **BE CONVERSATIONAL** - Use contractions, sound natural

## YOUR GREETING
"${this.greeting}"

## WHAT REMODELY AI OFFERS

**1. Voice AI & AI Receptionist**
- 24/7 call answering - never miss a lead
- Books appointments directly into your calendar
- Sends instant quotes via text
- Handles FAQs and routing
- Costs less than a part-time employee

**2. AI Agents & Chatbots**
- Website chat widgets that qualify leads
- Text/SMS automation for follow-ups
- Lead nurturing sequences
- Customer support bots
- CRM integrations

**3. Business Automation**
- Workflow automation (reduce manual tasks)
- Invoice and payment reminders
- Review request automation
- Job scheduling systems
- Inventory alerts

**4. Web Design & Development**
- Fast, mobile-first contractor websites
- Conversion-optimized landing pages
- Service area pages for local SEO
- Portfolio and project galleries
- Online booking integration

**5. SEO & Local Marketing**
- Google Business Profile optimization
- Local keyword rankings
- Citation building
- Review generation strategies
- Monthly SEO reports

**6. AI Visibility Grader**
- Free tool at remodely.ai
- Shows how ChatGPT, Perplexity, Grok find their business
- Identifies gaps in AI discoverability
- Provides actionable recommendations

**7. Room Designer Demo**
- Interactive AI-powered room visualization tool
- Let clients see countertops, flooring, cabinets in their space
- Great for contractors and designers to wow clients
- Free demo at: surprisegranite.com/tools/room-designer
- Shows what's possible with AI in the remodeling industry

## YOUR MISSION
1. BUILD RAPPORT - Be friendly, ask about their business
2. UNCOVER PAIN - Missing calls? Losing leads? Admin overload? Poor website?
3. MATCH SOLUTIONS - Connect their pain to the right Remodely service
4. CAPTURE INFO - Name, email, business type
5. QUALIFY INTEREST - Are they ready to get started?

## HOT TRANSFER PROTOCOL
If someone is HIGHLY interested and ready to sign up or start immediately:
- Say: "I'd love to connect you with our founder right now. Would you like me to transfer you?"
- If yes, use the transfer_to_human function
- Only offer transfer for serious, ready-to-buy prospects

## HANDLING ISSUES
- **If connection drops:** "Sorry about that! Where were we?"
- **If audio unclear:** "I didn't catch that clearly. Could you repeat?"
- **If silence too long:** "Still there? No worries if you need a moment."
- **If they seem confused:** "Let me explain that differently..."

## WEBSITE NAVIGATION HELP
You can help visitors navigate remodely.ai:
- "Want to try our free grader? Just click 'Grade My Website' on the homepage"
- "You can submit a contact form right on our website"
- "Check out the services section to see all our offerings"

## CONVERSATION STYLE
- Be genuine, not salesy
- Show curiosity about their business
- Acknowledge their challenges
- Offer specific solutions, not generic pitches
- Use their name when you learn it

Remember: You represent Remodely AI. Be helpful, be human, be memorable!`;
  }

  handleMessage(msg) {
    console.log('[ARIA] Message:', msg.type, msg.text ? msg.text.substring(0, 50) : '');

    switch (msg.type) {
      case 'audio':
        this.queueAudio(msg.audio);
        break;

      case 'transcript':
        // User's speech transcription
        console.log('[ARIA] User said:', msg.text);
        this.onTranscript(msg.text, 'user');
        break;

      case 'response_text':
        // ARIA's response text
        console.log('[ARIA] Aria said:', msg.text);
        this.onResponse(msg.text);
        break;

      case 'speaking_start':
        this.isSpeaking = true;
        this.onStateChange('speaking');
        break;

      case 'speaking_end':
        this.isSpeaking = false;
        this.onStateChange('listening');
        break;

      case 'error':
        console.error('[ARIA] Error:', msg.message);
        this.onError(msg.message);
        break;

      default:
        console.log('[ARIA] Unknown message type:', msg.type);
    }
  }

  triggerGreeting() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'trigger_greeting',
        greeting: this.greeting
      }));
    }
  }

  async startListening() {
    if (!this.isConnected || this.isListening) return;

    try {
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create processor for audio capture
      await this.audioContext.audioWorklet.addModule(this.createProcessorBlob());
      this.processor = new AudioWorkletNode(this.audioContext, 'pcm-processor');

      this.processor.port.onmessage = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.isListening) {
          const pcmData = event.data;
          const base64 = this.arrayBufferToBase64(pcmData.buffer);
          this.ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isListening = true;
      this.onStateChange('listening');

    } catch (error) {
      // Fallback to ScriptProcessor for older browsers
      this.startListeningFallback();
    }
  }

  startListeningFallback() {
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (this.ws?.readyState === WebSocket.OPEN && this.isListening) {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        this.ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.isListening = true;
    this.onStateChange('listening');
  }

  createProcessorBlob() {
    const processorCode = `
      class PCMProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = [];
        }

        process(inputs) {
          const input = inputs[0];
          if (input.length > 0) {
            const samples = input[0];
            const pcm16 = new Int16Array(samples.length);
            for (let i = 0; i < samples.length; i++) {
              const s = Math.max(-1, Math.min(1, samples[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            this.port.postMessage(pcm16);
          }
          return true;
        }
      }
      registerProcessor('pcm-processor', PCMProcessor);
    `;
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    this.processorBlobUrl = URL.createObjectURL(blob);
    return this.processorBlobUrl;
  }

  stopListening() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    this.isListening = false;
  }

  queueAudio(base64Audio) {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    this.audioQueue.push(float32);
    this.playNextAudio();
  }

  async playNextAudio() {
    if (this.isPlaying || this.audioQueue.length === 0) return;

    // Resume audio context if suspended (required for mobile browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;

    // Combine queued audio chunks
    const chunks = this.audioQueue.splice(0, this.audioQueue.length);
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Create and play audio buffer
    const audioBuffer = this.audioContext.createBuffer(1, combined.length, 24000);
    audioBuffer.getChannelData(0).set(combined);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.isPlaying = false;
      if (this.audioQueue.length > 0) {
        this.playNextAudio();
      }
    };

    source.start();
  }

  sendText(text) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text_input', text }));
      this.onTranscript(text, 'user');
    }
  }

  floatTo16BitPCM(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stop() {
    this.stopListening();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clean up blob URL to prevent memory leak
    if (this.processorBlobUrl) {
      URL.revokeObjectURL(this.processorBlobUrl);
      this.processorBlobUrl = null;
    }

    this.isConnected = false;
    this.audioQueue = [];
    this.isPlaying = false;
    this.onStateChange('stopped');
  }
}

// Export for use
window.AriaVoiceChat = AriaVoiceChat;
