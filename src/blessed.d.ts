import 'reblessed';

declare module 'reblessed' {
  namespace Widgets {
    interface Log {
      setContent(text: string, noClear?: boolean, noTags?: boolean): void;
    }
  }
}
