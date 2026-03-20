// tests/_shared/mobile.d.ts
import '@wdio/types';

declare module '@wdio/types' {
    interface Browser {
        getContexts(): Promise<string[]>;
        switchContext(name: string): Promise<void>;
        getContext?(): Promise<string>;
    }
}

export {};