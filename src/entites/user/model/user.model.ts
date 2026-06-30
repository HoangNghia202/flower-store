export class UserVM {
    id: string;
    name: string;
    email: string;
    avatar: string;

    constructor(init: Partial<UserVM>) {
        Object.assign(this, init);
    }
}

// Plain object type for serialization across server-client boundary
export type User = {
    id: string;
    name: string;
    email: string;
    avatar: string;
};

