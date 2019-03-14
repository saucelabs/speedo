import { TEST_WITH_BASELINE, TEST_DETAIL } from '../__fixtures__/jobs'

const fixtures = {
    listJobsResult: TEST_WITH_BASELINE,
    getJob: TEST_DETAIL
}

let lastInstance
export default class SauceLabsMock {
    constructor (...args) {
        this.args = args
        this.listJobs = jest.fn().mockImplementation(() => fixtures.listJobsResult)
        this.getJob = jest.fn().mockImplementation(() => fixtures.getJob)
        this.downloadJobAsset = jest.fn()
        this.downloadJobAsset = jest.fn()
        this.updateJob = jest.fn()
        lastInstance = this
    }
}

export { lastInstance, fixtures }
