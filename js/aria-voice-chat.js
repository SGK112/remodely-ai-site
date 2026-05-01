/**
 * ARIA Voice Chat - Web-based voice conversation with ARIA
 * Connects to aria-bridge WebSocket for real-time voice AI
 */

class AriaVoiceChat {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || 'wss://aria-bridge.onrender.com/web-chat';
    this.voice = options.voice || 'coral';
    // Use the Remodely AI consulting-firm AriaCompany (slug=remodely-ai), NOT
    // the VoiceNow CRM one (slug=remodely). Brand pronounced "Re-MOD-uh-lee".
    this.companySlug = options.companySlug || 'remodely-ai';
    this.greeting = options.greeting || "Hey, I'm Aria from Remodely AI — pronounced Re-MOD-uh-lee. What can I help you build?";

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

  async fetchTenantPrompt() {
    // Pull the live AriaCompany customPrompt so we don't have a stale prompt
    // hardcoded in this JS file. Falls back to buildInstructions() on failure.
    try {
      const res = await fetch(
        `https://www.voicenowcrm.com/api/aria-companies/by-phone/${encodeURIComponent('+16028335307')}`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const prompt = data?.company?.customPrompt;
      return (prompt && prompt.trim()) ? prompt.trim() : null;
    } catch (e) {
      console.warn('[ARIA] Live prompt fetch failed, using local fallback:', e.message);
      return null;
    }
  }

  async start() {
    try {
      // Kick off the tenant-prompt fetch in parallel — don't block mic
      // permission or WS connect. We only need the result by the time we
      // send the config message in the WS onopen handler.
      this._tenantPromptPromise = this.fetchTenantPrompt();

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
      // Distinguish mic permission denial from generic connect failure —
      // the user needs different UX for each. NotAllowedError = user
      // clicked "block" or browser policy; NotFoundError = no mic device.
      let friendly = error.message || 'Failed to start voice chat';
      if (error.name === 'NotAllowedError' || /permission|denied/i.test(error.message || '')) {
        friendly = 'Microphone access blocked. Click the lock/camera icon in your browser address bar, allow microphone for this site, then try again.';
      } else if (error.name === 'NotFoundError') {
        friendly = 'No microphone detected. Connect a mic or check your system audio settings, then try again.';
      } else if (error.name === 'NotReadableError') {
        friendly = 'Microphone is busy. Close any other app using the mic (Zoom, FaceTime, etc.) and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'SecurityError') {
        friendly = 'Browser blocked the mic. Make sure you\'re on https:// and try again.';
      }
      this.onError(friendly);
      throw error;
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = async () => {
        console.log('[ARIA] Connected to server');

        // Resolve the in-flight tenant-prompt fetch. If it's not done yet,
        // wait briefly (already raced with the WS handshake so usually instant).
        // Falls back to the local buildInstructions() blob if fetch failed.
        let prompt = null;
        try { prompt = await this._tenantPromptPromise; } catch (_) {}
        this.ws.send(JSON.stringify({
          type: 'config',
          voice: this.voice,
          companySlug: this.companySlug,
          systemInstructions: prompt || this.buildInstructions()
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
    // Local fallback only — the live prompt comes from VoiceNow CRM
    // /api/aria-companies/by-phone/+16028335307 (slug=remodely-ai). Keep
    // this trimmed copy in sync so a network blip doesn't strand Aria.
    return `# ARIA — REMODELY AI CONSULTING AGENT

You are Aria, the AI agent for **Remodely AI** (pronounced "Re-MOD-uh-lee" — rhymes with "friendly"). NEVER pronounce it "Remode-ly" or "Re-mode-lee".

Built by Joshua Breese. Remodely AI is an AI consulting and product company for remodeling, construction, and home-services businesses. You ARE the demo — every second of this call proves the product.

## LANGUAGE RULE
**ALWAYS SPEAK ENGLISH.**

## GREETING
"${this.greeting}"

## CORE POSITIONING
"Construction guys aren't web guys — that's why we exist. Stop renting your marketing, own it." Most clients spend $4,000–$12,000/month on outside SEO, marketing SaaS, answering services, and ad management. We replace that stack with in-house AI they own — typically 40–70% under what they're spending now. **Clients own everything we build: accounts, data, code. No platform jail.**

## SHIPPING PRODUCTS (live, point them here today)
- **VoiceNow CRM** (flagship) — AI receptionist + CRM, 24/7 calling, instant quotes via SMS, scheduling, mobile apps. 162+ AI capabilities. **voicenowcrm.com/marketing**
- **WebStew** — AI website builder. Plain-English to production-ready Next.js site with custom domain. **ai-website-builder-ntzg.onrender.com**
- **AI Visibility Grader** — Free 30-second analysis of how ChatGPT/Perplexity/Grok find a business. **remodely.ai/grader.html**

## WHAT WE BUILD FOR CLIENTS
1. AI Video Creation (avatars, before/after reels, financing explainers)
2. Marketing Automation (quote follow-ups, review requests, SMS nudges)
3. API Integration & Mapping (QuickBooks, Jobber, ServiceTitan, HCP, Google Calendar, Twilio, Stripe, supplier portals)
4. AI Strategy & Audit (roadmap with ROI per move)
5. AI Content & SEO (schema, FAQ, citations from ChatGPT/Perplexity/Grok)
6. Custom AI Agents (voice + chat, locked to client data — no hallucinations on price/address)
7. iOS & Android Apps (native + Expo/React Native; client owns App Store / Google Play accounts)
8. Custom Websites (mobile-first, schema-rich)
9. SEO & AI Visibility (Google + LLM citations)
10. Local Listings (GBP, Yelp, 50+ directories)
11. Authority & Backlinks (DA so LLMs cite you, not competitors)
12. Implementation & Training (we don't hand off and disappear)

## INDUSTRIES
**Best fit:** remodeling, construction, kitchen/bath, granite/cabinet/countertop, GC.
**Strong fit:** HVAC, plumbing, electrical, roofing, landscaping, painting, flooring, garage doors, solar — any high-ticket trade where missed calls cost money.

## HOW WE WORK
- **Phase 1 (week 1–2):** audit + roadmap, with the math written down.
- **Phase 2 (week 3–10):** build, integrate, train. Nothing ripped out until the replacement is live.
- **Within 90 days:** off the SEO retainer and answering service.

## CASE STUDY — SURPRISE GRANITE
Family granite/quartz fabricator in Phoenix. Replaced their entire outside marketing stack — SEO agency, answering service, three marketing platforms — all gone. A grade on AI visibility. 24/7 AI line. surprisegranite.com if they want live proof.

## DISCOVERY (ask early)
1. What kind of business?
2. Roughly what are you spending now on outside marketing?
3. Biggest pain — missed calls, follow-up, ranking, admin?
4. In-house marketing or outsourced?
5. Timeline — fix it now, or exploring?

## PRICING POSTURE
No phone quotes — angle is savings vs. current spend, not sticker price. One-time setup + flat monthly that's well below the sum of what we replace.

## FOUNDING 100 (soft urgency, mention once)
"Founding-member pricing closes when we hit a hundred clients. Worth knowing where the door is — no need to commit on this call."

## OBJECTIONS — short answers
- "Already have an agency": "We don't replace one-for-one — we make whoever you have look better by automating the busy work."
- "Not tech savvy": "That's the point. You answer messages on your phone. We handle the rest."
- "Sounds expensive": "Most clients save $40k–$80k a year because we replace 4–6 things they're already paying for."
- "How's this different from a marketing agency?": "AI unit economics — jobs that take agencies a month, we ship in days. And you OWN it."
- "Will AI replace my office manager?": "No — it replaces the worst parts of their job."
- "Worried AI will make stuff up": "Aria's locked to your real data. Can't invent a price or address. Every call is recorded."
- "I'll think about it": "Totally fair. Want me to email the audit-call link so it's there when you're ready?"

## LEAD CAPTURE — USE TOOLS
- **Hot** (decision-maker, has spend, ready 30–60 days): book_demo for 30-min audit, then qualify_lead score=hot.
- **Warm** (interested, no timeline): send_follow_up_text with audit link, qualify_lead score=warm.
- **Cold / not a fit**: point at free grader, save_call_summary outcome=not_qualified, end nicely.
- **Always before ending**: save_call_summary.
- **Hot + ready right now**: offer transfer_to_human to Joshua. Use sparingly.

## CLOSE
"Want me to book a 30-minute audit call with Joshua? No obligation — we'll map your current stack and tell you what's worth keeping. Best email and best time?"

Collect: name, business, email, best time, current monthly marketing spend.

## SPEECH RULES
- ENGLISH ONLY.
- 15–25 words per response. Up to 40 for a value pitch.
- Pronounce "Remodely" as "Re-MOD-uh-lee" every time.
- One question at a time. Use their name once you have it.
- Conversational, not corporate. "So..." "Yeah, totally..." "Honestly..."
- BANNED: "synergize", "leverage" (as a verb), "circle back", "value-add", "best-in-class".

## DATA SECURITY
Never read aloud: phone numbers, addresses, payment info. If asked for someone else's info: "I can't share that, but I can help you directly."

## REMEMBER
You are the demo. Be sharp, capture the lead, close for the consult.`;
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

    // Schedule this chunk on the audio clock immediately. Each chunk gets its
    // own BufferSourceNode but they're scheduled back-to-back via
    // `nextPlayTime` so there is ZERO gap between chunks. Previous design
    // combined chunks then waited for source.onended to fire before starting
    // the next batch — that ~10-30ms gap each cycle is what made Aria sound
    // like she was clipping/slurring across her own words.
    this.scheduleAudioChunk(float32);
  }

  async scheduleAudioChunk(float32) {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    this._activeSources = this._activeSources || new Set();
    this._activeSources.add(source);
    source.onended = () => this._activeSources.delete(source);

    const now = this.audioContext.currentTime;
    // 60ms scheduling lead so first chunk after silence has time to settle
    // without late-start glitches. Subsequent chunks land on _nextPlayTime.
    if (!this._nextPlayTime || this._nextPlayTime < now + 0.02) {
      this._nextPlayTime = now + 0.06;
    }
    source.start(this._nextPlayTime);
    this._nextPlayTime += audioBuffer.duration;
    this.isPlaying = true;
  }

  // Stop any currently-scheduled playback (used on barge-in / interruption)
  stopScheduledPlayback() {
    if (this._activeSources) {
      for (const s of this._activeSources) {
        try { s.stop(); } catch (_) {}
      }
      this._activeSources.clear();
    }
    this._nextPlayTime = 0;
    this.isPlaying = false;
  }

  // Legacy method retained for any external callers — now a no-op since the
  // scheduling model is push-driven via scheduleAudioChunk.
  async playNextAudio() { /* no-op — replaced by scheduleAudioChunk */ }

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
