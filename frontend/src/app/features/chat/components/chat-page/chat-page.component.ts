import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonTextarea,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { ChatService } from '../../services/chat.service';
import { PortfolioService } from '../../../../core/services/portfolio.service';
import { ChatMessage } from '../../models/chat.model';
import { Portfolio } from '../../../../core/models/portfolio.model';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonTextarea,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonSpinner,
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageList') private messageListRef!: ElementRef<HTMLDivElement>;

  private readonly chatService = inject(ChatService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  messages = signal<ChatMessage[]>([]);
  inputText = signal<string>('');
  isStreaming = signal<boolean>(false);
  portfolio = signal<Portfolio | null>(null);
  private shouldScrollToBottom = false;

  constructor() {
    addIcons({ sendOutline, chatbubbleEllipsesOutline });
  }

  ngOnInit(): void {
    this.portfolioService
      .getPortfolio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.portfolio.set(data);
          this.pushWelcome(data);
        },
        error: () => {
          this.pushWelcome(null);
        },
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  get canSend(): boolean {
    return this.inputText().trim().length > 0 && !this.isStreaming() && this.portfolio() !== null;
  }

  onInputChange(value: string): void {
    this.inputText.set(value);
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text || this.isStreaming() || !this.portfolio()) return;

    const portfolio = this.portfolio()!;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, userMsg]);
    this.inputText.set('');
    this.isStreaming.set(true);
    this.shouldScrollToBottom = true;
    this.cdr.markForCheck();

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    this.messages.update((msgs) => [...msgs, assistantMsg]);
    const assistantId = assistantMsg.id;

    this.chatService
      .sendMessage(text, portfolio, this.messages())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (char) => {
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + char } : m
            )
          );
          this.shouldScrollToBottom = true;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
          this.isStreaming.set(false);
          this.shouldScrollToBottom = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
                : m
            )
          );
          this.isStreaming.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  navigateBack(): void {
    this.router.navigate(['/']);
  }

  private pushWelcome(portfolio: Portfolio | null): void {
    const content = portfolio
      ? `Hi! I'm your AI portfolio advisor. Your portfolio is currently valued at ${portfolio.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} across ${portfolio.holdings.length} holdings. Ask me anything — performance, rebalancing, or specific positions.`
      : `Hi! I'm your AI portfolio advisor. I wasn't able to load your portfolio data right now, but feel free to ask general investment questions.`;

    const welcome: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    };

    this.messages.set([welcome]);
    this.shouldScrollToBottom = true;
    this.cdr.markForCheck();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageListRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      // ignore scroll errors
    }
  }
}
