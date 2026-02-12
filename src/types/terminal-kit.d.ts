import 'terminal-kit';

declare module 'terminal-kit' {
  export interface TextBufferCell {
    char: string;
    attr: number;
    [key: string]: any;
  }

  export interface TextBuffer {
    buffer: TextBufferCell[][];
    setText(text: string, hasMarkup?: string | boolean): void;
    draw(options?: { y?: number; srcClipRect?: { x: number; y: number; width: number; height: number } }): void;
  }

  export namespace TextBuffer {
    interface Options {
      lineWrapWidth?: number;
    }
  }

  export namespace Terminal {
    interface Impl {
      alternateScreenBuffer(enable: boolean): void;
    }
  }
}
