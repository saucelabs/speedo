const assertPerformanceResult = {
    value: {
        metrics: {
            load: 321,
            speedIndex: 10,
            pageWeight: 1000
        }
    }
}

const driverMock = {
    sessionId: 'foobarSession',
    url: jest.fn(),
    throttleNetwork: jest.fn(),
    execute: jest.fn(),
    assertPerformance: jest.fn().mockReturnValue(Promise.resolve(assertPerformanceResult)),
    deleteSession: jest.fn()
}

export const remote = jest.fn().mockImplementation(
    (options = {}) => Object.assign(
        {},
        driverMock,
        /**
         * with this you can use the user property to overwrite
         * the driver mock
         */
        typeof options.user === 'object' ? options.user : {}
    )
)
