Contributing
============

We love pull requests. Here's a quick guide:

1. Fork the repo.
2. Run the tests. We only take pull requests with passing tests, and it's great to know that you have a clean state.
3. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or fixing a bug, we need a test!
4. Make the test pass.
5. Push to your fork and submit a pull request.

## Run Tests

Speedo uses the [Jest](https://jestjs.io/) testrunner to run its unit tests. In order to run them call:

```sh
$ npm test
```

If you want to check your test coverage and see which lines are not yet covered, just use a simple static server to serve the coverage report:

```sh
$ npm i -g http-server
$ cd coverage/lcov-report/
$ http-server -p 8080
```

You can find the coverage report when opening [localhost:8080](http://localhost:8080) in the browser.

## Release Package

Ensure you have publish rights for the [NPM package](https://www.npmjs.com/package/speedo). Then, pull the latest commits from the `master` branch and run the release script:

```sh
$ npm run release # patch release
# $ npm run release:minor # minor release
# $ npm run release:major # major release
```

The Docker image is released as part of the CI/CD process.
