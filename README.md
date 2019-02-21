Speedo
======

Sauce Labs provides a [Frontend Performance Testing](https://wiki.saucelabs.com/display/DOCS/Getting+Started+with+Front+End+Performance+Testing) offering that allows you to check for crucial performance regression on your website. `Speedo` is a simple to use CLI tool that allows you to integrate this into your CI/CD pipeline. All you need to do is download and run it.

> Note: This feature is currently in beta and available for Enterprise plans only. For more information about other benefits that are included with Enterprise plans, [check out our Pricing page](https://saucelabs.com/pricing).

## Download

To download the tool you have to have Node.js installed on your machine. After you have installed it, run:

```sh
$ npm install -g speedo
```

## Run Tests

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

## Usage

If you call `speedo -h` you find the following help menu:

```
Speedo CLI runner

Usage: speedo run [options]

Commands:
  speedo.js run [params...] <site>  Run performance tests on website

Options:
  --version        Show version number                                 [boolean]
  --help, -h       prints speedo help menu                             [boolean]
  --user, -u       your Sauce Labs username
  --key, -k        your Sauce Labs user key
  --name, -n       name of your performance test
  --site, -s       url of webpage you want to test
  --logDir, -l     directory to store logs from testrun
  --traceLogs, -t  if set runner downloads tracing logs for further
                   investigations
```

***

<p align="center">Copyright 2019 © Sauce Labs</p>

***
