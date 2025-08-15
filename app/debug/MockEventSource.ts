/**
 * Mock EventSource for testing and development
 * Simulates SSE events without requiring a real server connection
 */

export interface MockEventSourceOptions {
  frames?: string[];
  delay?: number;
  autoStart?: boolean;
}

export default class MockEventSource {
  private frames: string[];
  private delay: number;
  private currentIndex: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private _readyState: number = 0;

  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSED = 2;

  constructor(url: string, options: MockEventSourceOptions = {}) {
    this.frames = options.frames || [];
    this.delay = options.delay || 1000;

    if (options.autoStart !== false) {
      setTimeout(() => this.start(), 100);
    }
  }

  get readyState(): number {
    return this._readyState;
  }

  private start(): void {
    this._readyState = MockEventSource.OPEN;
    
    if (this.onopen) {
      this.onopen(new Event('open'));
    }

    if (this.frames.length > 0) {
      this.intervalId = setInterval(() => {
        if (this.currentIndex < this.frames.length) {
          const frame = this.frames[this.currentIndex];
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: frame }));
          }
          this.currentIndex++;
        } else {
          this.close();
        }
      }, this.delay);
    }
  }

  public close(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._readyState = MockEventSource.CLOSED;
  }

  public addEventListener(type: string, listener: EventListener): void {
    // Basic implementation for compatibility
    if (type === 'open' && typeof listener === 'function') {
      this.onopen = listener as (event: Event) => void;
    } else if (type === 'message' && typeof listener === 'function') {
      this.onmessage = listener as (event: MessageEvent) => void;
    } else if (type === 'error' && typeof listener === 'function') {
      this.onerror = listener as (event: Event) => void;
    }
  }

  public removeEventListener(type: string, listener: EventListener): void {
    // Basic implementation for compatibility
    if (type === 'open') {
      this.onopen = null;
    } else if (type === 'message') {
      this.onmessage = null;
    } else if (type === 'error') {
      this.onerror = null;
    }
  }
}