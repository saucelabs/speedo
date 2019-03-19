<p align="center">
    <img src="./docs/saucebot.png" alt="Speedo Saucebot" />
</p>

Speedo [![Build Status](https://travis-ci.com/saucelabs/speedo.svg?token=px5tFzamGvYgujeyYVEp&branch=master)](https://travis-ci.com/saucelabs/speedo)
======

Sauce Labs provides a [Frontend Performance Testing](https://wiki.saucelabs.com/display/DOCS/Getting+Started+with+Front+End+Performance+Testing) offering that allows you to check for crucial performance regression on your website. `Speedo` is a simple to use CLI tool that allows you to integrate this into your CI/CD pipeline. All you need to do is download and run it.

> Note: This feature is currently in beta and available for Enterprise plans only. For more information about other benefits that are included with Enterprise plans, [check out our Pricing page](https://saucelabs.com/pricing).

## Download

To download the tool you have to have Node.js installed on your machine. After you have installed it, run:

```sh
$ npm install -g speedo
```

## Usage

If you call `speedo -h` you find the following help menu:

```
Speedo CLI runner

Commands:
  speedo analyze [params...] <build>  Analyze results of prerun performance
                                      tests.
  speedo run [params...] <site>       Run performance tests on any website.

Options:
  --version        Show version number                                 [boolean]
  --help, -h       prints speedo help menu                             [boolean]
  --user, -u       your Sauce Labs username
  --key, -k        your Sauce Labs user key
  --region, -r     your Sauce Labs datacenter region, the following regions are
                   available: `us-west-1` (short `us`), `eu-central-1` (short
                   `eu`)                                         [default: "us"]
  --logDir, -l     directory to store logs from testrun
  --traceLogs, -t  if set runner downloads tracing logs for further
                   investigations
```

### Run Tests

After you have installed the tool, run it via

```sh
speedo run https://google.com -u <your-username> -k <your-access-key>
```

If you export `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` into your environment you don't need to pass in the user and key as parameter:

```sh
export SAUCE_USERNAME=<your-username>
export SAUCE_ACCESS_KEY=<your-access-key>
speedo run https://google.com
```

You can customize your performance tests by appliying a job and build name or restricting the assertion to specific metrics only. For more information on parameters run `$ speedo run --help`.

```sh
# give performance test a build and job name and restrict metrics
speedo run https://google.com -n my-performance-test -b $BUILD_ID -m speedIndex -m timeToFirstInteractive -m firstPaint
# or retry performance test at least 3 times in case it fails
speedo run https://google.com --retry 3
```

Speedo allow you to assert on the following performance metrics:

- timeToFirstByte
- firstPaint
- firstContentfulPaint
- firstMeaningfulPaint
- domContentLoaded
- timeToFirstInteractive
- load
- speedIndex
- perceptualSpeedIndex
- pageWeight
- pageWeightEncoded

### Analyze Tests

Speedo provides also a way to analyze the performance of page loads of a previous run test. This allows you to run a beforehand that includes different automation steps to arrive to a desired page (e.g. you want to test the performance of a page that is behind a login). __Please Note:__ do __not__ analyze the performance of all your previous run functional tests! You always should keep functional and performance tests separated.

Let's say we want to test the performance of the page behind the login form of [this example](https://the-internet.herokuapp.com/login). The first step is to create a simple automation script that uses Sauce Labs to log into the page. You can use any framework you like, it doesn't affect the performance results whatsoever. In this example we use [WebdriverIO](https://webdriver.io/):

```js
// /test/performance/login.perf.test.js
const { remote } = require('webdriverio');

(async () => {
    const client = await remote({
        user: process.env.SAUCE_USERNAME,
        key: process.env.SAUCE_ACCESS_KEY,
        capabilities: {
            browserName: 'chrome',
            platform: 'macOS 10.13',
            version: 'latest',
            extendedDebugging: true,
            name: 'my login performance test',
            build: process.env.BUILD_ID
        }
    })

    await client.url('https://the-internet.herokuapp.com/login')

    const username = await client.$('#username')
    await username.setValue('tomsmith')

    const password = await client.$('#password')
    await username.setValue('SuperSecretPassword!')

    const submit = await client.$('button[type="submit"]')
    await submit.click()

    await client.deleteSession())
})().catch(console.error)
```

Ensure that you define a unique name for your performance test so we can maintain a stable baseline for it. Within your CI/CD you can now call the script and analyze the performance of the second opened page. To ensure that our platform can calculcate the data we add a 5 second pause in between running the test and analyzing it:

```sh
node /test/performance/login.perf.test.js && sleep 5 && speedo analyze $BUILD_ID --orderIndex 1
```

The command requires to pass in the build that the performance test was running in. With the `orderIndex` parameter you define which page load needs to be analyzed. If you don't pass it in it will analyze all page loads which can make your test more flaky. Similar as to `run` you can apply more parameter to this command. See a list with all of them by calling `$ speedo analyze --help`.

## Docker Integration

If you run your CI/CD pipeline based on Docker (e.g. [Jenkins Pipelines](https://jenkins.io/doc/book/pipeline/docker/)) you can also use Speedo as a Docker container. Just define the container name and have the speedo command available in the stage, e.g.:

```
pipeline {
    agent none
    stages {
        stage('Linting') {
            ...
        }
        stage('Unit Tests') {
            ...
        }
        stage('Functional Tests') {
            ...
        }
        stage('Performance Tests') {
            agent {
                docker { image 'saucelabs:speedo' }
            }
            steps {
                sh 'speedo run https://google.com -u ${SAUCE_USERNAME} -k ${SAUCE_ACCESS_KEY} -b ${BUILD_NUMBER}'
            }
        }
    }
}
```

Or when using GitLab CI/CD pipelines:

```yaml
variables:
  SPEEDO_IMAGE: saucelabs/speedo

stages:
  - lint
  - test
  - performance
  - deploy

# ...

# run performance tests
performance:
  stage: performance
  image: $SPEEDO_IMAGE
  script:
    - speedo run https://google.com -u $SAUCE_USERNAME -k $SAUCE_ACCESS_KEY -b $BUILD_NUMBER

# ...
```

***

<p align="center">Copyright 2019 © Sauce Labs</p>

***
