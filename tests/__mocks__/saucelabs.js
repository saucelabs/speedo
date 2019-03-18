import { PERFORMANCE_METRICS } from '../__fixtures__/performance'
import { TEST_WITH_BASELINE, TEST_DETAIL } from '../__fixtures__/jobs'

const defaultFixtures = {
    listJobsResult: TEST_WITH_BASELINE,
    getJob: TEST_DETAIL,
    getPerformanceMetrics: PERFORMANCE_METRICS,
    updateJob: {}
}
const fixtures = Object.assign({}, defaultFixtures)
const resetSauceLabsFixtures = () => {
    fixtures.listJobsResult = defaultFixtures.listJobsResult
    fixtures.getJob = defaultFixtures.getJob
    fixtures.getPerformanceMetrics = defaultFixtures.getPerformanceMetrics
    fixtures.updateJob = defaultFixtures.updateJob
}

let lastInstance
export default class SauceLabsMock {
    constructor (...args) {
        this.args = args
        this.listJobs = jest.fn().mockImplementation(() => fixtures.listJobsResult)
        this.getJob = jest.fn().mockImplementation(() => fixtures.getJob)
        this.downloadJobAsset = jest.fn()
        this.updateJob = jest.fn().mockImplementation(() => fixtures.updateJob)
        this.getPerformanceMetrics = jest.fn().mockImplementation(() => fixtures.getPerformanceMetrics)
        lastInstance = this
    }
}

export { lastInstance, fixtures, resetSauceLabsFixtures }
