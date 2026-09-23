export const mockPrisma = {
    service: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    stylist: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    stylistService: {
        findUnique: jest.fn(),
    },
    client: {
        upsert: jest.fn(),
    },
    booking: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    business: {
        findFirst: jest.fn(),
    },
    availabilityException: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    weeklyAvailability: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

type MockModel = Record<string, jest.Mock>;

export const resetMockPrisma = () => {
    Object.values(mockPrisma).forEach(model => {
        Object.values(model as MockModel).forEach(fn => fn.mockReset());
    });
};

class MockPrismaClientKnownRequestError extends Error {
    code: string;
    meta?: unknown;

    constructor(
        message: string,
        options: { code: string; meta?: unknown },
    ) {
        super(message);
        this.name = 'PrismaClientKnownRequestError';
        this.code = options.code;
        this.meta = options.meta;
        Object.setPrototypeOf(this, MockPrismaClientKnownRequestError.prototype);
    }
}

export const mockPrismaNamespace = {
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
};
