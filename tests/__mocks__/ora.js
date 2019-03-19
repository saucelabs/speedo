let oraMock = {}
oraMock.start = jest.fn().mockReturnValue(oraMock)
oraMock.succeed = jest.fn()
oraMock.fail = jest.fn()
oraMock.warn = jest.fn()
oraMock.stopAndPersist = jest.fn()

const oraMockConstructor = jest.fn().mockReturnValue(oraMock)
oraMock.constructor = oraMockConstructor
export default oraMockConstructor
