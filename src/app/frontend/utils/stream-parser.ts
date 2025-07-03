/* eslint-disable @typescript-eslint/no-explicit-any */

import { parseDataStreamPart } from 'ai';

export interface StreamUpdate {
  type: 'text-delta' | 'reasoning-delta' | 'error' | 'finish' | 'tool-call' | 'tool-result' | 'source' | 'file' | 'generated-image-stream' | 'generated-image-loading';
  textDelta?: string;
  error?: string;
  toolCall?: any;
  toolResult?: any;
  source?: any;
  file?: any;
  image?: any;
  generatedImage?: { base64: string; fileKey: string; alt: string; toolCallId?: string }; // Include alt text and toolCallId
  loadingImage?: { fileKey: string; alt: string; isLoading: boolean; toolCallId?: string }; // For loading state
}

export class StreamParser {
  private textContent = '';
  private reasoningContent = '';

  async parseStreamResponse(
    response: Response,
    onUpdate: (update: StreamUpdate) => void,
    abortController?: AbortController
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        // Check if the request was aborted
        if (abortController?.signal.aborted) {
          reader.cancel();
          throw new DOMException('Operation was aborted', 'AbortError');
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Check abort signal before processing each line
          if (abortController?.signal.aborted) {
            reader.cancel();
            throw new DOMException('Operation was aborted', 'AbortError');
          }

          try {
            // Handle Server-Sent Events format
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              this.handleDataUpdate(data, onUpdate);
            }
            // Handle AI SDK data stream format
            else if (line.includes(':')) {
              const parsed = parseDataStreamPart(line);
              this.handleAISDKUpdate(parsed, onUpdate);
            }
          } catch (error) {
            console.warn('Failed to parse stream line:', line, error);
            // Continue processing other lines instead of failing completely
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim() && !abortController?.signal.aborted) {
        try {
          if (buffer.startsWith('data: ')) {
            const data = JSON.parse(buffer.slice(6));
            this.handleDataUpdate(data, onUpdate);
          } else if (buffer.includes(':')) {
            const parsed = parseDataStreamPart(buffer);
            this.handleAISDKUpdate(parsed, onUpdate);
          }
        } catch (error) {
          console.warn('Failed to parse final buffer:', buffer, error);
        }
      }

      if (!abortController?.signal.aborted) {
        onUpdate({ type: 'finish' });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Stream parsing was cancelled');
        throw error;
      }
      onUpdate({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private handleDataUpdate(data: any, onUpdate: (update: StreamUpdate) => void) {
    if (data.type === 'text-delta' && data.textDelta) {
      this.textContent += data.textDelta;
      onUpdate({ type: 'text-delta', textDelta: data.textDelta });
    } else if (data.type === 'reasoning-delta' && data.textDelta) {
      this.reasoningContent += data.textDelta;
      onUpdate({ type: 'reasoning-delta', textDelta: data.textDelta });
    } else if (data.type === 'generated-image-stream' && data.content) {
      try {
        const imageData = JSON.parse(data.content);
        onUpdate({ 
          type: 'generated-image-stream', 
          generatedImage: {
            base64: imageData.base64,
            fileKey: imageData.fileKey,
            alt: imageData.alt,
            toolCallId: imageData.toolCallId
          }
        });
      } catch (error) {
        console.error('Failed to parse generated image data:', error);
      }
    } else if (data.type === 'generated-image-loading' && data.content) {
      try {
        const loadingData = JSON.parse(data.content);
        onUpdate({
          type: 'generated-image-loading',
          loadingImage: {
            fileKey: loadingData.fileKey,
            alt: loadingData.alt,
            isLoading: loadingData.isLoading,
            toolCallId: loadingData.toolCallId
          }
        });
      } catch (error) {
        console.error('Failed to parse loading image data:', error);
      }
    }
  }

  private handleAISDKUpdate(parsed: any, onUpdate: (update: StreamUpdate) => void) {
    switch (parsed.type) {
      case 'text':
        this.textContent += parsed.value;
        onUpdate({ type: 'text-delta', textDelta: parsed.value });
        break;
      case 'reasoning':
        this.reasoningContent += parsed.value;
        onUpdate({ type: 'reasoning-delta', textDelta: parsed.value });
        break;
      case 'data':
        // Handle data array format
        if (Array.isArray(parsed.value)) {
          for (const item of parsed.value) {
            if (item.type === 'text-delta') {
              this.textContent += item.textDelta || '';
              onUpdate({ type: 'text-delta', textDelta: item.textDelta || '' });
            } else if (item.type === 'reasoning-delta') {
              this.reasoningContent += item.textDelta || '';
              onUpdate({ type: 'reasoning-delta', textDelta: item.textDelta || '' });
            }
          }
        }
        break;
      case 'error':
        onUpdate({ type: 'error', error: parsed.value });
        break;
      case 'tool_call':
        onUpdate({ type: 'tool-call', toolCall: parsed.value });
        break;
      case 'tool_call_delta':
        // Handle tool call deltas for progressive prompt building
        console.log('tool call delta', parsed.value);
        break;
      case 'tool_result':
        onUpdate({ type: 'tool-result', toolResult: parsed.value });
        break;
      case 'source':
        onUpdate({ type: 'source', source: parsed.value });
        break;
      default:
        break;
    }
  }

  getContent() {
    return {
      text: this.textContent,
      reasoning: this.reasoningContent,
    };
  }

  reset() {
    this.textContent = '';
    this.reasoningContent = '';
  }
} 