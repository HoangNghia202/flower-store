export class UserVM {
    id: string;
    name: string;
    email: string;
    avatar: string;

    constructor(init: Partial<UserVM>) {
        Object.assign(this, init);
    }
}
