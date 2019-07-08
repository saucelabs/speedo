export default jest.fn().mockImplementation((options, cb) => {
    setTimeout(() => cb(null, options), 100)
})
