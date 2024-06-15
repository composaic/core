export interface MyCoolExtensionType {
    saySomethingCool(): void;
}

export class SimpleCoolExtensionProvider implements MyCoolExtensionType {
    saySomethingCool(): void {
        console.log('Saying something cool - well, default cool that is');
    }
}
