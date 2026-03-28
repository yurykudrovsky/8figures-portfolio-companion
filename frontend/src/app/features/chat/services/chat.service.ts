import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../../environments/environment';
import { Portfolio } from '../../../core/models/portfolio.model';
import { ChatMessage } from '../models/chat.model';

const STREAMING_INTERVAL_MS = 15;

const FALLBACK_MESSAGE =
  "I'm having trouble connecting to the AI advisor. Please ensure the backend is running at localhost:3000.";

// Internal SSE frame types — not exported
interface SseCharFrame {
  char: string;
}

interface SseDoneFrame {
  done: true;
}

interface SseErrorFrame {
  error: string;
}

type SseFrame = SseCharFrame | SseDoneFrame | SseErrorFrame;

function isCharFrame(frame: SseFrame): frame is SseCharFrame {
  return 'char' in frame;
}

function isDoneFrame(frame: SseFrame): frame is SseDoneFrame {
  return 'done' in frame;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  /**
   * Android Emulator routes host machine's localhost via 10.0.2.2.
   * iOS Simulator and browser can reach localhost directly.
   */
  private get apiUrl(): string {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return environment.apiUrl.replace('localhost', '10.0.2.2');
    }
    return environment.apiUrl;
  }

  // ── Mandatory streaming pattern from CLAUDE.md ────────────────
  streamResponse(text: string): Observable<string> {
    return new Observable<string>((observer) => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          observer.next(text[index]);
          index++;
        } else {
          clearInterval(interval);
          observer.complete();
        }
      }, STREAMING_INTERVAL_MS);

      // Cleanup on unsubscribe
      return () => clearInterval(interval);
    });
  }

  sendMessage(
    userMessage: string,
    portfolio: Portfolio,
    history: ChatMessage[]
  ): Observable<string> {
    const body = {
      message: userMessage,
      context: {
        portfolio,
        messages: history,
      },
    };

    return this.http
      .post(`${this.apiUrl}/chat`, body, { responseType: 'text' as const })
      .pipe(
        map((rawBody) => this.parseSseBody(rawBody)),
        switchMap((text) => this.streamResponse(text)),
        catchError(() => this.streamResponse(FALLBACK_MESSAGE))
      );
  }

  private parseSseBody(rawBody: string): string {
    const blocks = rawBody.split('\n\n');
    let result = '';

    for (const block of blocks) {
      if (!block.startsWith('data: ')) {
        continue;
      }
      const json = block.slice('data: '.length);
      try {
        const frame = JSON.parse(json) as SseFrame;
        if (isCharFrame(frame)) {
          result += frame.char;
        } else if (isDoneFrame(frame)) {
          // skip
        } else {
          // SseErrorFrame — skip
        }
      } catch {
        // malformed JSON — skip this block
      }
    }

    return result;
  }
}
