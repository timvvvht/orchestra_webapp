export interface EventSourceLike {
  addEventListener(
    type: 'message',
    cb: (e: MessageEvent) => void,
    _opts?: boolean
  ): void;
  close(): void;
  readonly readyState: number;
  onopen: ((this: EventSource, ev: Event) => any) | null;
  onerror: ((this: EventSource, ev: Event) => any) | null;
  onmessage: ((this: EventSource, ev: MessageEvent) => any) | null;
}

export default class MockEventSource implements EventSourceLike {
  private listeners: ((e: MessageEvent) => void)[] = [];
  private timer: NodeJS.Timeout | null = null;
  private i = 0;
  private _readyState = 0; // CONNECTING

  // EventSource constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  // EventSource properties
  onopen: ((this: EventSource, ev: Event) => any) | null = null;
  onerror: ((this: EventSource, ev: Event) => any) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;

  get readyState(): number {
    return this._readyState;
  }

  constructor(
    private readonly frames: string[], // pre-built SSE text frames
    private readonly delayMs = 800
  ) {
    console.log('🎭 [MockEventSource] Creating mock with', frames.length, 'frames');
    // Simulate connection opening
    setTimeout(() => {
      this._readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen.call(this as any, new Event('open'));
      }
      this.start();
    }, 100);
  }

  addEventListener = (_t: 'message', cb: (e: MessageEvent) => void) => {
    console.log('🎭 [MockEventSource] Adding event listener');
    this.listeners.push(cb);
  };

  close = () => {
    console.log('🎭 [MockEventSource] Closing connection');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._readyState = MockEventSource.CLOSED;
  };

  // ——— internals ———
  private start() {
    console.log('🎭 [MockEventSource] Starting event replay with', this.delayMs, 'ms delay');
    this.timer = setInterval(() => {
      if (this.i >= this.frames.length) {
        console.log('🎭 [MockEventSource] All frames sent, closing');
        return this.close();
      }
      
      const frame = this.frames[this.i++];
      console.log('🎭 [MockEventSource] Sending frame', this.i, '/', this.frames.length);
      
      const evt = new MessageEvent('message', { data: frame });
      
      // Call onmessage handler if set
      if (this.onmessage) {
        this.onmessage.call(this as any, evt);
      }
      
      // Call all addEventListener handlers
      this.listeners.forEach((h) => h(evt));
    }, this.delayMs);
  }
}