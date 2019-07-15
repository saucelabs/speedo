import { PERFORMANCE_METRICS_PASSING, BASELINE_HISTORY } from '../__fixtures__/performance'
import { TEST_WITH_BASELINE, TEST_DETAIL, JOB_ASSET } from '../__fixtures__/jobs'
import { TUNNELS, TUNNEL } from '../__fixtures__/tunnels'
import { BUILDS, BUILD_JOBS } from '../__fixtures__/builds.js'

const defaultFixtures = {
    listJobs: TEST_WITH_BASELINE,
    listBuilds: BUILDS,
    listBuildJobs: BUILD_JOBS,
    getJob: TEST_DETAIL,
    downloadJobAsset: JOB_ASSET,
    getPerformanceMetrics: PERFORMANCE_METRICS_PASSING,
    getBaselineHistory: BASELINE_HISTORY,
    listTunnels: TUNNELS,
    getTunnel: TUNNEL,
    updateJob: {}
}
const fixtures = Object.assign({}, defaultFixtures)
const resetSauceLabsFixtures = () => {
    fixtures.listJobs = defaultFixtures.listJobs
    fixtures.listBuilds = defaultFixtures.listBuilds
    fixtures.listBuildJobs = defaultFixtures.listBuildJobs
    fixtures.getJob = defaultFixtures.getJob
    fixtures.downloadJobAsset = defaultFixtures.downloadJobAsset
    fixtures.getPerformanceMetrics = defaultFixtures.getPerformanceMetrics
    fixtures.getBaselineHistory = defaultFixtures.getBaselineHistory
    fixtures.listTunnels = defaultFixtures.listTunnels
    fixtures.getTunnel = defaultFixtures.getTunnel
    fixtures.updateJob = defaultFixtures.updateJob
}

let lastInstance
export default class SauceLabsMock {
    constructor (...args) {
        this.args = args
        this.username = args.length ? args[0].username : undefined
        this.listJobs = jest.fn().mockImplementation(() => fixtures.listJobs)
        this.listBuilds = jest.fn().mockImplementation(() => fixtures.listBuilds)
        this.listBuildJobs = jest.fn().mockImplementation(() => fixtures.listBuildJobs)
        this.getJob = jest.fn().mockImplementation(() => fixtures.getJob)
        this.downloadJobAsset = jest.fn().mockImplementation(() => fixtures.downloadJobAsset)
        this.updateJob = jest.fn().mockImplementation(() => fixtures.updateJob)
        this.getPerformanceMetrics = jest.fn().mockImplementation(() => fixtures.getPerformanceMetrics)
        this.getBaselineHistory = jest.fn().mockImplementation(() => fixtures.getBaselineHistory)
        this.listTunnels = jest.fn().mockImplementation(() => fixtures.listTunnels)
        this.getTunnel = jest.fn().mockImplementation(() => fixtures.getTunnel)
        lastInstance = this
    }
}

export { lastInstance, fixtures, resetSauceLabsFixtures }
