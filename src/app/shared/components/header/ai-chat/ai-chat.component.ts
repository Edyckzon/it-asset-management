import {
  Component,
  inject,
  signal,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AiService } from "../../../services/ai.service";

@Component({
  selector: "app-ai-chat",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./ai-chat.component.html",
  styles: [``],
})
export class AiChatComponent {
  private aiService = inject(AiService);

  isOpen = signal(false);
  isLoading = signal(false);
  userInput = "";
  
  // 🔥 NUEVO: Estado real de la conexión
  apiStatus = signal<'online' | 'offline'>('online');

  messages = signal<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy la IA de OSZ Software. Conozco los datos de RRHH e Inventario TI. ¿En qué te ayudo?",
    },
  ]);

  @ViewChild("scrollContainer") private scrollContainer!: ElementRef;

  toggleChat() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }

  closeChat() {
    this.isOpen.set(false);
  }

  async sendMessage() {
    if (!this.userInput.trim()) return;

    const query = this.userInput;
    this.userInput = ""; 

    this.messages.update((m) => [...m, { role: "user", content: query }]);
    this.isLoading.set(true);
    this.scrollToBottom();

    try {
      // Intentamos llamar a Groq
      const response = await this.aiService.preguntar(query);
      
      // Si llegamos aquí, la conexión fue exitosa
      this.apiStatus.set('online');
      this.messages.update((m) => [
        ...m,
        { role: "assistant", content: response },
      ]);
    } catch (err) {
      // 🔥 Si hay un error, cambiamos el estado a offline
      this.apiStatus.set('offline');
      this.messages.update((m) => [
        ...m,
        {
          role: "assistant",
          content: "Lo siento, mi conexión falló. Verifica tu conexión o API Key e intenta de nuevo.",
        },
      ]);
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}