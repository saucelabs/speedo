const driverMock = {
    sessionId: 'foobarSession',
    url: jest.fn(),
    assertPerformance: jest.fn().mockReturnValue(Promise.resolve({
        value: {
            metrics: {
                timeToFirstByte: 123,
                load: 321,
                speedIndex: 10,
                pageWeight: 1000
            }
        }
    })),
    deleteSession: jest.fn()
}

export const remote = jest.fn().mockReturnValue(Promise.resolve(driverMock))
